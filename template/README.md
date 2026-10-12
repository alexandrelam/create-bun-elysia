# __APP_NAME__

Bun monorepo with an Elysia + Drizzle (SQLite) API and a React (Vite) frontend.

```
apps/
  api/   Elysia server, Drizzle ORM on bun:sqlite   → http://localhost:3000/api
  web/   React + Vite, typed client via Eden Treaty → http://localhost:5173
packages/  (optional) shared workspace packages
```

## Commands (run from the root)

| Command               | What it does                                            |
| --------------------- | ------------------------------------------------------- |
| `bun dev`             | Run API (watch mode) and web (Vite HMR) together        |
| `bun run build`       | Build both apps                                         |
| `bun run typecheck`   | Type-check both apps                                    |
| `bun run db:generate` | Generate a SQL migration after editing `schema.ts`      |
| `bun run db:migrate`  | Apply migrations (also runs automatically on API start) |

## Database workflow

1. Edit `apps/api/src/db/schema.ts`
2. `bun run db:generate` writes a new migration to `apps/api/drizzle/`
3. Restart the API (or `bun run db:migrate`). Migrations are applied on startup.

The SQLite file lives at `apps/api/data/app.db` (override with `DATABASE_URL` in `apps/api/.env`).

## End-to-end types

`apps/api/src/index.ts` exports `type App`. The web app imports it in `src/api.ts` and uses
Eden Treaty, so API routes, params and responses are typed in the frontend with no codegen.
