import SetPasswordClient from "@/components/auth/SetPasswordClient";

// Client-rendered on purpose: invite / recovery links deliver the session token
// in the URL hash (#access_token=...) or as a ?code=, neither of which the
// server can read. The client component reads it, establishes the session, then
// shows the password form.
export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">
          Tucci Elite Admin
        </h1>
        <p className="mb-6 text-sm text-ink/60">
          Welcome. Set a password to finish setting up your account.
        </p>
        <SetPasswordClient />
      </div>
    </main>
  );
}
