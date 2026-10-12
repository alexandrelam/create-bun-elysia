# Deploy setup

`deploy.yml` SSHes into the VPS (Hetzner or any Linux box) on every push to `main` and runs
`./update.sh --branch main` in the checkout. All the build work happens on the server; the
runner only opens the SSH connection.

On the server, `update.sh` resets the checkout to `origin/main` and rebuilds the Docker image. It
restarts the container and waits for it to report healthy. In production a single Bun process
serves the API and the built React app. The SQLite database lives in the `db` Docker volume and
survives every rebuild.

## 1. Prepare the server (once)

Requirements on the box: `git`, `docker`, and the Docker Compose plugin (`docker compose version`
must work). The deploy user must be able to run Docker (`sudo usermod -aG docker <user>`).

```bash
ssh <user>@<vps>
mkdir -p ~/projects
git clone git@github.com:<owner>/__APP_NAME__.git ~/projects/__APP_NAME__
cd ~/projects/__APP_NAME__
cp .env.example .env    # BETTER_AUTH_URL, secret, Google OAuth credentials, HOST_PORT
./update.sh             # first deploy, by hand
curl -s localhost:3000/api/health   # {"ok":true}
```

The checkout must be on `main` with an `origin` remote the deploy user can fetch from. For a
private repo, add a read-only [deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
for the server. `update.sh` runs `git reset --hard origin/main`, so any local edit in the
checkout is lost. `.env` is gitignored and safe.

In `.env`:

- `BETTER_AUTH_SECRET`: a new one (`openssl rand -base64 32`). Don't reuse your dev secret.
- `BETTER_AUTH_URL`: the public URL, e.g. `https://app.example.com`.
- **Google:** in the OAuth client, add the redirect URI `https://app.example.com/api/auth/callback/google`.
- `HOST_PORT`: give each app on the server its own value.

## 2. HTTPS (once)

The container is published on `127.0.0.1:$HOST_PORT` only. Put a reverse proxy in front, e.g.
Caddy (automatic certificates). In `/etc/caddy/Caddyfile`:

```
app.example.com {
	reverse_proxy 127.0.0.1:3000
}
```

then `sudo systemctl reload caddy`. Point the domain's DNS at the server first.

## 3. Create a deploy key (once)

On your laptop:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/__APP_NAME__-deploy -N ""
ssh-copy-id -i ~/.ssh/__APP_NAME__-deploy.pub <user>@<vps>
ssh-keyscan <vps> 2>/dev/null        # copy this output for SSH_KNOWN_HOSTS
```

## 4. Repository secrets

`Settings → Secrets and variables → Actions → Secrets`:

| Secret | Value |
| --- | --- |
| `SSH_HOST` | VPS IP or hostname |
| `SSH_USER` | SSH user (the one owning `~/projects/__APP_NAME__`) |
| `SSH_KEY` | contents of `~/.ssh/__APP_NAME__-deploy` (the **private** key, including the BEGIN/END lines) |
| `SSH_KNOWN_HOSTS` | output of `ssh-keyscan <vps>` |
| `SSH_PORT` | optional, defaults to `22` |

Under `Variables`, optionally set `APP_DIR` if the checkout is not at `~/projects/__APP_NAME__`.

`SSH_KNOWN_HOSTS` is required on purpose. The workflow runs with `StrictHostKeyChecking=yes`, so
a swapped host key aborts the deploy instead of handing the key to an unknown machine.

The job runs in the `production` environment. GitHub creates it on the first run; add protection
rules there (required reviewers, `main` only) if you want them.

## Running it

Pushes to `main` deploy automatically. `Actions → Deploy → Run workflow` re-deploys the current
`main` by hand. Deploys are serialized: a second push waits for the running one rather than
cancelling it. `update.sh`'s output (build, health check, final status) streams into the job
log, and a failed deploy fails the job.

On the server:

- **Logs:** `docker compose logs -f app`
- **Redeploy without pulling:** `./update.sh --no-pull`
- **Back up the database:** `docker compose cp app:/app/data/app.db ./backup-$(date +%F).db`
- **Migrations** run when the container starts.

If `./update.sh` fails with `Permission denied`, the executable bit was lost (common when
committing from Windows): `git update-index --chmod=+x update.sh` and commit.
