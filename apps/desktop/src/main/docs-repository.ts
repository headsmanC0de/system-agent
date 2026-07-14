import { chmodSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CreateDocInput, DocEntry, DocsDatabaseHealth, DocsListOptions, UpdateDocInput } from "@project/types";

const APPLICATION_ID = 0x53414754;
const SCHEMA_VERSION = 1;
const MAX_TITLE_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 100;
// The store is synchronous by design (node:sqlite in Electron's main process), so
// bound both a row and a page to keep a malformed import from blocking every IPC.
const MAX_CONTENT_LENGTH = 256 * 1024;
const MAX_TAGS = 32;
const MAX_TAG_LENGTH = 64;
const MAX_SEARCH_LENGTH = 500;
const MAX_PAGE_SIZE = 100;
const DEFAULT_BUSY_TIMEOUT_MS = 5000;

type DocRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string;
  created_at: number;
  updated_at: number;
};

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) throw new RangeError(`${field} must not be empty`);
  if (normalized.length > maxLength) throw new RangeError(`${field} exceeds ${maxLength} characters`);
  return normalized;
}

function contentText(value: unknown): string {
  if (typeof value !== "string") throw new TypeError("content must be a string");
  if (value.length > MAX_CONTENT_LENGTH) throw new RangeError(`content exceeds ${MAX_CONTENT_LENGTH} characters`);
  return value;
}

function normalizedTags(value: unknown): string[] {
  if (!Array.isArray(value)) throw new TypeError("tags must be an array");
  if (value.length > MAX_TAGS) throw new RangeError(`tags exceeds ${MAX_TAGS} entries`);
  const tags = value.map((tag) => requiredText(tag, "tag", MAX_TAG_LENGTH));
  return [...new Set(tags)];
}

function validId(id: unknown): string {
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new TypeError("id must be a UUID");
  }
  return id;
}

function asInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new RangeError(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function fromRow(row: Record<string, unknown> | undefined): DocEntry {
  if (!row) throw new Error("Document not found");
  const value = row as DocRow;
  const tags = JSON.parse(value.tags);
  if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) {
    throw new Error(`Document ${value.id} contains invalid tags`);
  }
  return {
    id: value.id,
    title: value.title,
    content: value.content,
    category: value.category,
    tags,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

/** The only production boundary allowed to open or query the docs SQLite file. */
export class DocsRepository {
  readonly #db: DatabaseSync;
  readonly #path: string;

  constructor(path: string, options: { timeoutMs?: number } = {}) {
    this.#path = path;
    const existed = existsSync(path);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.#db = new DatabaseSync(path, {
      allowExtension: false,
      defensive: true,
      enableDoubleQuotedStringLiterals: false,
      enableForeignKeyConstraints: true,
      timeout: options.timeoutMs ?? DEFAULT_BUSY_TIMEOUT_MS,
    });
    try {
      this.#configure(existed);
      chmodSync(path, 0o600);
    } catch (error) {
      this.#db.close();
      throw error;
    }
  }

  #configure(existed: boolean): void {
    this.#db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
      PRAGMA trusted_schema = OFF;
      PRAGMA secure_delete = ON;
    `);

    const version = Number(this.#db.prepare("PRAGMA user_version").get()?.user_version ?? 0);
    const tables = this.#db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all();

    if (version === 0 && tables.length === 0) {
      this.#db.exec("BEGIN IMMEDIATE");
      try {
        this.#db.exec(`
          CREATE TABLE docs (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND ${MAX_TITLE_LENGTH}),
            content TEXT NOT NULL CHECK(length(content) <= ${MAX_CONTENT_LENGTH}),
            category TEXT NOT NULL CHECK(length(trim(category)) BETWEEN 1 AND ${MAX_CATEGORY_LENGTH}),
            tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags) AND json_type(tags) = 'array'),
            created_at INTEGER NOT NULL CHECK(created_at > 0),
            updated_at INTEGER NOT NULL CHECK(updated_at >= created_at)
          ) STRICT;
          CREATE INDEX docs_updated_at_idx ON docs(updated_at DESC);
          CREATE INDEX docs_category_updated_idx ON docs(category, updated_at DESC);
          PRAGMA application_id = ${APPLICATION_ID};
          PRAGMA user_version = ${SCHEMA_VERSION};
        `);
        this.#db.exec("COMMIT");
      } catch (error) {
        this.#db.exec("ROLLBACK");
        throw error;
      }
    } else if (version !== SCHEMA_VERSION) {
      const state = existed ? "existing" : "new";
      throw new Error(`Unsupported ${state} docs database schema ${version}; expected ${SCHEMA_VERSION}`);
    }

    const applicationId = Number(this.#db.prepare("PRAGMA application_id").get()?.application_id ?? 0);
    if (applicationId !== APPLICATION_ID) {
      throw new Error(`Unexpected docs database application_id ${applicationId}`);
    }
    const integrity = String(this.#db.prepare("PRAGMA quick_check").get()?.quick_check ?? "unknown");
    if (integrity !== "ok") throw new Error(`Docs database integrity check failed: ${integrity}`);
  }

  health(): DocsDatabaseHealth {
    const version = this.#db.prepare("SELECT sqlite_version() AS version").get();
    return {
      applicationId: Number(this.#db.prepare("PRAGMA application_id").get()?.application_id),
      integrity: "ok",
      journalMode: String(this.#db.prepare("PRAGMA journal_mode").get()?.journal_mode),
      path: this.#path,
      schemaVersion: Number(this.#db.prepare("PRAGMA user_version").get()?.user_version),
      sqliteVersion: String(version?.version),
    };
  }

  list(options: DocsListOptions = {}): DocEntry[] {
    const limit = options.limit === undefined ? 50 : asInteger(options.limit, "limit", 1, MAX_PAGE_SIZE);
    const offset = options.offset === undefined ? 0 : asInteger(options.offset, "offset", 0, Number.MAX_SAFE_INTEGER);
    const conditions: string[] = [];
    const params: Array<string | number> = [];
    if (options.category !== undefined) {
      conditions.push("category = ?");
      params.push(requiredText(options.category, "category", MAX_CATEGORY_LENGTH));
    }
    if (options.search !== undefined) {
      const search = requiredText(options.search, "search", MAX_SEARCH_LENGTH);
      conditions.push(
        "(instr(lower(title), lower(?)) > 0 OR instr(lower(content), lower(?)) > 0 OR EXISTS (SELECT 1 FROM json_each(docs.tags) WHERE instr(lower(CAST(value AS TEXT)), lower(?)) > 0))",
      );
      params.push(search, search, search);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.#db
      .prepare(
        `SELECT id, title, content, category, tags, created_at, updated_at
         FROM docs ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);
    return rows.map(fromRow);
  }

  categories(): string[] {
    return this.#db
      .prepare("SELECT DISTINCT category FROM docs ORDER BY category")
      .all()
      .map((row) => String(row.category));
  }

  create(input: CreateDocInput): DocEntry {
    const id = crypto.randomUUID();
    const now = Date.now();
    const title = requiredText(input.title, "title", MAX_TITLE_LENGTH);
    const content = contentText(input.content);
    const category = requiredText(input.category, "category", MAX_CATEGORY_LENGTH);
    const tags = JSON.stringify(normalizedTags(input.tags));
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      this.#db
        .prepare(
          "INSERT INTO docs (id, title, content, category, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(id, title, content, category, tags, now, now);
      this.#db.exec("COMMIT");
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
    return this.get(id);
  }

  get(id: string): DocEntry {
    const row = this.#db
      .prepare("SELECT id, title, content, category, tags, created_at, updated_at FROM docs WHERE id = ?")
      .get(validId(id));
    return fromRow(row);
  }

  update(id: string, input: UpdateDocInput): DocEntry {
    const current = this.get(id);
    const title = input.title === undefined ? current.title : requiredText(input.title, "title", MAX_TITLE_LENGTH);
    const content = input.content === undefined ? current.content : contentText(input.content);
    const category =
      input.category === undefined ? current.category : requiredText(input.category, "category", MAX_CATEGORY_LENGTH);
    const tags = JSON.stringify(input.tags === undefined ? current.tags : normalizedTags(input.tags));
    const updatedAt = Math.max(Date.now(), current.createdAt);
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.#db
        .prepare("UPDATE docs SET title = ?, content = ?, category = ?, tags = ?, updated_at = ? WHERE id = ?")
        .run(title, content, category, tags, updatedAt, current.id);
      if (Number(result.changes) !== 1) throw new Error(`Document ${current.id} was not updated`);
      this.#db.exec("COMMIT");
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
    return this.get(current.id);
  }

  delete(id: string): void {
    const result = this.#db.prepare("DELETE FROM docs WHERE id = ?").run(validId(id));
    if (Number(result.changes) !== 1) throw new Error("Document not found");
  }

  close(): void {
    if (!this.#db.isOpen) return;
    this.#db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    this.#db.close();
  }
}
