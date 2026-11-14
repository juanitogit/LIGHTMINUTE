import { useEffect, useState } from "react";

interface Identity { id: string; name: string; email: string }
interface Session { configured: boolean; user: Identity | null }

export function GoogleAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json() as Session;
        if (alive && typeof data.configured === "boolean") setSession(data);
      }).catch(() => { if (alive) setSession({ configured: false, user: null }); });
    const url = new URL(window.location.href);
    if (url.searchParams.has("auth_error")) {
      setNotice(url.searchParams.get("auth_error") === "denied"
        ? "Google sign-in was cancelled." : "Google sign-in failed. Please try again.");
      url.searchParams.delete("auth_error");
      window.history.replaceState(null, "", url);
    }
    return () => { alive = false; };
  }, []);
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!response.ok) throw new Error("Sign-out failed");
      setSession({ configured: true, user: null });
      setNotice("Signed out of LIGHTMINUTE.");
    } catch { setNotice("Could not sign out. Check your connection and try again."); }
    finally { setBusy(false); }
  }
  return <div className="google-account">
    {session?.user ? <details>
      <summary aria-label={`Google account: ${session.user.name}`}>{session.user.name}</summary>
      <div className="google-account__menu">
        <strong>{session.user.name}</strong><span>{session.user.email}</span>
        <p>Google identity does not grant medical or ground-control roles.</p>
        <button type="button" className="btn" disabled={busy} onClick={() => void logout()}>Sign out</button>
      </div>
    </details> : <button type="button" className="btn btn--tiny" disabled={!session?.configured}
      onClick={() => window.location.assign("/api/auth/google/login")}
      title={session && !session.configured ? "Google sign-in is currently unavailable" : undefined}>
      {session === null ? "Checking account…" : session.configured ? "Sign in with Google" : "Google unavailable"}
    </button>}
    {notice ? <p className="google-account__notice" role="status">{notice}<button type="button" aria-label="Dismiss account notice" onClick={() => setNotice("")}>×</button></p> : null}
  </div>;
}
