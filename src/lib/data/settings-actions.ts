"use server";

import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/data/resources";

type ActionResult = { error: string | null };

// ---- ASSETS (spaces) ----

// Creating a space also gives it its own "zone" so double-booking protection
// applies immediately. Splittable cages and field coverage layer on top of this.
export async function createAsset(input: {
  name: string;
  asset_type_id: string | null;
  display_order: number;
  description?: string | null;
  features?: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({
      name: input.name,
      asset_type_id: input.asset_type_id,
      display_order: input.display_order,
      description: input.description ?? null,
      features: input.features ?? null,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const assetId = (data as { id: string }).id;

  const { data: z, error: zErr } = await supabase
    .from("zones")
    .insert({ label: "Z: " + assetId })
    .select("id")
    .single();
  if (zErr) {
    return {
      error:
        "Space was created, but its double-booking protection did not finish setting up. Re-open the space and save again, or remove and recreate it. (" +
        zErr.message +
        ")",
    };
  }
  const zoneId = (z as { id: string }).id;
  const { error: azErr } = await supabase
    .from("asset_zones")
    .insert({ asset_id: assetId, zone_id: zoneId, ord: 0 });
  if (azErr) {
    return {
      error:
        "Space was created, but linking its double-booking protection failed. Re-open the space and save again. (" +
        azErr.message +
        ")",
    };
  }

  return { error: null };
}

export async function updateAsset(input: {
  id: string;
  name: string;
  asset_type_id: string | null;
  description?: string | null;
  features?: string[];
  display_order?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    name: input.name,
    asset_type_id: input.asset_type_id,
  };
  if (input.description !== undefined) patch.description = input.description;
  if (input.features !== undefined) patch.features = input.features;
  if (input.display_order !== undefined)
    patch.display_order = input.display_order;

  const { error } = await supabase.from("assets").update(patch).eq("id", input.id);
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

// ---- ASSET TYPES (the editable type list: Full Cage, Trackman, etc.) ----

export async function createAssetType(label: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("asset_types")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);
  const nextOrder =
    rows && rows.length > 0
      ? ((rows[0] as { display_order: number }).display_order ?? 0) + 10
      : 10;
  const { error } = await supabase
    .from("asset_types")
    .insert({ label: label.trim(), display_order: nextOrder, is_active: true });
  if (error) return { error: error.message };
  return { error: null };
}

export async function updateAssetType(
  id: string,
  label: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asset_types")
    .update({ label: label.trim() })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteAssetType(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asset_types")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

// ---- SERVICES ----

export async function createService(input: {
  code: string;
  name: string;
  category: string;
  base_rate_cents: number;
  unit: string;
  min_duration_hours: number;
}): Promise<ActionResult & { service?: Service }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      code: input.code,
      name: input.name,
      category: input.category,
      base_rate_cents: input.base_rate_cents,
      unit: input.unit,
      min_duration_hours: input.min_duration_hours,
      is_active: true,
    })
    .select(
      "id, code, name, category, base_rate_cents, peak_rate_cents, min_duration_hours, applies_to_asset_type"
    )
    .single();
  if (error) return { error: error.message };
  return { error: null, service: data as Service };
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
