import { createClient } from "@/lib/supabase/server";

export type Asset = {
  id: string;
  name: string;
  asset_type_id: string | null;
  description: string | null;
  features: string[] | null;
  is_splittable: boolean;
  display_order: number;
};

export type AssetType = {
  id: string;
  label: string;
  display_order: number;
};

export type Service = {
  id: string;
  code: string;
  name: string;
  category: string;
  base_rate_cents: number;
  peak_rate_cents: number | null;
  min_duration_hours: number;
  applies_to_asset_type: string | null;
};

export type Coach = { id: string; full_name: string };

export type FamilyLite = { id: string; family_name: string };

export type AthleteLite = {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
};

export async function getAssets(): Promise<Asset[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select(
      "id, name, asset_type_id, description, features, is_splittable, display_order"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data as Asset[]) ?? [];
}

export async function getAssetTypes(): Promise<AssetType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("asset_types")
    .select("id, label, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data as AssetType[]) ?? [];
}

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(
      "id, code, name, category, base_rate_cents, peak_rate_cents, min_duration_hours, applies_to_asset_type"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data as Service[]) ?? [];
}

export async function getCoaches(): Promise<Coach[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, role")
    .in("role", ["coach", "admin", "owner"])
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  return ((data as { id: string; full_name: string }[]) ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
  }));
}

export async function getFamilies(): Promise<FamilyLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("families")
    .select("id, family_name")
    .eq("is_active", true)
    .order("family_name", { ascending: true });
  return (data as FamilyLite[]) ?? [];
}

export async function getAthletes(): Promise<AthleteLite[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("athletes")
    .select("id, family_id, first_name, last_name")
    .eq("is_active", true)
    .order("last_name", { ascending: true });
  return (data as AthleteLite[]) ?? [];
}

// Coverage config: which cages each field/area sits over.
// Returns { parentAssetId: [childAssetId, ...] }.
export async function getSpaceCoverage(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("space_coverage")
    .select("parent_asset_id, child_asset_id");
  const map: Record<string, string[]> = {};
  for (const row of (data as
    | { parent_asset_id: string; child_asset_id: string }[]
    | null) ?? []) {
    (map[row.parent_asset_id] ??= []).push(row.child_asset_id);
  }
  return map;
}
