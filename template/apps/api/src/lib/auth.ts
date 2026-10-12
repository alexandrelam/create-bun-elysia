import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { Elysia } from "elysia";
import { db } from "../db";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const google =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
    : undefined;

if (!google) {
  console.warn("⚠ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set in apps/api/.env: Google sign-in is disabled.");
}

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment automatically.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: google ? { google } : {},
});

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
