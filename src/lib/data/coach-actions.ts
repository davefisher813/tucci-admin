"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

type ActionResult = { error: string | null };

export async function setUserRole(input: {
  user_id: string;
  role: string;
}): Promise<ActionResult> {
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
      const { error: profErr } = await supabase
        .from("coach_profiles")
        .insert({ user_id: input.user_id, tier: "t3" });
      if (profErr) return { error: profErr.message };
    }
  }
  return { error: null };
}

export async function updateCoachProfile(input: {
  user_id: string;
  tier: string;
  hourly_pay: number | null;
  specialties: string[];
  is_taking_new: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("coach_profiles").upsert(
    {
      user_id: input.user_id,
      tier: input.tier,
      hourly_pay: input.hourly_pay,
      specialties: input.specialties,
      is_taking_new: input.is_taking_new,
    },
    { onConflict: "user_id" }
  );
  if (error) return { error: error.message };
  return { error: null };
}

// Create a real coach account (login). Needs SUPABASE_SERVICE_ROLE_KEY in the
// environment; returns a clear message if it isn't set. Name-only coaches do
// not use this (they're stored on the booking as coach_name).
export async function createCoachWithLogin(input: {
  name: string;
  email: string;
}): Promise<{
  error: string | null;
  coach?: { id: string; full_name: string };
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return {
      error:
        "Creating a login needs your Supabase service role key set in Vercel. Use name-only for now.",
    };
  const name = input.name.trim();
  const email = input.email.trim();
  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required to create a login." };

  const admin = createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (cErr || !created?.user)
    return { error: cErr?.message ?? "Could not create the account." };
  const uid = created.user.id;

  const { error: uErr } = await admin.from("users").insert({
    id: uid,
    email,
    full_name: name,
    role: "coach",
    is_active: true,
  });
  if (uErr) return { error: uErr.message };

  await admin.from("coach_profiles").insert({ user_id: uid, tier: "t3" });

  return { error: null, coach: { id: uid, full_name: name } };
}
