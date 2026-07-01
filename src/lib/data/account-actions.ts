"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerOrNull } from "@/lib/auth/guard";
import type { UserRole } from "@/lib/auth/guard";
import { ASSIGNABLE_ROLES, type AccountRow } from "@/lib/data/account-types";

type ActionResult = { error: string | null };

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    "https://tucci-admin.vercel.app"
  ).replace(/\/$/, "");
}

// List every staff/owner account with status. Owner-only.
export async function listAccounts(): Promise<{
  error: string | null;
  accounts: AccountRow[];
}> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can view accounts.", accounts: [] };

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_active")
    .neq("role", "family")
    .order("full_name", { ascending: true });

  if (error) return { error: error.message, accounts: [] };

  const meta = new Map<string, { last: string | null; confirmed: boolean }>();
  try {
    const admin = createAdminClient();
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
    for (const u of list?.users ?? []) {
      meta.set(u.id, {
        last: u.last_sign_in_at ?? null,
        confirmed: Bo
