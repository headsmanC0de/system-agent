# Persistence boundary

System Agent uses a repository layer as the only persistence boundary. Production code outside
`apps/desktop/src/main/*-repository.ts` must not import `node:sqlite`, open database files, or contain
raw SQL.

The repository owns the schema, prepared statements, transactions, validation, durability settings,
and mapping between database rows and shared domain types. Electron IPC depends only on typed
repository methods; the renderer never knows which storage engine is used.

This keeps SQL in one place, makes persistence replaceable, and allows deterministic tests without
launching the UI. `tests/docs-repository.spec.ts` verifies CRUD durability, input bounds, literal
search, file permissions, schema mismatch, corruption handling, and the rule that SQLite/SQL cannot
leak outside repository modules.
