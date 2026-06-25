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
  coach_name?: string | null;
  family_id: string | null;
  service_id: string | null;
  athlete_ids: string[];
  occurrences: Occurrence[];
  base_rate_cents: number;
  peak_premium_cents: number;
  total_cents: number;
  want_half: boolean;
  notes?: string | null;
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
            coach_name: input.coach_name ?? null,
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
            notes: input.notes ?? null,
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

export type SeriesInfo = {
  groupId: string | null;
  total: number;
  future: { id: string; start_time: string }[];
};

// Looks up whether a booking belongs to a recurring series, and lists the
// series members at or after this booking's start ("this and all future").
export async function getSeriesInfo(bookingId: string): Promise<SeriesInfo> {
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("recurrence_group_id, start_time")
    .eq("id", bookingId)
    .maybeSingle();
  const row = b as
    | { recurrence_group_id: string | null; start_time: string }
    | null;
  const groupId = row?.recurrence_group_id ?? null;
  const startTime = row?.start_time ?? null;
  if (!groupId) return { groupId: null, total: 1, future: [] };

  const { data: members } = await supabase
    .from("bookings")
    .select("id, start_time")
    .eq("recurrence_group_id", groupId)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });
  const all = (members as { id: string; start_time: string }[] | null) ?? [];
  const future = startTime ? all.filter((m) => m.start_time >= startTime) : all;
  return { groupId, total: all.length, future };
}

export type BookingUpdate = {
  id: string;
  asset_id?: string;
  coach_id?: string | null;
  service_id?: string | null;
  start_time?: string;
  end_time?: string;
};

// Applies per-booking patches one at a time, catching conflicts (a moved time
// or reassigned coach can collide) and reporting which were skipped.
export async function updateManyBookings(
  updates: BookingUpdate[]
): Promise<{
  updated: number;
  skipped: { id: string; reason: string }[];
  error: string | null;
}> {
  if (updates.length === 0) return { updated: 0, skipped: [], error: null };
  const supabase = await createClient();
  let updated = 0;
  const skipped: { id: string; reason: string }[] = [];

  for (const u of updates) {
    const patch: Record<string, unknown> = {};
    if (u.asset_id !== undefined) patch.asset_id = u.asset_id;
    if (u.coach_id !== undefined) patch.coach_id = u.coach_id;
    if (u.service_id !== undefined) patch.service_id = u.service_id;
    if (u.start_time !== undefined) patch.start_time = u.start_time;
    if (u.end_time !== undefined) patch.end_time = u.end_time;
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", u.id);
    if (error) {
      skipped.push({
        id: u.id,
        reason: isConflict(error.message)
          ? isCoachConflict(error.message)
            ? "coach busy"
            : "conflict"
          : error.message,
      });
      continue;
    }
    updated++;
  }
  return { updated, skipped, error: null };
}
