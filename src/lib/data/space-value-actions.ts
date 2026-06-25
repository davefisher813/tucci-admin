"use server";

import { createClient } from "@/lib/supabase/server";
import { getFacilityHours, getPeakWindow } from "@/lib/data/hours-actions";
import {
  computeValue,
  type SpaceRate,
  type BookingLite,
  type DayHours,
  type ValueResult,
} from "@/lib/data/space-value";

export type Period = "today" | "week" | "month" | "year" | "custom";

export type SpaceValuePayload = {
  result: ValueResult;
  avgRateCents: number; // for the projection slider
  peakStartMinute: number;
  peakEndMinute: number;
  rangeLabel: string;
  monthly?: { label: string; bookedCents: number }[]; // year view only
};

const EASTERN = "America/New_York";

// Map an asset's raw type field to a grouping label and flags.
// Live rows may carry either `asset_type` (string) or `asset_type_id` (uuid);
// we read whatever is present. type_key is the string we match services on.
function classify(typeKey: string): {
  label: string;
  is_outdoor: boolean;
  is_aggregate: boolean;
} {
  const k = (typeKey || "").toLowerCase();
  const is_outdoor = k.includes("outside") || k.includes("outdoor");
  const is_aggregate =
    k.includes("turf") || k.includes("facility") || k === "full_facility";
  let label = "Other";
  if (k.startsWith("cage")) label = "Cages";
  else if (k.includes("field")) label = "Fields";
  else if (k.includes("turf")) label = "Turf";
  else if (k.includes("facility")) label = "Facility";
  else if (k.includes("strength") || k.includes("gym")) label = "Gym";
  return { label, is_outdoor, is_aggregate };
}

// Build the list of calendar dates (Eastern weekday + month) in [startISO,endISO).
function buildDateList(
  start: Date,
  end: Date
): { dow: number; month: number }[] {
  const out: { dow: number; month: number }[] = [];
  const cur = new Date(start);
  // iterate by Eastern calendar day
  while (cur < end) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: EASTERN,
      weekday: "short",
      month: "2-digit",
    });
    const parts = fmt.formatToParts(cur);
    const wk = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const mo = parseInt(
      parts.find((p) => p.type === "month")?.value ?? "1",
      10
    );
    const wkMap: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    out.push({ dow: wkMap[wk] ?? 0, month: mo });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

// Compute UTC [start,end) for a period, anchored to Eastern calendar.
function periodRange(
  period: Period,
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; label: string } {
  const now = new Date();
  // Eastern "now" components
  const ep = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (t: string) => ep.find((p) => p.type === t)?.value ?? "";
  const y = parseInt(get("year"), 10);
  const m = parseInt(get("month"), 10);
  const d = parseInt(get("day"), 10);
  const wkMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = wkMap[get("weekday")] ?? 0;

  // Helper: midnight Eastern for a y/m/d, as a UTC Date.
  // Eastern is UTC-4 (EDT) or UTC-5 (EST). We approximate by constructing
  // the date at 05:00 UTC which is midnight EST / 01:00 EDT; for day-boundary
  // bucketing of facility bookings (never near midnight) this is safe.
  const mid = (yy: number, mm: number, dd: number) =>
    new Date(Date.UTC(yy, mm - 1, dd, 5, 0, 0));

  const monthName = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  if (period === "today") {
    const start = mid(y, m, d);
    const end = mid(y, m, d + 1);
    return { start, end, label: `${monthName[m - 1]} ${d}, ${y}` };
  }
  if (period === "week") {
    const start = mid(y, m, d - dow);
    const end = mid(y, m, d - dow + 7);
    const e = new Date(start);
    e.setUTCDate(e.getUTCDate() + 6);
    const eM = e.getUTCMonth();
    const eD = e.getUTCDate();
    return {
      start,
      end,
      label: `${monthName[m - 1].slice(0, 3)} ${d - dow} – ${monthName[eM].slice(0, 3)} ${eD}, ${y}`,
    };
  }
  if (period === "month") {
    const start = mid(y, m, 1);
    const end = mid(y, m + 1, 1);
    return { start, end, label: `${monthName[m - 1]} ${y}` };
  }
  if (period === "year") {
    const start = mid(y, 1, 1);
    const end = mid(y + 1, 1, 1);
    return { start, end, label: `${y}` };
  }
  // custom
  const cs = customStart ? new Date(customStart) : mid(y, m, d);
  const ce = customEnd ? new Date(customEnd) : mid(y, m, d + 1);
  return { start: cs, end: ce, label: "Custom range" };
}

export async function getSpaceValue(
  period: Period,
  customStart?: string,
  customEnd?: string
): Promise<SpaceValuePayload> {
  const supabase = await createClient();
  const { start, end, label } = periodRange(period, customStart, customEnd);

  // Fetch assets (read both possible type fields), services, hours, peak, bookings.
  const [assetsRes, servicesRes, hours, peak] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, asset_type, asset_type_id, is_active")
      .eq("is_active", true),
    supabase
      .from("services")
      .select(
        "base_rate_cents, peak_rate_cents, min_duration_hours, applies_to_asset_type, code"
      )
      .eq("is_active", true),
    getFacilityHours(),
    getPeakWindow(),
  ]);

  const assetsRaw =
    (assetsRes.data as {
      id: string;
      name: string;
      asset_type: string | null;
      asset_type_id: string | null;
    }[]) ?? [];

  const servicesRaw =
    (servicesRes.data as {
      base_rate_cents: number;
      peak_rate_cents: number | null;
      min_duration_hours: number | null;
      applies_to_asset_type: string | null;
      code: string;
    }[]) ?? [];

  // Best standard hourly rate per type_key: take the max base_rate among
  // services that apply to that type with a ~1hr unit, so a full cage reads
  // its full hourly rate rather than a 30-min block.
  const rateByType = new Map<string, number>();
  for (const s of servicesRaw) {
    const key = (s.applies_to_asset_type || "").toLowerCase();
    if (!key) continue;
    // prefer hourly-ish services (min_duration >= 1) but fall back to any
    const hourly = (s.min_duration_hours ?? 1) >= 1;
    const rate = s.base_rate_cents;
    const cur = rateByType.get(key);
    if (cur == null || (hourly && rate > cur)) {
      rateByType.set(key, rate);
    }
  }

  // Build SpaceRate[]
  const spaces: SpaceRate[] = assetsRaw.map((a) => {
    const typeKey = (a.asset_type || a.asset_type_id || "").toLowerCase();
    const { label, is_outdoor, is_aggregate } = classify(typeKey);
    const rate = rateByType.get(typeKey) ?? null;
    return {
      asset_id: a.id,
      name: a.name,
      type_key: typeKey,
      type_label: label,
      rate_cents: rate,
      is_outdoor,
      is_aggregate,
    };
  });

  // Bookings in range
  const { data: bRows } = await supabase
    .from("bookings")
    .select("asset_id, start_time, end_time, status, total_cents, booking_type")
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString());

  const bookings: BookingLite[] = (bRows as BookingLite[]) ?? [];

  const days: DayHours[] = hours.map((h) => ({
    day_of_week: h.day_of_week,
    is_open: h.is_open,
    open_minute: h.open_minute,
    close_minute: h.close_minute,
  }));

  const dateList = buildDateList(start, end);
  const result = computeValue(spaces, bookings, days, dateList);

  // Average rate for projection: mean of priced, non-aggregate space rates.
  const priced = spaces.filter((s) => !s.is_aggregate && s.rate_cents != null);
  const avgRateCents =
    priced.length > 0
      ? Math.round(
          priced.reduce((sum, s) => sum + (s.rate_cents ?? 0), 0) / priced.length
        )
      : 7500;

  // Year view: monthly booked revenue strip.
  let monthly: { label: string; bookedCents: number }[] | undefined;
  if (period === "year") {
    const mLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"];
    const sums = new Array(12).fill(0);
    for (const b of bookings) {
      if (b.status === "cancelled" || b.status === "no_show") continue;
      if (b.booking_type === "blocked") continue;
      const mo = new Intl.DateTimeFormat("en-US", {
        timeZone: EASTERN,
        month: "numeric",
      }).format(new Date(b.start_time));
      const idx = parseInt(mo, 10) - 1;
      if (idx >= 0 && idx < 12) sums[idx] += b.total_cents ?? 0;
    }
    monthly = sums.map((c, i) => ({ label: mLabels[i], bookedCents: c }));
  }

  return {
    result,
    avgRateCents,
    peakStartMinute: peak?.peak_start_minute ?? 960,
    peakEndMinute: peak?.peak_end_minute ?? 1200,
    rangeLabel: label,
    monthly,
  };
}
