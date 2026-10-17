// The Better Auth instance. Also loaded by the Better Auth CLI (`bun run auth:generate`).
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "../shared/db";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
const google =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }
    : undefined;

if (!google) {
  console.warn(
    "⚠ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set in the root .env: Google sign-in is disabled.",
  );
}

// BETTER_AUTH_SECRET and BETTER_AUTH_URL are read from the environment automatically.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: google ? { google } : {},
});
