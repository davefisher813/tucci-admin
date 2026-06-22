"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

export type Occurrence = { start_time: string; end_time: string };

export type BulkSkip = {
  start_time: string;
  asset_id: string;
  reason: string;
};

export type BulkResult = {
  groupId: string | null;
  created: number;
  skipped: BulkSkip[];
  warnings: string[];
  error: string | null;
};

const isConflict = (m: string) => /23p01|overlap|exclude/i.test(m);
const isCoachConflict = (m: string) => /coach/i.test(m);

// Creates one booking per (space x date). All bookings from a single multi-row
// request share a recurrence_group_id so the series can be managed together.
// Conflicts and past dates are skipped and reported, never silently dropped.
export async function createBulkBookings(input: {
  booking_type: string;
  asset_ids: string[];
  coach_id: string | null;
  family_id: string | null;
  service_id: string | null;
  athlete_ids: string[];
  occurrences: Occurrence[];
  base_rate_cents: number;
  peak_premium_cents: number;
  total_cents: number;
  want_half: boolean;
}): Promise<BulkResult> {
  const supabase = await createClient();

  if (input.asset_ids.length === 0) {
    return {
      groupId: null,
      created: 0,
      skipped: [],
      warnings: [],
      error: "Pick at least one space.",
    };
  }
  if (input.occurrences.length === 0) {
    return {
      groupId: null,
      created: 0,
      skipped: [],
      warnings: [],
      error: "No dates to book.",
    };
  }

  const totalPlanned = input.asset_ids.length * input.occurrences.length;
  const groupId = totalPlanned > 1 ? randomUUID() : null;
  const nowMs = Date.now();

  const skipped: BulkSkip[] = [];
  const warnings: string[] = [];
  let created = 0;

  for (const asset_id of input.asset_ids) {
    for (const occ of input.occurrences) {
      if (new Date(occ.start_time).getTime() < nowMs) {
        skipped.push({
          start_time: occ.start_time,
          asset_id,
          reason: "in the past",
        });
        continue;
      }

      // Whole booking uses a null slot; a half tries slot 1 then slot 2.
      const candidates: (number | null)[] = input.want_half ? [1, 2] : [null];
      let bookingId: string | null = null;
      let lastErr = "";

      for (const slot of candidates) {
        const { data, error } = await supabase
          .from("bookings")
          .insert({
            booking_type: input.booking_type,
            status: "confirmed",
            asset_id,
            coach_id: input.coach_id,
            family_id: input.family_id,
            service_id: input.service_id,
            start_time: occ.start_time,
            end_time: occ.end_time,
            base_rate_cents: input.base_rate_cents,
            peak_premium_cents: input.peak_premium_cents,
            total_cents: input.total_cents,
            half_slot: slot,
            source: "admin",
            recurrence_group_id: groupId,
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
        const reason = isConflict(lastErr)
          ? isCoachConflict(lastErr)
            ? "coach busy"
            : input.want_half
            ? "both halves booked"
            : "space booked"
          : lastErr;
        skipped.push({ start_time: occ.start_time, asset_id, reason });
        continue;
      }

      created++;

      if (input.athlete_ids.length > 0) {
        const rows = input.athlete_ids.map((athlete_id) => ({
          booking_id: bookingId as string,
          athlete_id,
        }));
        const { error: linkErr } = await supabase
          .from("booking_athletes")
          .insert(rows);
        if (linkErr) {
          warnings.push(
            `Athletes were not linked for one booking: ${linkErr.message}`
          );
        }
      }
    }
  }

  return { groupId, created, skipped, warnings, error: null };
}

// Soft-cancels a set of bookings by id. Returns how many were actually changed
// (already-cancelled ones are left alone).
export async function cancelManyBookings(
  ids: string[]
): Promise<{ cancelled: number; error: string | null }> {
  if (ids.length === 0) return { cancelled: 0, error: null };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .in("id", ids)
    .neq("status", "cancelled")
    .select("id");
  if (error) return { cancelled: 0, error: error.message };
  return { cancelled: (data ?? []).length, error: null };
}

// Soft-cancels every booking in a recurring series. With fromTime, only cancels
// bookings starting at or after that time ("this and all future").
export async function cancelSeries(
  groupId: string,
  fromTime?: string
): Promise<{ cancelled: number; error: string | null }> {
  const supabase = await createClient();
  let q = supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("recurrence_group_id", groupId)
    .neq("status", "cancelled");
  if (fromTime) q = q.gte("start_time", fromTime);
  const { data, error } = await q.select("id");
  if (error) return { cancelled: 0, error: error.message };
  return { cancelled: (data ?? []).length, error: null };
}
