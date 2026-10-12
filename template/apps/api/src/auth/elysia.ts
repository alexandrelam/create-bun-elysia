import { Elysia } from "elysia";
import { auth } from "./auth";

const handler = ({ request }: { request: Request }) => auth.handler(request);

/**
 * Better Auth's endpoints. Mount under the `/api` prefix (Better Auth's default basePath is /api/auth).
 * Explicit GET/POST rather than .all(): Elysia matches method-specific routes first, so the
 * production static `GET /*` would otherwise shadow them.
 */
export const authRoutes = new Elysia({ name: "auth-routes" })
  .get("/auth/*", handler, { parse: "none" })
  .post("/auth/*", handler, { parse: "none" });

/**
 * Adds an `auth` route option: `{ auth: true }` rejects unauthenticated requests with 401
 * and puts `user` and `session` in context.
 */
export const authPlugin = new Elysia({ name: "auth" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const data = await auth.api.getSession({ headers });
      if (!data) return status(401, "Unauthorized");
      return data;
    },
  },
});
