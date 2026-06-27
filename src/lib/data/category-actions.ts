"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

// Mirrors the live service_categories table.
export type ServiceCategory = {
  id: string;
  key: string | null;
  name: string;
  sort_order: number;
  color_hex: string | null;
  parent_id: string | null;
  is_active: boolean;
};

// All categories, active first by sort order. Read-only for dropdowns/report.
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_categories")
    .select("id, key, name, sort_order, color_hex, parent_id, is_active")
    .order("sort_order", { ascending: true });
  return (data as ServiceCategory[]) ?? [];
}

// Add a new category. Generates a stable key from the name if not given.
export async function createServiceCategory(input: {
  name: string;
  color_hex?: string | null;
  sort_order?: number;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  const supabase = await createClient();

  // derive a stable key (lowercase, underscores)
  const key = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);

  // place new categories at the end unless told otherwise
  let sort = input.sort_order;
  if (sort == null) {
    const { data: maxRow } = await supabase
      .from("service_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sort = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 10;
  }

  const { error } = await supabase.from("service_categories").insert({
    name,
    key,
    color_hex: input.color_hex ?? null,
    sort_order: sort,
    is_active: true,
  });
  if (error) return { error: error.message };
  return { error: null };
}

// Rename / recolor / reorder / toggle active. Renaming is safe: services
// reference category_id, so the link never breaks.
export async function updateServiceCategory(input: {
  id: string;
  name?: string;
  color_hex?: string | null;
  sort_order?: number;
  is_active?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) return { error: "Name cannot be empty." };
    patch.name = n;
  }
  if (input.color_hex !== undefined) patch.color_hex = input.color_hex;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { error } = await supabase
    .from("service_categories")
    .update(patch)
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { error: null };
}

// Delete a category. Guarded: refuses if any service still references it.
export async function deleteServiceCategory(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if ((count ?? 0) > 0) {
    return {
      error: `Can't delete: ${count} service${
        count === 1 ? "" : "s"
      } still use this category. Move them to another category first.`,
    };
  }

  const { error } = await supabase
    .from("service_categories")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
