import { treaty } from "@elysiajs/eden";
import type { App } from "@__APP_NAME__/api";

// Requests go to the same origin; Vite proxies /api to the Elysia server in dev.
export const client = treaty<App>(window.location.origin);
