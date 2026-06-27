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
  family_id?: string | null;
  booking_type?: string | null;
  notes?: string | null;
  status?: string;
  total_cents?: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    asset_id: input.asset_id,
    coach_id: input.coach_id,
    service_id: input.service_id,
    start_time: input.start_time,
    end_time: input.end_time,
  };
  if (input.family_id !== undefined) patch.family_id = input.family_id;
  if (input.booking_type !== undefined) patch.booking_type = input.booking_type;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== undefined) patch.status = input.status;
  if (input.total_cents !== undefined) patch.total_cents = input.total_cents;
  const { error } = await supabase
    .from("bookings")
    .update(patch)
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
  want_half: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();

  const isConflict = (msg: string) => /23p01|overlap|exclude/i.test(msg);

  // Whole booking uses a null slot. A half tries slot 1, then slot 2, taking
  // whichever side is open. The DB conflict check is the source of truth.
  const candidates: (number | null)[] = input.want_half ? [1, 2] : [null];
  let bookingId: string | null = null;
  let lastErr = "";

  for (const slot of candidates) {
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
        half_slot: slot,
        source: "admin",
      })
      .select("id")
      .single();

    if (!error) {
      bookingId = (data as { id: string }).id;
      break;
    }
    lastErr = error.message;
    const moreToTry = slot !== candidates[candidates.length - 1];
    if (!(isConflict(error.message) && moreToTry)) break;
  }

  if (!bookingId) {
    if (input.want_half && isConflict(lastErr)) {
      return { error: "Both halves of that cage are booked for that time." };
    }
    return { error: mapDbError(lastErr) };
  }

  const id = bookingId;

  // Link athletes (group lessons allow multiple).
  if (input.athlete_ids.length > 0) {
    const rows = input.athlete_ids.map((athlete_id) => ({
      booking_id: id,
      athlete_id,
    }));
    const { error: linkErr } = await supabase
      .from("booking_athletes")
      .insert(rows);
    if (linkErr) return { error: linkErr.message, id };
  }

  return { error: null, id };
}
