import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/shared/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "data/app.db",
  },
});
