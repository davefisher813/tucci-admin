import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Mirrors user_role enum after migration 019.
export type UserRole = "owner" | "admin" | "coach" | "reception" | "family";

export const STAFF_ROLES: UserRole[] = ["owner", "admin", "coach", "reception"];
export const ADMIN_ROLES: UserRole[] = ["owner", "admin"];

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

// Returns the signed-in user's public.users row, or null if not signed in.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as CurrentUser;
}

// Guards a page. Redirects to /login if not signed in, /unauthorized if the
// role is not allowed. Returns the user when access is granted.
export async function requireRole(
  allowed: UserRole[] = STAFF_ROLES
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!allowed.includes(user.role)) {
    redirect("/unauthorized");
  }
  return user;
}
