import { signOut, useSession } from "./client";

/** The signed-in user's avatar, name and a sign-out button; renders nothing when signed out. */
export function UserMenu() {
  const { data: session } = useSession();
  if (!session) return null;

  return (
    <div className="user">
      {session.user.image && <img src={session.user.image} alt="" referrerPolicy="no-referrer" />}
      <span>{session.user.name}</span>
      <button type="button" className="link" onClick={() => signOut()}>
        Sign out
      </button>
    </div>
  );
}
