# Persistence Layer

## Database Choice

- SQLite is the selected local database.
- It provides a single local file, ACID transactions, strong relational support, and high query speed for desktop apps.
- It is ideal for the anti-cheat domain model because it handles joins, constraints, and indexes efficiently.

## Schema Files

- `src/schema.sql` contains the full database DDL.
- `src/persistence.ts` contains the database initialization, migration, and export code.

## Migration Strategy

- The app uses `PRAGMA user_version` and a `schema_migrations` table.
- On startup `initializeDatabase()` opens the SQLite file and runs `migrateDatabase()`.
- If the database version is `0`, it creates the initial schema and sets `user_version` to the current version.
- For upgrades, it applies sequential migration functions inside a transaction.
- Data is preserved during migration by adding columns where possible or copying data into shadow tables for complex refactors.

## Export Logic

- `exportDatabase()` reads every domain table and returns a JSON object with `meta` metadata.
- `exportDatabaseToFile()` writes the normalized payload to disk as `JSON`.
- Exported structure includes `users`, `xp_profiles`, `streak_states`, `tasks`, `completion_records`, `diary_entries`, `achievements`, and `unlockable_features`.

## Notes

- Timestamps are stored as ISO 8601 strings in UTC.
- Boolean flags are stored as `INTEGER` 0/1.
- Enum constraints are stored as `TEXT` with `CHECK` constraints.
- Foreign keys use `ON DELETE CASCADE` so user-scoped data is removed consistently.
