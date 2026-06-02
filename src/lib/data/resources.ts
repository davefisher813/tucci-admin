import { createClient } from "@/lib/supabase/server";

export type Asset = {
  id: string;
  name: string;
  asset_type: string;
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
    .select("id, name, asset_type, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data as Asset[]) ?? [];
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
  // Coaches are users who coach: role in coach/admin/owner.
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
