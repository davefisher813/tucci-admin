import { signout } from "@/lib/auth/actions";

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold text-ink mb-2">
          No Admin Access
        </h1>
        <p className="text-sm text-ink/60 mb-6">
          Your account does not have access to the admin. An owner can promote
          you in Settings.
        </p>
        <form action={signout}>
          <button
            type="submit"
            className="rounded-lg border border-ink/15 bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-bg"
          >
            Sign Out
          </button>
        </form>
      </div>
    </main>
  );
}
