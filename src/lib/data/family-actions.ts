"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; id?: string };

export async function createFamily(input: {
  family_name: string;
  primary_email: string | null;
  primary_phone: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("families")
    .insert({
      family_name: input.family_name,
      primary_email: input.primary_email,
      primary_phone: input.primary_phone,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { error: null, id: (data as { id: string }).id };
}

export async function updateFamily(input: {
  id: string;
  family_name: string;
  primary_email: string | null;
  primary_phone: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({
      family_name: input.family_name,
      primary_email: input.primary_email,
      primary_phone: input.primary_phone,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function deleteFamily(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function createAthlete(input: {
  family_id: string;
  first_name: string;
  last_name: string;
  position: string;
}): Promise<ActionResult & { athlete?: { id: string; family_id: string; first_name: string; last_name: string } }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("athletes")
    .insert({
      family_id: input.family_id,
      first_name: input.first_name,
      last_name: input.last_name,
      position: input.position,
      is_active: true,
    })
    .select("id, family_id, first_name, last_name")
    .single();
  if (error) return { error: error.message };
  return {
    error: null,
    athlete: data as {
      id: string;
      family_id: string;
      first_name: string;
      last_name: string;
    },
  };
}

export async function deleteAthlete(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("athletes")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { error: error.message };
  return { error: null };
}
