"use server";

import { createClient } from "@/lib/supabase/server";
import { getSpaceCoverage } from "@/lib/data/resources";

export type DayBooking = {
  asset_id: string;
  start_time: string;
  end_time: string;
  half_slot: number | null;
};

export async function getDayBookings(date: string): Promise<{
  bookings: DayBooking[];
  coverage: Record<string, string[]>;
}> {
  const supabase = await createClient();

  const start = new Date(date + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [{ data }, coverage] = await Promise.all([
    supabase
      .from("bookings")
      .select("asset_id, start_time, end_time, half_slot")
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .not("status", "in", "(cancelled)"),
    getSpaceCoverage(),
  ]);

  return { bookings: (data as DayBooking[]) ?? [], coverage };
}
