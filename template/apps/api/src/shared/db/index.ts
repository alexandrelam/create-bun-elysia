/**
 * Database access: the Drizzle client, migrations, and every table.
 * Tables live here rather than in their features so dependencies point one way: features import
 * shared/db, never the reverse. The client registers every table, and tables reference each other
 * (todos → user). Table files import only drizzle-orm: drizzle-kit loads them under Node, where
 * bun:sqlite doesn't exist.
 */
export { db } from "./client";
export { runMigrations } from "./migrate";
export * from "./schema";
