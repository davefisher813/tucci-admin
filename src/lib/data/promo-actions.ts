"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export async function createPromoCode(input: {
  code: string;
  discount_type: "percent" | "fixed";
  value: number; // whole percent (0-100) or cents
  max_uses: number | null;
  valid_from: string | null;
  valid_to: string | null;
  notes: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").insert({
    code: input.code.trim().toUpperCase(),
    discount_type: input.discount_type,
    value: input.value,
    max_uses: input.max_uses,
    valid_from: input.valid_from,
    valid_to: input.valid_to,
    notes: input.notes,
  });
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { error: "That code already exists." };
    }
    return { error: error.message };
  }
  return { error: null };
}

export async function setPromoActive(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("promo_codes")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deletePromoCode(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) {
    if (/foreign key|promo_redemptions|violates/i.test(error.message)) {
      return {
        error:
          "This code has already been used, so it can't be deleted. Deactivate it instead.",
      };
    }
    return { error: error.message };
  }
  return { error: null };
}
