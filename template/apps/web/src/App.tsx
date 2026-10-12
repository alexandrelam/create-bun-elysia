// App shell: composes the feature modules.
import { SignIn, UserMenu, useSession } from "./auth";
import { Todos } from "./todos";

export function App() {
  const { data: session, isPending } = useSession();

  return (
    <main>
      <header>
        <div>
          <h1>__APP_NAME__</h1>
          <p className="muted">Bun · Elysia · Drizzle · SQLite · Better Auth · React</p>
        </div>
        <UserMenu />
      </header>

      {isPending ? <p className="muted">Loading…</p> : session ? <Todos /> : <SignIn />}
    </main>
  );
}
