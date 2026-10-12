/**
 * Database access: the Drizzle client, migrations, and every table.
 * Tables live here rather than in their features because drizzle-kit loads them (under Node,
 * without bun:sqlite) to generate the single migration history for the app.
 */
export { db } from "./client";
export { runMigrations } from "./migrate";
export * from "./schema";
