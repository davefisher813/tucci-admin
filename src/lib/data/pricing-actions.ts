"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export async function updateServiceRates(input: {
  id: string;
  name: string;
  category: string;
  category_id?: string | null;
  base_rate_cents: number;
  peak_rate_cents: number | null;
  min_duration_hours: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    name: input.name,
    category: input.category,
    base_rate_cents: input.base_rate_cents,
    peak_rate_cents: input.peak_rate_cents,
    min_duration_hours: input.min_duration_hours,
  };
  if (input.category_id !== undefined) patch.category_id = input.category_id;
  const { error } = await supabase
    .from("services")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { error: null };
}
