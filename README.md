# create-bun-elysia

One command to scaffold a Bun monorepo:

- **apps/api**: [Elysia](https://elysiajs.com) + [Drizzle ORM](https://orm.drizzle.team) on SQLite (`bun:sqlite`, no native driver needed)
- **Auth**: [Better Auth](https://better-auth.com) with Google sign-in, sessions stored in SQLite, an `auth: true` route option in Elysia
- **apps/web**: React + Vite, with an end-to-end typed API client via [Eden Treaty](https://elysiajs.com/eden/overview)
- Bun workspaces, shared `tsconfig.base.json`, a working per-user todo example (CRUD, validation, migrations)
- **Deploy**: push to `main` → GitHub Actions SSHes into your VPS → `update.sh` rebuilds with Docker Compose
  (one container serves API + frontend, SQLite in a volume). Setup guide ships in `.github/workflows/README-deploy.md`.
- **Quality gate**: Husky pre-commit hook runs strict [oxlint](https://oxc.rs) + Prettier on staged files, then `tsc` on the whole workspace
- A `CLAUDE.md` describing the architecture and code organization rules

The generated `.env` (at the project root) already contains a random `BETTER_AUTH_SECRET`. To enable Google
sign-in, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (the generated project's README walks
through it).

Dependencies are **not pinned** in the template. The generator runs `bun add` for each package
when it scaffolds, so every new project starts on the latest releases. It also warns you if a
newer Bun is available.

## Setup (once)

```bash
git clone https://github.com/alexandrelam/create-bun-elysia.git
cd create-bun-elysia
bun link
bun add -g link:create-bun-elysia
```

This installs a `create-bun-elysia` shim in `~/.bun/bin` (`bun pm bin -g` prints the path). That
folder must be on your `PATH`.

On Windows, `bun add -g link:` can fail with `FileNotFound` and leave a dangling shim. If so,
point the global package at this folder with a junction (PowerShell):

```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.bun\install\global\node_modules\create-bun-elysia" -Target (Get-Location)
```

Because it's a link, edits to `template/` take effect immediately; nothing to reinstall.

## Usage

```bash
create-bun-elysia my-app
```

```bash
cd my-app
bun dev
```

Options:

| Flag           | Effect                                         |
| -------------- | ---------------------------------------------- |
| `--no-install` | Only copy the template (skip `bun add` + migration) |
| `--no-git`     | Skip `git init` and the initial commit         |

Without the global link you can also run it directly: `bun path/to/create-bun-elysia/bin/create.ts my-app`.

## Customizing the template

Edit anything in [`template/`](template). `__APP_NAME__` is replaced with the project name in every
file. `template/gitignore` is renamed to `.gitignore` on copy. To add or remove dependencies,
edit the `DEPS` list in [`bin/create.ts`](bin/create.ts).

## License

[MIT](LICENSE)
