import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { db } from "../db";
import * as schema from "../db/schema";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId || !googleClientSecret) {
  console.warn("⚠ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set in apps/api/.env: Google sign-in is disabled.");
}

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment automatically.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  socialProviders:
    googleClientId && googleClientSecret
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {},
});

/**
 * Serves Better Auth's routes under /api/auth/* and adds an `auth` route option:
 * `{ auth: true }` rejects unauthenticated requests with 401 and puts `user` and `session` in context.
 */
export const authPlugin = new Elysia({ name: "better-auth" })
  .all("/api/auth/*", ({ request }) => auth.handler(request), { parse: "none" })
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });
        if (!session) return status(401, "Unauthorized");
        return { user: session.user, session: session.session };
      },
    },
  });
