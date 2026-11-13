import type { Database } from "./sql.js";
import { migrations } from "./migrations.js";

const schemaMigrations = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
`;

export async function applyMigrations(database: Database): Promise<void> {
  await database.exec(schemaMigrations);

  for (const migration of migrations) {
    const existing = await database.query<{ id: string }>(
      "SELECT id FROM schema_migrations WHERE id = $1",
      [migration.id],
    );
    if (existing.rows.length > 0) {
      continue;
    }

    await database.transaction(async (sql) => {
      await sql.exec(migration.sql);
      await sql.query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)", [
        migration.id,
        new Date().toISOString(),
      ]);
    });
  }
}
