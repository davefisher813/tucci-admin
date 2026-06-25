"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export type FacilityDay = {
  day_of_week: number;
  is_open: boolean;
  open_minute: number;
  close_minute: number;
};

export type PeakWindow = {
  peak_start_minute: number;
  peak_end_minute: number;
};

export async function getFacilityHours(): Promise<FacilityDay[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("facility_hours")
    .select("day_of_week, is_open, open_minute, close_minute")
    .order("day_of_week", { ascending: true });
  return (data as FacilityDay[]) ?? [];
}

export async function getPeakWindow(): Promise<PeakWindow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("facility_peak_window")
    .select("peak_start_minute, peak_end_minute")
    .eq("id", 1)
    .maybeSingle();
  return (data as PeakWindow) ?? null;
}

export async function updateFacilityHours(
  days: FacilityDay[]
): Promise<ActionResult> {
  const supabase = await createClient();

  // Validate before writing so a bad row never reaches the DB.
  for (const d of days) {
    if (d.day_of_week < 0 || d.day_of_week > 6) {
      return { error: `Invalid day ${d.day_of_week}.` };
    }
    if (d.is_open && d.close_minute <= d.open_minute) {
      return {
        error: `Close time must be after open time (day ${d.day_of_week}).`,
      };
    }
  }

  // Upsert all seven rows in one call.
  const { error } = await supabase
    .from("facility_hours")
    .upsert(
      days.map((d) => ({
        day_of_week: d.day_of_week,
        is_open: d.is_open,
        open_minute: d.open_minute,
        close_minute: d.close_minute,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "day_of_week" }
    );

  if (error) return { error: error.message };
  return { error: null };
}

export async function updatePeakWindow(
  win: PeakWindow
): Promise<ActionResult> {
  if (win.peak_end_minute <= win.peak_start_minute) {
    return { error: "Peak end must be after peak start." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("facility_peak_window")
    .upsert(
      {
        id: 1,
        peak_start_minute: win.peak_start_minute,
        peak_end_minute: win.peak_end_minute,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  if (error) return { error: error.message };
  return { error: null };
}
