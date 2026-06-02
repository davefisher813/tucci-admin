"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null; id?: string };

// Maps Postgres EXCLUDE-constraint violations to readable messages.
function mapDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("bookings_no_overlap")) {
    return "That space is already booked for this time. Pick another space or time.";
  }
  if (m.includes("no_overlap") || m.includes("exclude")) {
    return "That coach is already booked for this time. Pick another coach or time.";
  }
  if (m.includes("bookings_time_valid")) {
    return "End time must be after start time.";
  }
  return message;
}

export async function updateBooking(input: {
  id: string;
  asset_id: string;
  coach_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      asset_id: input.asset_id,
      coach_id: input.coach_id,
      service_id: input.service_id,
      start_time: input.start_time,
      end_time: input.end_time,
    })
    .eq("id", input.id);

  if (error) return { error: mapDbError(error.message) };
  return { error: null };
}

export async function cancelBooking(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: mapDbError(error.message) };
  return { error: null };
}

export async function createBooking(input: {
  booking_type: string;
  asset_id: string;
  coach_id: string | null;
  family_id: string | null;
  service_id: string | null;
  athlete_ids: string[];
  start_time: string;
  end_time: string;
  base_rate_cents: number;
  peak_premium_cents: number;
  total_cents: number;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      booking_type: input.booking_type,
      status: "confirmed",
      asset_id: input.asset_id,
      coach_id: input.coach_id,
      family_id: input.family_id,
      service_id: input.service_id,
      start_time: input.start_time,
      end_time: input.end_time,
      base_rate_cents: input.base_rate_cents,
      peak_premium_cents: input.peak_premium_cents,
      total_cents: input.total_cents,
      source: "admin",
    })
    .select("id")
    .single();

  if (error) return { error: mapDbError(error.message) };

  const bookingId = (data as { id: string }).id;

  // Link athletes (group lessons allow multiple).
  if (input.athlete_ids.length > 0) {
    const rows = input.athlete_ids.map((athlete_id) => ({
      booking_id: bookingId,
      athlete_id,
    }));
    const { error: linkErr } = await supabase
      .from("booking_athletes")
      .insert(rows);
    if (linkErr) return { error: linkErr.message, id: bookingId };
  }

  return { error: null, id: bookingId };
}
