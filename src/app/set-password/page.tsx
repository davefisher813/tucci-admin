import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SetPasswordForm from "@/components/auth/SetPasswordForm";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?error=${encodeURIComponent(
        "Open the link from your invite email to set your password."
      )}`
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">
          Tucci Elite Admin
        </h1>
        <p className="mb-6 text-sm text-ink/60">
          Welcome. Set a password to finish setting up your account.
        </p>
        <SetPasswordForm email={user.email ?? ""} />
      </div>
    </main>
  );
}
