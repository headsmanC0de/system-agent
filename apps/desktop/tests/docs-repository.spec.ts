import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "@playwright/test";
import { DocsRepository } from "../src/main/docs-repository";

function freshPath(): { dir: string; path: string } {
  const dir = mkdtempSync(join(tmpdir(), "system-agent-docs-"));
  return { dir, path: join(dir, "docs.sqlite") };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory()
      ? sourceFiles(path)
      : entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
        ? [path]
        : [];
  });
}

test("repository modules are the only SQLite and raw SQL boundary", () => {
  const sourceRoot = join(import.meta.dirname, "..", "src");
  const violations = sourceFiles(sourceRoot)
    .filter((path) => !path.endsWith("-repository.ts"))
    .filter((path) => {
      const source = readFileSync(path, "utf8");
      return (
        source.includes('from "node:sqlite"') || /\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|PRAGMA)\b/.test(source)
      );
    });
  expect(violations).toEqual([]);
});

test("creates a hardened current schema and persists CRUD across reopen", () => {
  const { dir, path } = freshPath();
  try {
    let repository = new DocsRepository(path);
    const health = repository.health();
    expect(health.schemaVersion).toBe(1);
    expect(health.integrity).toBe("ok");
    expect(health.journalMode).toBe("wal");
    expect(health.sqliteVersion).toMatch(/^3\./);
    expect(statSync(path).mode & 0o777).toBe(0o600);

    const created = repository.create({
      title: "  WAL notes  ",
      content: "100% literal_query",
      category: "SQLite",
      tags: ["database", "database", "wal"],
    });
    expect(created.title).toBe("WAL notes");
    expect(created.tags).toEqual(["database", "wal"]);
    expect(repository.list({ search: "%" })).toHaveLength(1);
    expect(repository.list({ search: "literal_" })).toHaveLength(1);

    repository.close();
    repository = new DocsRepository(path);
    const updated = repository.update(created.id, { content: "durable", category: "Architecture" });
    expect(updated.content).toBe("durable");
    expect(repository.categories()).toEqual(["Architecture"]);
    expect(repository.list({ category: "SQLite" })).toEqual([]);
    repository.delete(created.id);
    expect(repository.list()).toEqual([]);
    repository.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rejects invalid input, unsafe identifiers, and unbounded requests", () => {
  const { dir, path } = freshPath();
  try {
    const repository = new DocsRepository(path);
    expect(() => repository.create({ title: "", content: "x", category: "test", tags: [] })).toThrow(
      "title must not be empty",
    );
    expect(() =>
      repository.create({ title: "x", content: "x".repeat(256 * 1024 + 1), category: "test", tags: [] }),
    ).toThrow("content exceeds");
    expect(() => repository.list({ limit: 101 })).toThrow("limit must be an integer");
    expect(() => repository.get("../../etc/passwd")).toThrow("id must be a UUID");
    expect(() => repository.delete(crypto.randomUUID())).toThrow("Document not found");
    repository.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fails closed for legacy schemas and corrupted databases", () => {
  const legacy = freshPath();
  const corrupt = freshPath();
  try {
    const db = new DatabaseSync(legacy.path);
    db.exec("CREATE TABLE docs (id TEXT); PRAGMA user_version = 0");
    db.close();
    expect(() => new DocsRepository(legacy.path)).toThrow("Unsupported existing docs database schema 0");

    writeFileSync(corrupt.path, "not a sqlite database");
    chmodSync(corrupt.path, 0o600);
    expect(() => new DocsRepository(corrupt.path)).toThrow();
    expect(readFileSync(corrupt.path, "utf8")).toBe("not a sqlite database");
  } finally {
    rmSync(legacy.dir, { recursive: true, force: true });
    rmSync(corrupt.dir, { recursive: true, force: true });
  }
});

test("a concurrent writer lock fails explicitly without partial persistence", () => {
  const { dir, path } = freshPath();
  const repository = new DocsRepository(path, { timeoutMs: 25 });
  const lock = new DatabaseSync(path);
  try {
    lock.exec("BEGIN IMMEDIATE");
    expect(() =>
      repository.create({ title: "blocked", content: "must not commit", category: "SQLite", tags: [] }),
    ).toThrow();
    lock.exec("ROLLBACK");
    expect(repository.list()).toEqual([]);
  } finally {
    if (lock.isOpen) lock.close();
    repository.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
