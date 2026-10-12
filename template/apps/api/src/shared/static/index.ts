import { Elysia } from "elysia";
import { resolve, sep } from "node:path";

/**
 * Serves the built web app from `dir` (production only; in dev, Vite serves it).
 * Unknown paths fall back to index.html so client-side routes work on reload.
 */
export const staticWeb = (dir: string) => {
  const root = resolve(dir);
  const index = Bun.file(resolve(root, "index.html"));

  return new Elysia({ name: "static-web" }).get("/*", async ({ params, status }) => {
    if (params["*"].startsWith("api/")) return status(404, "Not found");

    // resolve() collapses "..", so anything outside root (including root itself) gets index.html.
    const path = resolve(root, params["*"]);
    if (!path.startsWith(root + sep)) return index;
    const file = Bun.file(path);
    return (await file.exists()) ? file : index;
  });
};
