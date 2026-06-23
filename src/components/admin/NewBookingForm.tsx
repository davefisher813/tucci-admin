"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { moneyExact, ymd } from "@/lib/format";
import {
  createBulkBookings,
  type Occurrence,
  type BulkResult,
} from "@/lib/data/bulk-booking-actions";
import type {
  Asset,
  AthleteLite,
  Coach,
  FamilyLite,
  Service,
} from "@/lib/data/resources";
import FacilityMap from "@/components/admin/FacilityMap";
import {
  getDayBookings,
  type DayBooking,
} from "@/lib/data/availability-actions";
import type { BookingType } from "@/lib/data/booking-type-actions";

const WEEKDAYS = [
  ["Su", 0],
  ["Mo", 1],
  ["Tu", 2],
  ["We", 3],
  ["Th", 4],
  ["Fr", 5],
  ["Sa", 6],
] as const;

const DURATIONS = [0.5, 1, 1.5, 2, 3];

// "HH:MM" start-time options, 8:00 AM through 9:00 PM in half-hour steps.
const START_OPTIONS: { value: string; label: string }[] = [];
for (let h = 8; h <= 21; h++) {
  for (const m of [0, 30]) {
    if (h === 21 && m === 30) continue;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const disp = `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
    START_OPTIONS.push({ value: `${hh}:${mm}`, label: disp });
  }
}

function ymdLocal(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dateChipLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// All dates in [start, end] matching the frequency pattern.
function generateDates(
  start: string,
  end: string,
  repeat: string,
  weekdays: Set<number>
): string[] {
  if (repeat === "none") return [start];
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [];
  const out: string[] = [];
  const anchor = s.getTime();
  const cur = new Date(s);
  let guard = 0;
  while (cur <= e && guard < 1000) {
    guard++;
    const dow = cur.getDay();
    let include = false;
    if (repeat === "daily") include = true;
    else if (repeat === "weekly") include = weekdays.has(dow);
    else if (repeat === "biweekly") {
      if (weekdays.has(dow)) {
        const weeks = Math.floor((cur.getTime() - anchor) / (7 * 86400000));
        include = weeks % 2 === 0;
      }
    }
    if (include) out.push(ymdLocal(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export default function NewBookingForm({
  assets,
  services,
  coaches,
  families,
  athletes,
  bookingTypes = [],
}: {
  assets: Asset[];
  services: Service[];
  coaches: Coach[];
  families: FamilyLite[];
  athletes: AthleteLite[];
  bookingTypes?: BookingType[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const today = ymd(new Date());
  const initialDate = params.get("date") ?? today;
  const initialAsset = params.get("asset") ?? "";
  const initialHalf = params.get("portion") === "half";
  const initialHour = params.get("hour");

  const assetName = useMemo(
    () => new Map(assets.map((a) => [a.id, a.name])),
    [assets]
  );

  const usableTypes = bookingTypes.filter((t) => t.is_active && !t.is_block);
  const [bookingType, setBookingType] = useState(
    usableTypes[0]?.key ?? "lesson"
  );
  const [assetIds, setAssetIds] = useState<Set<string>>(
    new Set(initialAsset ? [initialAsset] : [])
  );
  const initialService = params.get("service");
  const [serviceId, setServiceId] = useState(
    initialService && services.some((s) => s.id === initialService)
      ? initialService
      : services[0]?.id ?? ""
  );
  const [coachId, setCoachId] = useState(params.get("coach") ?? "");
  const [familyId, setFamilyId] = useState("");
  const [athleteIds, setAthleteIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [repeat, setRepeat] = useState<
    "none" | "manual" | "daily" | "weekly" | "biweekly"
  >("none");
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [manualDates, setManualDates] = useState<Set<string>>(new Set());

  const [startTime, setStartTime] = useState(
    initialHour
      ? `${String(Number(initialHour)).padStart(2, "0")}:00`
      : "16:00"
  );
  const initialDur = params.get("dur");
  const [durationHours, setDurationHours] = useState(
    initialDur ? Number(initialDur) : 1
  );
  const [wantHalf, setWantHalf] = useState(initialHalf);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [addAnother, setAddAnother] = useState(false);

  const [dayBookings, setDayBookings] = useState<DayBooking[]>([]);
  const [coverage, setCoverage] = useState<Record<string, string[]>>({});

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );
  const minDuration = service?.min_duration_hours ?? 0.5;

  const familyAthletes = useMemo(
    () => athletes.filter((a) => a.family_id === familyId),
    [athletes, familyId]
  );

  const baseCents = service?.base_rate_cents ?? 0;
  const totalPerBooking = Math.round(baseCents * durationHours);

  const selectedAssets = assets.filter((a) => assetIds.has(a.id));
  const onlySplittable =
    selectedAssets.length === 1 && (selectedAssets[0]?.is_splittable ?? false);

  // Keep duration at or above the service minimum.
  useEffect(() => {
    if (durationHours < minDuration) setDurationHours(minDuration);
  }, [minDuration, durationHours]);

  // Default repeat weekdays to the start date's weekday.
  useEffect(() => {
    if (
      (repeat === "weekly" || repeat === "biweekly") &&
      weekdays.size === 0
    ) {
      setWeekdays(new Set([new Date(`${startDate}T00:00:00`).getDay()]));
    }
  }, [repeat, weekdays, startDate]);

  // Keep end date on or after start date.
  useEffect(() => {
    if (endDate < startDate) setEndDate(startDate);
  }, [startDate, endDate]);

  // Load the day's bookings (for single-date availability greying) and the
  // space-coverage map (parent field/turf/facility -> child cages), used to
  // light up the covered cages on the map. Availability greying only applies
  // to single dates; ranges are conflict-checked at creation time.
  useEffect(() => {
    let active = true;
    getDayBookings(startDate).then((res) => {
      if (!active) return;
      setDayBookings(res.bookings);
      setCoverage(res.coverage);
    });
    return () => {
      active = false;
    };
  }, [startDate]);

  const [sh, sm] = startTime.split(":").map(Number);

  const unavailable = useMemo(() => {
    if (repeat !== "none") return new Set<string>();
    const winStart = new Date(`${startDate}T00:00:00`);
    winStart.setHours(sh, sm, 0, 0);
    const winEnd = new Date(winStart.getTime() + durationHours * 3600 * 1000);
    const overlapping = dayBookings.filter((b) => {
      const bs = new Date(b.start_time).getTime();
      const be = new Date(b.end_time).getTime();
      return bs < winEnd.getTime() && be > winStart.getTime();
    });

    const wholeSet = new Set<string>();
    const halfMap = new Map<string, Set<number>>();
    const occupied = new Set<string>();
    for (const b of overlapping) {
      occupied.add(b.asset_id);
      if (b.half_slot == null) wholeSet.add(b.asset_id);
      else {
        const hs = halfMap.get(b.asset_id) ?? new Set<number>();
        hs.add(b.half_slot);
        halfMap.set(b.asset_id, hs);
      }
    }

    const out = new Set<string>();
    for (const a of assets) {
      const halves = halfMap.get(a.id);
      const selfFull =
        wholeSet.has(a.id) || (!!halves && halves.has(1) && halves.has(2));
      let coveredByField = false;
      for (const [field, cages] of Object.entries(coverage)) {
        if (cages.includes(a.id) && occupied.has(field)) coveredByField = true;
      }
      let fieldWithCage = false;
      const myCages = coverage[a.id];
      if (myCages) for (const c of myCages) if (occupied.has(c)) fieldWithCage = true;
      if (selfFull || coveredByField || fieldWithCage) out.add(a.id);
    }
    return out;
  }, [dayBookings, coverage, startDate, sh, sm, durationHours, assets, repeat]);

  // What the map highlights: the selected assets, plus the child cages of any
  // selected parent (Field 1, Field 2, Full Turf, Full Facility), so picking a
  // field lights up every cage it covers.
  const mapSelected = useMemo(() => {
    const out = new Set<string>(assetIds);
    for (const id of assetIds) {
      const kids = coverage[id];
      if (kids) for (const k of kids) out.add(k);
    }
    return out;
  }, [assetIds, coverage]);

  const generated = useMemo(() => {
    if (repeat === "manual") return [...manualDates].sort();
    return generateDates(
      startDate,
      repeat === "none" ? startDate : endDate,
      repeat,
      weekdays
    );
  }, [startDate, endDate, repeat, weekdays, manualDates]);
  const includedDates =
    repeat === "manual" ? generated : generated.filter((d) => !excluded.has(d));
