import { createAuthClient } from "better-auth/react";

// Same origin as the page; Vite proxies /api/auth to the Elysia server in dev.
export const { useSession, signIn, signOut } = createAuthClient();
