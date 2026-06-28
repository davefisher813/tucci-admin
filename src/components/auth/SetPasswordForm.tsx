"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
