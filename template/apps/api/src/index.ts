import { Elysia } from "elysia";
import { runMigrations } from "./db/migrate";
import { todoRoutes } from "./routes/todos";

runMigrations();

const app = new Elysia({ prefix: "/api" })
  .get("/health", () => ({ ok: true }))
  .use(todoRoutes)
  .listen(Number(process.env.PORT ?? 3000));

console.log(`🦊 API running at ${app.server?.url}api`);

/** Imported (type-only) by the web app for an end-to-end typed client. */
export type App = typeof app;
