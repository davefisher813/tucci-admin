"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Phase = "checking" | "ready" | "no-session";

export default function SetPasswordClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // On load, establish a session from whatever the email link delivered:
  //  - hash tokens: #access_token=...&refresh_token=...  (invite / recovery)
  //  - PKCE code:   ?code=...
  //  - or an already-present session (rare)
  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // 1) hash-based tokens (Supabase default for invite + recovery)
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      const hp = new URLSearchParams(hash);
      const access_token = hp.get("access_token");
      const refresh_token = hp.get("refresh_token");

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (!error && data.user) {
          setEmail(data.user.email ?? "");
          window.history.replaceState(null, "", window.location.pathname);
          setPhase("ready");
          return;
        }
      }

      // 2) PKCE ?code= flow
      const qs = new URLSearchParams(window.location.search);
      const code = qs.get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data.user) {
          setEmail(data.user.email ?? "");
          window.history.replaceState(null, "", window.location.pathname);
          setPhase("ready");
          return;
        }
      }

      // 3) maybe a session already exists
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setEmail(data.user.email ?? "");
        setPhase("ready");
        return;
      }

      setPhase("no-session");
    }

    init();
  }, []);

  async function submit() {
    setErr(null);
    if (pw.length < 8) return setErr("Use at least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    router.push("/today");
    router.refresh();
  }

  if (phase === "checking") {
    return (
      <div className="rounded-lg border border-ink/10 bg-paper px-3 py-3 text-sm text-ink/70">
        Checking your invite…
      </div>
    );
  }

  if (phase === "no-session") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          This link is missing its sign-in token or has expired. Open the most
          recent invite email and tap the link again. If it keeps happening, ask
          a manager to resend your invite.
        </div>
        <a
          href="/login"
          className="block w-full rounded-lg bg-accent py-2.5 text-center font-medium text-white hover:bg-accent/90"
        >
          Go to Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {email && (
        <div className="rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm text-ink/70">
          Setting the password for <b className="text-ink">{email}</b>
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          New Password
        </label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Confirm Password
        </label>
        <input
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
        />
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="w-full rounded-lg bg-accent py-2.5 font-medium text-white hover:bg-accent/90 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Set Password & Continue"}
      </button>
    </div>
  );
}

