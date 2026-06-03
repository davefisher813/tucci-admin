"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export async function createAsset(input: {
  name: string;
  asset_type: string;
  display_order: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("assets").insert({
    name: input.name,
    asset_type: input.asset_type,
    display_order: input.display_order,
    is_active: true,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateAsset(input: {
  id: string;
  name: string;
  asset_type: string;
  display_order: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({
      name: input.name,
      asset_type: input.asset_type,
      display_order: input.display_order,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assets")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function createService(input: {
  code: string;
  name: string;
  category: string;
  base_rate_cents: number;
  unit: string;
  min_duration_hours: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    code: input.code,
    name: input.name,
    category: input.category,
    base_rate_cents: input.base_rate_cents,
    unit: input.unit,
    min_duration_hours: input.min_duration_hours,
    is_active: true,
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateService(input: {
  id: string;
  name: string;
  category: string;
  base_rate_cents: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: input.name,
      category: input.category,
      base_rate_cents: input.base_rate_cents,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
