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
        confirmed: Boolean(u.last_sign_in_at),
      });
    }
  } catch {
    // service key not configured; status columns just show as unknown/pending
  }

  const accounts: AccountRow[] = (rows ?? []).map((r) => {
    const m = meta.get(r.id);
    return {
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      role: r.role as UserRole,
      is_active: r.is_active ?? true,
      last_sign_in_at: m?.last ?? null,
      invited_pending: m ? !m.confirmed : false,
    };
  });

  return { error: null, accounts };
}

// Create a new account and email them a link to set their own password.
export async function createAccount(input: {
  full_name: string;
  email: string;
  role: UserRole;
}): Promise<ActionResult> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can add accounts." };

  const name = input.full_name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) return { error: "Enter a name." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (!ASSIGNABLE_ROLES.some((r) => r.value === input.role))
    return { error: "Pick a valid role." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Adding accounts needs the Supabase service role key set in Vercel. Once it's set, this will work.",
    };
  }

  // Try a normal invite first.
  const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: name },
      redirectTo: `${siteUrl()}/set-password`,
    }
  );

  let uid = invited?.user?.id ?? null;

  // If the email already exists, don't error. Find that user, make sure they're
  // active and unbanned, and send a fresh set-password (recovery) link so they
  // can get in. This turns "Add Account" into repair-and-reinvite.
  if (invErr || !uid) {
    const msg = invErr?.message ?? "";
    const alreadyExists = /already.*registered|exists|been registered/i.test(msg);
    if (!alreadyExists) {
      return { error: msg || "Could not create the account." };
    }

    // Locate the existing auth user by email.
    let foundId: string | null = null;
    for (let page = 1; page <= 5 && !foundId; page++) {
      const { data: list } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      const match = (list?.users ?? []).find(
        (u) => (u.email ?? "").toLowerCase() === email
      );
      if (match) foundId = match.id;
      if ((list?.users ?? []).length < 200) break;
    }

    if (!foundId) {
      return {
        error:
          "That email already exists but the account could not be located. Delete it in Supabase, then add again.",
      };
    }
    uid = foundId;

    // Clear any ban and refresh their metadata.
    await admin.auth.admin.updateUserById(uid, {
      ban_duration: "none",
      user_metadata: { full_name: name },
    });

    // Send a real recovery email (this actually delivers, and works for an
    // existing user). It lands on /set-password via our redirect.
    const pub = await createClient();
    await pub.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/set-password`,
    });
  }

  // Upsert the app users row (create or repair).
  const { error: uErr } = await admin
    .from("users")
    .upsert(
      {
        id: uid,
        email,
        full_name: name,
        role: input.role,
        is_active: true,
      },
      { onConflict: "id" }
    );
  if (uErr) return { error: uErr.message };

  if (input.role === "coach") {
    await admin
      .from("coach_profiles")
      .upsert({ user_id: uid, tier: "t3" }, { onConflict: "user_id" });
  }

  return { error: null };
}

// Resend the set-password invite. Works for any account.
export async function resendInvite(email: string): Promise<ActionResult> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can resend invites." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Needs the Supabase service role key set in Vercel." };
  }

  const target = email.trim().toLowerCase();
  // Try invite first (works for brand-new / never-confirmed users).
  const { error: invErr } = await admin.auth.admin.inviteUserByEmail(target, {
    redirectTo: `${siteUrl()}/set-password`,
  });

  // If they already exist, send a recovery email instead (that one delivers
  // and lets them set a new password).
  if (invErr) {
    const exists = /already.*registered|exists|been registered/i.test(
      invErr.message
    );
    if (!exists) return { error: invErr.message };
    const pub = await createClient();
    const { error: recErr } = await pub.auth.resetPasswordForEmail(target, {
      redirectTo: `${siteUrl()}/set-password`,
    });
    if (recErr) return { error: recErr.message };
  }
  return { error: null };
}

// Change someone's role. Owner-only. An owner cannot demote themselves.
export async function changeAccountRole(input: {
  user_id: string;
  role: UserRole;
}): Promise<ActionResult> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can change roles." };
  if (input.user_id === owner.id && input.role !== "owner")
    return { error: "You can't remove your own Manager access." };
  if (!ASSIGNABLE_ROLES.some((r) => r.value === input.role))
    return { error: "Pick a valid role." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ role: input.role })
    .eq("id", input.user_id);
  if (error) return { error: error.message };

  if (input.role === "coach") {
    const { data: existing } = await supabase
      .from("coach_profiles")
      .select("user_id")
      .eq("user_id", input.user_id)
      .maybeSingle();
    if (!existing) {
      await supabase
        .from("coach_profiles")
        .insert({ user_id: input.user_id, tier: "t3" });
    }
  }
  return { error: null };
}

// Turn an account on or off. Owners can't disable themselves.
export async function setAccountActive(input: {
  user_id: string;
  is_active: boolean;
}): Promise<ActionResult> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can enable or disable accounts." };
  if (input.user_id === owner.id && !input.is_active)
    return { error: "You can't disable your own account." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ is_active: input.is_active })
    .eq("id", input.user_id);
  if (error) return { error: error.message };

  try {
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(input.user_id, {
      ban_duration: input.is_active ? "none" : "876000h",
    });
  } catch {
    // service key missing; the public.users flag still applies in app guards
  }
  return { error: null };
}

// Permanently delete an account: removes the auth login AND the users row.
// Owner-only. Cannot delete yourself. This is irreversible. If real records
// reference the user (bookings, audit log, etc.), a hard delete of the users
// row may be blocked by the database; in that case we still remove the login
// and report clearly.
export async function deleteAccount(userId: string): Promise<ActionResult> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can delete accounts." };
  if (userId === owner.id) return { error: "You can't delete your own account." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Deleting accounts needs the Supabase service role key set in Vercel.",
    };
  }

  // 1) Delete the public.users row first. Some schemas have auth.users -> users
  //    cascade, which would re-block; deleting the app row up front avoids that.
  const { error: rowErr } = await admin
    .from("users")
    .delete()
    .eq("id", userId);

  if (rowErr) {
    // Most common: a foreign key (bookings_created_by, audit_log, etc.) still
    // points at this user. Tell the manager plainly instead of failing silently.
    const msg = rowErr.message || "";
    if (/foreign key|violates|referenced/i.test(msg)) {
      return {
        error:
          "This account has activity tied to it (bookings, logs, etc.), so it can't be fully deleted. Use Disable instead to remove their access while keeping the records.",
      };
    }
    return { error: msg || "Could not delete the account record." };
  }

  // 2) Remove the auth login. "not found" is fine (already gone).
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    const msg =
      typeof authErr.message === "string" ? authErr.message : String(authErr);
    if (!/not found/i.test(msg)) {
      return {
        error:
          "The account record was removed, but its login could not be deleted: " +
          msg,
      };
    }
  }

  return { error: null };
}

// Set a user's password directly, no email involved. Owner-only. This is the
// escape hatch when email flows fail: type a password here, tell the person.
export async function setPasswordDirect(input: {
  user_id: string;
  password: string;
}): Promise<ActionResult> {
  const owner = await getOwnerOrNull();
  if (!owner) return { error: "Only managers can set passwords." };
  if (input.password.length < 8)
    return { error: "Password must be at least 8 characters." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Setting a password needs the Supabase service role key set in Vercel.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(input.user_id, {
    password: input.password,
    ban_duration: "none",
  });
  if (error) return { error: error.message };
  return { error: null };
}
