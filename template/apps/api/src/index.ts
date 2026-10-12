// Composition root: wires the feature modules into one Elysia app.
import { Elysia } from "elysia";
import { authRoutes } from "./auth";
import { runMigrations } from "./shared/db";
import { staticWeb } from "./shared/static";
import { todoRoutes } from "./todos";

runMigrations();

const api = new Elysia({ prefix: "/api" })
  .use(authRoutes)
  .get("/health", () => ({ ok: true }))
  .use(todoRoutes);

const app = new Elysia().use(api);

// In production (Docker), WEB_DIST points at the built web app and this server serves it too.
if (process.env.WEB_DIST) app.use(staticWeb(process.env.WEB_DIST));

app.listen(Number(process.env.PORT ?? 3000));

console.log(`🦊 API running at ${app.server?.url}api`);

/** Imported (type-only) by the web app for an end-to-end typed client. */
export type App = typeof api;
