"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

// Uses the migration 022 check_in_booking() function: sets checked_in_at,
// checked_in_by, check_in_method and moves confirmed -> in_progress.
export async function checkInBooking(
  bookingId: string,
  method: "staff" | "self" = "staff"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_booking", {
    p_booking_id: bookingId,
    p_method: method,
  });
  if (error) {
    // Fallback if the function signature differs: write columns directly.
    const { error: e2 } = await supabase
      .from("bookings")
      .update({
        checked_in_at: new Date().toISOString(),
        check_in_method: method,
        status: "in_progress",
      })
      .eq("id", bookingId);
    if (e2) return { error: e2.message };
  }
  return { error: null };
}

export async function undoCheckIn(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      checked_in_at: null,
      check_in_method: null,
      status: "confirmed",
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };
  return { error: null };
}
