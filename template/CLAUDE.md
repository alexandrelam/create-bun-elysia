# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (Bun workspaces; each root script fans out with `bun --filter`):

- `bun dev`: API (`bun --watch`, port 3000) and web (Vite, port 5173) in parallel
- `bun run typecheck`: `tsc --noEmit` in both apps. There is no separate linter, so this is the check to run after changes.
- `bun run build`: API bundle (`apps/api/dist`) + Vite build (`apps/web/dist`)
- `bun run db:generate`: Drizzle migration from the schema diff, written to `apps/api/drizzle/`
- `bun run db:migrate`: apply migrations (the API also applies them on every start)
- `bun run auth:generate`: regenerate `apps/api/src/db/schema/auth.ts` with the Better Auth CLI after changing Better Auth plugins/config
- Add a dependency to one app: `bun add <pkg> --cwd apps/api` (or `apps/web`)

There is no test suite yet. Bun's built-in runner is `bun test` (single file: `bun test path/to/file.test.ts`).

## Architecture

Bun monorepo: `apps/api` (Elysia + Drizzle on `bun:sqlite` + Better Auth) and `apps/web` (React + Vite).

- **One origin in dev.** The browser only talks to Vite on :5173, which proxies `/api/*` to the API on :3000 (`apps/web/vite.config.ts`). Auth cookies are therefore same-origin; there is no CORS setup. `BETTER_AUTH_URL` is the browser-facing URL (`http://localhost:5173`), and the Google OAuth redirect URI is `http://localhost:5173/api/auth/callback/google`.
- **End-to-end types without codegen.** `apps/api/src/index.ts` exports `type App`. The web app depends on `@__APP_NAME__/api` (workspace) and imports that type in `apps/web/src/api.ts` for an Eden Treaty client, so `client.api.todos.get()` is typed from the Elysia route definitions. Every API route must be chained onto the root `app` (via `.use(plugin)`) for its types to reach the frontend. Plugins that aren't chained are invisible to Eden.
- **Root app owns the `/api` prefix.** `new Elysia({ prefix: "/api" })` in `src/index.ts` registers Better Auth's handler at `/auth/*` and `.use()`s route plugins, which declare only their own prefix (e.g. `/todos`).
- **Auth.** `apps/api/src/lib/auth.ts` exports `auth` (the Better Auth instance, Drizzle adapter) and `authPlugin`, an Elysia macro. A route or `.guard()` with `{ auth: true }` returns 401 when signed out and gets `user` and `session` in context. Google is only enabled when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set. The web side uses `useSession`/`signIn`/`signOut` from `apps/web/src/auth.ts`.
- **Data ownership.** User-owned tables reference `user.id` with `onDelete: "cascade"`, and every query filters by the session user (see `ownTodo` in `routes/todos.ts`). Return `status(404)` rather than leaking that a row exists for another user.
- **Database.** `src/db/index.ts` opens SQLite at `DATABASE_URL` (default `data/app.db`, relative to `apps/api`) in WAL mode. Schema lives in `src/db/schema/` and is re-exported from its `index.ts`. `schema/auth.ts` is generated: don't hand-edit it, use `auth:generate`. After any schema change, run `db:generate` and commit the migration. Never edit existing migrations.
- **Production.** Pushing to `main` runs `.github/workflows/deploy.yml`, which SSHes into the server and runs `update.sh`. That script resets to `origin/main`, rebuilds with docker compose, and waits for the container's healthcheck on `/api/health`. In the container, `WEB_DIST` is set and the API also serves the built web app (`src/lib/static.ts`, SPA fallback to `index.html`). That's why `index.ts` mounts the `/api` routes on a separate `api` instance and exports `App = typeof api`. Auth routes are registered as explicit GET/POST because Elysia matches method-specific routes before `.all()`, so the static `GET /*` would otherwise shadow them. Production env lives in the root `.env` (from the root `.env.example`, read by compose). SQLite is at `/app/data/app.db` in the `db` volume. Setup steps: `.github/workflows/README-deploy.md`.
- **Env.** Bun auto-loads `apps/api/.env` (gitignored; `.env.example` documents every key). `BETTER_AUTH_SECRET` was generated when the project was scaffolded.

## Code organization principles

Build **deep, modular features with simple interfaces**. Keep the architecture straightforward and scalable without unnecessary abstractions or layers.

1. **Deep modules, simple APIs.** Modules hide internal complexity behind small public interfaces. Callers know *what* to call (e.g. `theme.toggle()`, `auth.login()`), not *how* it works. Pull complexity downward: handle edge cases, defaults and internals inside the module, not at the call site.
2. **Group by feature or domain concept** (e.g. `theme/`, `auth/`, `billing/`), not by file type (`controllers/`, `views/`). Keep a feature's components, state and helpers together in its folder.
3. **Strict module boundaries.** Every module exposes one public entry point (`index.ts`). Code outside a module imports only from that top-level `index.ts`. Deep imports into another module's internal files are forbidden.
4. **Shared vs. feature.** UI primitives, core utilities and global setup live in a dedicated `shared/` folder.
