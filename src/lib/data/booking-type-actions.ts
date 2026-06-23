"use server";

import { createClient } from "@/lib/supabase/server";

export type BookingType = {
  id: string;
  key: string;
  label: string;
  color: string;
  is_block: boolean;
  is_active: boolean;
  sort_order: number;
};

export async function getBookingTypes(): Promise<BookingType[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_types")
    .select("id, key, label, color, is_block, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  return (data as BookingType[] | null) ?? [];
}

function slugKey(label: string): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "type";
  return `${base}_${Date.now().toString().slice(-4)}`;
}

export async function createBookingType(input: {
  label: string;
  color: string;
  sort_order: number;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("booking_types").insert({
    key: slugKey(input.label),
    label: input.label.trim(),
    color: input.color,
    sort_order: input.sort_order,
  });
  return { error: error?.message ?? null };
}

export async function updateBookingType(
  id: string,
  patch: { label?: string; color?: string; sort_order?: number }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const upd: Record<string, unknown> = {};
  if (patch.label !== undefined) upd.label = patch.label.trim();
  if (patch.color !== undefined) upd.color = patch.color;
  if (patch.sort_order !== undefined) upd.sort_order = patch.sort_order;
  const { error } = await supabase
    .from("booking_types")
    .update(upd)
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function setBookingTypeActive(
  id: string,
  is_active: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("booking_types")
    .update({ is_active })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteBookingType(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: bt } = await supabase
    .from("booking_types")
    .select("key, is_block")
    .eq("id", id)
    .maybeSingle();
  const row = bt as { key: string; is_block: boolean } | null;
  if (row?.is_block) {
    return { error: "The Blocked type is built in and can't be removed." };
  }
  if (row?.key) {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_type", row.key)
      .neq("status", "cancelled");
    if ((count ?? 0) > 0) {
      return {
        error: `In use by ${count} booking(s). Turn it off instead of removing.`,
      };
    }
  }
  const { error } = await supabase
    .from("booking_types")
    .delete()
    .eq("id", id);
  return { error: error?.message ?? null };
}
