"use server";

import { createClient } from "@/lib/supabase/server";

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
