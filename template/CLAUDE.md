# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from the repo root (Bun workspaces; each root script fans out with `bun --filter`):

- `bun dev`: API (`bun --watch`, port 3000) and web (Vite, port 5173) in parallel
- `bun run check`: lint + format check + typecheck. Run it after changes; it's what the pre-commit hook enforces.
- `bun run lint` / `bun run lint:fix`: oxlint with the `correctness`, `suspicious`, `pedantic` and `perf` categories as errors (`.oxlintrc.json`), `--deny-warnings`
- `bun run format`: Prettier (`.prettierrc.json`; Markdown, migrations and the generated `schema/auth.ts` are ignored)
- `bun run typecheck`: `tsc --noEmit` in both apps
- `bun run build`: API bundle (`apps/api/dist`) + Vite build (`apps/web/dist`)
- `bun run db:generate`: Drizzle migration from the schema diff, written to `apps/api/drizzle/`
- `bun run db:migrate`: apply migrations (the API also applies them on every start)
- `bun run auth:generate`: regenerate `apps/api/src/shared/db/schema/auth.ts` with the Better Auth CLI after changing Better Auth plugins/config
- Add a dependency to one app: `bun add <pkg> --cwd apps/api` (or `apps/web`)

Husky's pre-commit hook (`.husky/pre-commit`) runs lint-staged (oxlint + Prettier on staged files) and then typechecks the whole workspace, since a staged file can break types in an unstaged one. Fix what it reports rather than bypassing it with `--no-verify`. Don't disable lint rules to get a commit through; restructure the code instead (e.g. derive state rather than `setState` in an effect).

There is no test suite yet. Bun's built-in runner is `bun test` (single file: `bun test path/to/file.test.ts`).

## Code organization

Build **deep, modular features with simple interfaces**. Keep the architecture straightforward and scalable without unnecessary abstractions or layers.

1. **Deep modules, simple APIs.** Modules hide internal complexity behind small public interfaces. Callers know _what_ to call (e.g. `theme.toggle()`, `auth.login()`), not _how_ it works. Pull complexity downward: handle edge cases, defaults and internals inside the module, not at the call site.
2. **Group by feature or domain concept** (e.g. `theme/`, `auth/`, `billing/`), not by file type (`controllers/`, `views/`). Keep a feature's components, state and helpers together in its folder.
3. **Strict module boundaries.** Every module exposes one public entry point (`index.ts`). Code outside a module imports only from that top-level `index.ts`. Deep imports into another module's internal files are forbidden.
4. **Shared vs. feature.** UI primitives, core utilities and global setup live in a dedicated `shared/` folder.

How this maps onto the code:

```
apps/api/src/
  index.ts        composition root: mounts feature routes under /api, serves the web build in prod
  auth/           Better Auth instance, authRoutes (/api/auth/*), authPlugin ({ auth: true })
  todos/          todoRoutes
  shared/db/      db client, runMigrations, and ALL tables (schema/)
  shared/static/  staticWeb (production SPA serving)
apps/web/src/
  App.tsx         app shell composing features
  auth/           useSession, SignIn, UserMenu
  todos/          Todos
  shared/api/     typed Eden client; shared/styles.css global styles
```

- A module is a top-level folder in `src/` or a folder directly in `src/shared/`. Its `index.ts` is the only import target from outside (`"../auth"`, `"../shared/db"`). Inside a module, import siblings directly (`"./client"`).
- **Lint enforces this.** `eslint/no-restricted-imports` in `.oxlintrc.json` rejects paths like `../auth/client` or `./shared/db/schema/auth`. When you need something internal, export it from the module's `index.ts` instead.
- **Exception: tables.** They live in `shared/db/schema/`, not in their features. drizzle-kit loads the schema under Node (no `bun:sqlite`) to build one migration history, so table files must not import feature code. Features import their tables from `"../shared/db"`.
- **New feature:** add a folder with an `index.ts`. In the API, export an Elysia plugin with its own prefix and `.use()` it in `src/index.ts`. Add its tables to `shared/db/schema/` and re-export them from `schema/index.ts`. In the web app, export the components and hooks that `App.tsx` needs.

## Architecture

Bun monorepo: `apps/api` (Elysia + Drizzle on `bun:sqlite` + Better Auth) and `apps/web` (React + Vite).

- **One origin in dev.** The browser only talks to Vite on :5173, which proxies `/api/*` to the API on :3000 (`apps/web/vite.config.ts`). Auth cookies are therefore same-origin; there is no CORS setup. `BETTER_AUTH_URL` is the browser-facing URL (`http://localhost:5173`), and the Google OAuth redirect URI is `http://localhost:5173/api/auth/callback/google`.
- **End-to-end types without codegen.** `apps/api/src/index.ts` exports `type App` (the `/api` instance). The web app depends on `@__APP_NAME__/api` (workspace) and imports that type in `apps/web/src/shared/api/index.ts` for an Eden Treaty client, so `client.api.todos.get()` is typed from the Elysia route definitions. A route plugin only reaches the frontend's types once it is `.use()`d on the `api` instance.
- **Auth.** `authPlugin` is an Elysia macro: a route or `.guard()` with `{ auth: true }` returns 401 when signed out and gets `user` and `session` in context. `authRoutes` registers explicit GET/POST handlers, not `.all()`, because Elysia matches method-specific routes first and the production static `GET /*` would otherwise shadow Better Auth. Google is only enabled when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.
- **Data ownership.** User-owned tables reference `user.id` with `onDelete: "cascade"`, and every query filters by the session user (see `ownTodo` in `todos/routes.ts`). Return `status(404)` rather than leaking that a row exists for another user.
- **Database.** SQLite at `DATABASE_URL` (default `data/app.db`, relative to `apps/api`) in WAL mode. `schema/auth.ts` is generated: don't hand-edit it, use `auth:generate`. After any schema change, run `db:generate` and commit the migration. Never edit existing migrations.
- **Production.** Pushing to `main` runs `.github/workflows/deploy.yml`, which SSHes into the server and runs `update.sh`. That script resets to `origin/main`, rebuilds with docker compose, and waits for the container's healthcheck on `/api/health`. In the container, `WEB_DIST` is set and the API also serves the built web app with an SPA fallback to `index.html`. Production env lives in the root `.env` (from the root `.env.example`, read by compose). SQLite is at `/app/data/app.db` in the `db` volume. Setup steps: `.github/workflows/README-deploy.md`.
- **Env (dev).** Bun auto-loads `apps/api/.env` (gitignored; `apps/api/.env.example` documents every key). `BETTER_AUTH_SECRET` was generated when the project was scaffolded.
