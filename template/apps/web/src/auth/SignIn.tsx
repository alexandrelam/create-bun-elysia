import { useState } from "react";
import { signIn } from "./client";

export function SignIn() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function signInWithGoogle() {
    const { error } = await signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
    });
    if (error) {
      setErrorMessage(error.message ?? "Sign-in failed. Is Google configured in the root .env?");
    }
  }

  return (
    <section className="signin">
      <button type="button" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
      {errorMessage && <p className="error">{errorMessage}</p>}
    </section>
  );
}
