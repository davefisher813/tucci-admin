// Pure functions for the Space Value view. No DB, no React, fully testable.
// All money in cents. All times in facility-local minutes.

export type SpaceRate = {
  asset_id: string;
  name: string;
  type_key: string; // the asset's type (e.g. "cage_full")
  type_label: string; // human label for grouping (e.g. "Cages")
  rate_cents: number | null; // standard hourly rate, null if unpriced
  is_outdoor: boolean; // outdoor cages are seasonal
  is_aggregate: boolean; // turf / full-facility: valued as covered cages, not itself
};

export type DayHours = {
  day_of_week: number; // 0..6
  is_open: boolean;
  open_minute: number;
  close_minute: number;
};

export type BookingLite = {
  asset_id: string;
  start_time: string; // ISO UTC
  end_time: string; // ISO UTC
  status: string;
  total_cents: number | null;
  booking_type: string | null; // "blocked" etc.
};

export type ValueResult = {
  bookedCents: number;
  potentialCents: number;
  bookedHours: number;
  availableHours: number;
  utilizationPct: number; // blocked counted as unavailable
  utilizationSellablePct: number; // blocked counted as still sellable
  openGapsCents: number;
  bookingCount: number;
  byType: TypeBreakdown[];
  unpricedSpaces: string[]; // names of spaces with no rate, surfaced to UI
};

export type TypeBreakdown = {
  type_label: string;
  spaceCount: number;
  bookedCents: number;
  potentialCents: number;
  utilizationPct: number;
};

const EASTERN = "America/New_York";

// Eastern weekday (0=Sun) and minutes-from-midnight for an ISO timestamp.
function easternParts(iso: string): { dow: number; minute: number; ymd: string } {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wkMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dow = wkMap[get("weekday")] ?? 0;
  let hh = parseInt(get("hour"), 10);
  if (hh === 24) hh = 0; // some envs emit 24 for midnight
  const mm = parseInt(get("minute"), 10);
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  return { dow, minute: hh * 60 + mm, ymd };
}

// Outdoor cages count May..Sep (months 5..9), excluded Oct..Apr.
export function outdoorInSeason(monthIndex1to12: number): boolean {
  return monthIndex1to12 >= 5 && monthIndex1to12 <= 9;
}

// Hours of a booking that fall within a single day, clamped to that day's
// open window. Returns fractional hours.
function bookedHoursForBooking(b: BookingLite): number {
  const s = easternParts(b.start_time);
  const e = easternParts(b.end_time);
  // Same-day assumption for facility bookings; if a booking spans midnight,
  // clamp to end-of-its-start-day at 1440. (Facility hours never cross midnight.)
  const startMin = s.minute;
  let endMin = e.minute;
  if (e.ymd !== s.ymd) endMin = 1440;
  const mins = Math.max(0, endMin - startMin);
  return mins / 60;
}

function isCountedBooking(b: BookingLite): boolean {
  // Revenue + occupancy come from real bookings, not cancellations/no-shows.
  return b.status !== "cancelled" && b.status !== "no_show";
}

function isBlocked(b: BookingLite): boolean {
  return b.booking_type === "blocked";
}

// Available hours for one space across the date span, summing each day's
// open window. `days` is the weekly template; `dateList` is every calendar
// date in the period as {ymd, month}.
function availableHoursForSpace(
  space: SpaceRate,
  days: DayHours[],
  dateList: { dow: number; month: number }[]
): number {
  const byDow = new Map(days.map((d) => [d.day_of_week, d]));
  let hours = 0;
  for (const date of dateList) {
    // outdoor spaces drop out off-season
    if (space.is_outdoor && !outdoorInSeason(date.month)) continue;
    const d = byDow.get(date.dow);
    if (!d || !d.is_open) continue;
    hours += (d.close_minute - d.open_minute) / 60;
  }
  return hours;
}

// Main computation.
export function computeValue(
  spaces: SpaceRate[],
  bookings: BookingLite[],
  days: DayHours[],
  dateList: { dow: number; month: number }[]
): ValueResult {
  // Aggregate spaces (turf/full-facility) are NOT priced as themselves; their
  // empty-hour value is the sum of covered cages. For potential capacity we
  // therefore exclude aggregates from the per-space potential, since the cages
  // already represent that capacity. Their bookings still count as revenue.
  const pricedSpaces = spaces.filter((s) => !s.is_aggregate);

  const spaceById = new Map(spaces.map((s) => [s.asset_id, s]));
  const unpriced = new Set<string>();

  // ---- Potential (capacity) ----
  let potentialCents = 0;
  let availableHours = 0;
  const typeAgg = new Map<
    string,
    { spaceCount: number; potential: number; booked: number; availHrs: number; bookedHrs: number }
  >();

  for (const s of pricedSpaces) {
    const availHrs = availableHoursForSpace(s, days, dateList);
    availableHours += availHrs;
    if (s.rate_cents == null) {
      unpriced.add(s.name);
    } else {
      potentialCents += Math.round(s.rate_cents * availHrs);
    }
    const key = s.type_label;
    const cur = typeAgg.get(key) ?? {
      spaceCount: 0, potential: 0, booked: 0, availHrs: 0, bookedHrs: 0,
    };
    cur.spaceCount += 1;
    cur.availHrs += availHrs;
    if (s.rate_cents != null) cur.potential += Math.round(s.rate_cents * availHrs);
    typeAgg.set(key, cur);
  }

  // ---- Booked (revenue + occupancy) ----
  let bookedCents = 0;
  let bookedHours = 0;
  let blockedHours = 0;
  let bookingCount = 0;

  for (const b of bookings) {
    if (!isCountedBooking(b)) continue;
    const hrs = bookedHoursForBooking(b);
    const space = spaceById.get(b.asset_id);

    if (isBlocked(b)) {
      // Blocked time occupies the space but earns nothing.
      blockedHours += hrs;
      // attribute occupancy to its type if it's a priced space
      if (space && !space.is_aggregate) {
        const t = typeAgg.get(space.type_label);
        if (t) t.bookedHrs += hrs;
      }
      continue;
    }

    // Real revenue booking. Count its money once.
    bookedCents += b.total_cents ?? 0;
    bookingCount += 1;

    // Occupancy: count toward booked hours. Aggregate bookings (turf) are
    // counted as revenue but their HOURS map onto the covered cages via the
    // cage rows in the schedule fill; to avoid double counting occupancy we
    // only add hours for non-aggregate spaces here.
    if (space && !space.is_aggregate) {
      bookedHours += hrs;
      const t = typeAgg.get(space.type_label);
      if (t) {
        t.booked += b.total_cents ?? 0;
        t.bookedHrs += hrs;
      }
    } else if (!space || space.is_aggregate) {
      // aggregate or unknown space: still count its revenue (done above),
      // and count its hours so utilization reflects the facility being in use
      bookedHours += hrs;
    }
  }

  const utilizationPct =
    availableHours > 0
      ? Math.round(((bookedHours + blockedHours) / availableHours) * 100)
      : 0;
  const utilizationSellablePct =
    availableHours > 0 ? Math.round((bookedHours / availableHours) * 100) : 0;

  // Open gaps: potential value of the hours that are open but unsold.
  // Approximate as potential * (1 - sellable utilization), floored at 0.
  const openGapsCents = Math.max(
    0,
    Math.round(potentialCents * (1 - (availableHours > 0 ? bookedHours / availableHours : 0)))
  );

  const byType: TypeBreakdown[] = [...typeAgg.entries()].map(([label, v]) => ({
    type_label: label,
    spaceCount: v.spaceCount,
    bookedCents: v.booked,
    potentialCents: v.potential,
    utilizationPct: v.availHrs > 0 ? Math.round((v.bookedHrs / v.availHrs) * 100) : 0,
  }));

  return {
    bookedCents,
    potentialCents,
    bookedHours: Math.round(bookedHours * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
    utilizationPct,
    utilizationSellablePct,
    openGapsCents,
    bookingCount,
    byType,
    unpricedSpaces: [...unpriced],
  };
}

// Projection: current revenue/util plus N more booked space-hours at an
// average rate. Capped at available capacity.
export function projectAddedHours(
  base: ValueResult,
  addedHours: number,
  avgRateCents: number
): { revenueCents: number; utilizationPct: number } {
  const newBookedHours = Math.min(base.availableHours, base.bookedHours + addedHours);
  const actuallyAdded = newBookedHours - base.bookedHours;
  return {
    revenueCents: base.bookedCents + Math.round(actuallyAdded * avgRateCents),
    utilizationPct:
      base.availableHours > 0
        ? Math.round((newBookedHours / base.availableHours) * 100)
        : 0,
  };
}
