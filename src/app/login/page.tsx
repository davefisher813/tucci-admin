import { login } from "@/lib/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[380px]">
        <div className="rounded-[18px] border border-line bg-paper p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt="Tucci Elite"
              className="h-[52px] w-[52px] rounded-[12px] border border-line"
            />
            <div>
              <div className="font-display text-[20px] font-extrabold tracking-[-.01em] text-text">
                Tucci Elite
              </div>
              <div className="font-display text-[11px] font-bold tracking-[.08em] text-accent">
                ADMIN SIGN IN
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
              {error}
            </div>
          )}

          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="rounded-[9px] border border-line-2 bg-paper px-[11px] py-[11px] text-[15px] text-text outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-[9px] border border-line-2 bg-paper px-[11px] py-[11px] text-[15px] text-text outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="mt-1 rounded-[10px] border border-ink bg-ink py-[13px] font-display text-[14px] font-extrabold tracking-[.02em] text-white"
            >
              Sign In
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11.5px] text-muted">
          Tucci Elite Athletic Complex · Staff Access Only
        </p>
      </div>
    </main>
  );
}
