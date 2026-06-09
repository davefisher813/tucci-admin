"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

export async function checkInBooking(bookingId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_booking", {
    p_booking_id: bookingId,
    p_method: "staff",
  });
  if (error) {
    const { error: e2 } = await supabase
      .from("bookings")
      .update({
        checked_in_at: new Date().toISOString(),
        check_in_method: "staff",
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
