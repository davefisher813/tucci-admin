import Link from "next/link";
import { signup } from "@/lib/auth/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-ink mb-1">
          Tucci Elite Admin
        </h1>
        <p className="text-sm text-ink/60 mb-6">Sign Up</p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Full Name
            </label>
            <input
              name="full_name"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-ink/15 bg-paper px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-accent py-2.5 font-medium text-white hover:bg-accent/90"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-6 text-sm text-ink/60">
          New accounts start with no admin access until an owner promotes you.
        </p>
        <p className="mt-2 text-sm text-ink/60">
          Have an account?{" "}
          <Link href="/login" className="text-accent font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
