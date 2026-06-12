"use server";

import { createClient } from "@/lib/supabase/server";

export type PayrollRow = {
  coachId: string;
  coachName: string;
  sessions: number;
  hours: number;
  grossCents: number;
  missingRate: boolean;
};

export type PayrollResult = {
  rows: PayrollRow[];
  totalSessions: number;
  totalHours: number;
  totalGrossCents: number;
};

function bounds(from: string, to: string) {
  const lower = new Date(`${from}T00:00:00`).toISOString();
  const upperD = new Date(`${to}T00:00:00`);
  upperD.setDate(upperD.getDate() + 1);
  const upper = upperD.toISOString();
  return { lower, upper };
}

// Coach pay is owed for sessions they actually worked; exclude cancellations.
const EXCLUDED_STATUSES = ["cancelled", "no_show"];

export async function getPayroll(
  from: string,
  to: string
): Promise<PayrollResult> {
  const supabase = await createClient();
  const { lower, upper } = bounds(from, to);

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("coach_id, start_time, end_time, coach_pay_rate_cents, status")
    .gte("start_time", lower)
    .lt("start_time", upper)
    .not("coach_id", "is", null);

  const bookings =
    (bookingRows as {
      coach_id: string;
      start_time: string;
      end_time: string;
      coach_pay_rate_cents: number | null;
      status: string;
    }[]) ?? [];

  const { data: userRows } = await supabase
    .from("users")
    .select("id, full_name");

  const nameById = new Map(
    ((userRows as { id: string; full_name: string }[]) ?? []).map((u) => [
      u.id,
      u.full_name,
    ])
  );

  const agg = new Map<
    string,
    { sessions: number; hours: number; grossCents: number; missingRate: boolean }
  >();

  for (const b of bookings) {
    if (EXCLUDED_STATUSES.includes(b.status)) continue;
    const ms =
      new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
    const hours = ms > 0 ? ms / 3_600_000 : 0;
    const rate = b.coach_pay_rate_cents;
    const gross = rate != null ? Math.round(rate * hours) : 0;

    const row =
      agg.get(b.coach_id) ?? {
        sessions: 0,
        hours: 0,
        grossCents: 0,
        missingRate: false,
      };
    row.sessions += 1;
    row.hours += hours;
    row.grossCents += gross;
    if (rate == null) row.missingRate = true;
    agg.set(b.coach_id, row);
  }

  const rows: PayrollRow[] = Array.from(agg.entries())
    .map(([coachId, v]) => ({
      coachId,
      coachName: nameById.get(coachId) ?? "Unknown",
      sessions: v.sessions,
      hours: Math.round(v.hours * 100) / 100,
      grossCents: v.grossCents,
      missingRate: v.missingRate,
    }))
    .sort((a, b) => b.grossCents - a.grossCents);

  return {
    rows,
    totalSessions: rows.reduce((s, r) => s + r.sessions, 0),
    totalHours: Math.round(rows.reduce((s, r) => s + r.hours, 0) * 100) / 100,
    totalGrossCents: rows.reduce((s, r) => s + r.grossCents, 0),
  };
}
