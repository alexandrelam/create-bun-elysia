import { Elysia } from "elysia";
import { runMigrations } from "./db/migrate";
import { auth } from "./lib/auth";
import { staticWeb } from "./lib/static";
import { todoRoutes } from "./routes/todos";

runMigrations();

const authHandler = ({ request }: { request: Request }) => auth.handler(request);

const api = new Elysia({ prefix: "/api" })
  // Better Auth's endpoints (its default basePath is /api/auth). Explicit GET/POST rather than
  // .all(): Elysia matches method-specific routes first, so the production static `GET /*` would win.
  .get("/auth/*", authHandler, { parse: "none" })
  .post("/auth/*", authHandler, { parse: "none" })
  .get("/health", () => ({ ok: true }))
  .use(todoRoutes);

const app = new Elysia().use(api);

// In production (Docker), WEB_DIST points at the built web app and this server serves it too.
if (process.env.WEB_DIST) app.use(staticWeb(process.env.WEB_DIST));

app.listen(Number(process.env.PORT ?? 3000));

console.log(`🦊 API running at ${app.server?.url}api`);

/** Imported (type-only) by the web app for an end-to-end typed client. */
export type App = typeof api;
