# syntax=docker/dockerfile:1

# ---- build: every workspace dependency, dev included, then bundle the React app ----
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile
COPY tsconfig.base.json ./
COPY apps ./apps
RUN bun run --filter '@__APP_NAME__/web' build

# ---- runtime: one process, serving the API and the built frontend ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL=/app/data/app.db \
    WEB_DIST=/app/apps/web/dist

COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN bun install --frozen-lockfile --production

COPY apps/api ./apps/api
COPY --from=build /app/apps/web/dist ./apps/web/dist

# The SQLite file lives on a volume; the image itself stays stateless.
RUN mkdir -p /app/data && chown -R bun:bun /app/data
USER bun
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations are read from ./drizzle, so run from the API package.
WORKDIR /app/apps/api
CMD ["bun", "src/index.ts"]
