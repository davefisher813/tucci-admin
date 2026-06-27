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
import {
  createBookingType,
  type BookingType,
} from "@/lib/data/booking-type-actions";
import { createService } from "@/lib/data/settings-actions";
import { createFamily, createAthlete } from "@/lib/data/family-actions";
import { createCoachWithLogin } from "@/lib/data/coach-actions";

const WEEKDAYS = [
  ["Su", 0],
  ["Mo", 1],
  ["Tu", 2],
  ["We", 3],
  ["Th", 4],
  ["Fr", 5],
  ["Sa", 6],
] as const;

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

// End-time options: 8:30 AM through 10:00 PM in half-hour steps.
const END_OPTIONS: { value: string; label: string }[] = [];
for (let h = 8; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 8 && m === 0) continue;
    if (h === 22 && m === 30) continue;
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    const disp = `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h >= 12 ? "PM" : "AM"}`;
    END_OPTIONS.push({ value: `${hh}:${mm}`, label: disp });
  }
}
function hmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}
function minToHm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
  services: servicesInit,
  coaches: coachesInit,
  families: familiesInit,
  athletes: athletesInit,
  bookingTypes: bookingTypesInit = [],
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

  // Lists are stateful so "+ New" can append inline-created items.
  const [services, setServices] = useState<Service[]>(servicesInit);
  const [coaches, setCoaches] = useState<Coach[]>(coachesInit);
  const [families, setFamilies] = useState<FamilyLite[]>(familiesInit);
  const [athletes, setAthletes] = useState<AthleteLite[]>(athletesInit);
  const [bookingTypes, setBookingTypes] =
    useState<BookingType[]>(bookingTypesInit);

  const today = ymd(new Date());
  const initialDate = params.get("date") ?? today;
  const initialAsset = params.get("asset") ?? "";
  const initialAssets = (params.get("assets") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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
    new Set(
      initialAssets.length
        ? initialAssets
        : initialAsset
        ? [initialAsset]
        : []
    )
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

  // Inline "+ New" panels
  const [addPanel, setAddPanel] = useState
    "" | "type" | "service" | "family" | "coach"
  >("");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [ntLabel, setNtLabel] = useState("");
  const [ntColor, setNtColor] = useState("#7DC4E8");
  const [nsName, setNsName] = useState("");
  const [nsPrice, setNsPrice] = useState("");
  const [nsUnit, setNsUnit] = useState("/hr");
  const [nsMin, setNsMin] = useState("1");
  const [ncName, setNcName] = useState("");
  const [ncEmail, setNcEmail] = useState("");
  const [ncLogin, setNcLogin] = useState(false);
  const [nfName, setNfName] = useState("");
  const [nfType, setNfType] = useState<"family" | "organization" | "team">(
    "family"
  );
  const [nfSport, setNfSport] = useState("");
  const [nfPoc, setNfPoc] = useState("");
  const [nfNotes, setNfNotes] = useState("");
  const [nfEmail, setNfEmail] = useState("");
  const [nfPhone, setNfPhone] = useState("");
  const [nfAths, setNfAths] = useState<{ first: string; last: string }[]>([
    { first: "", last: "" },
  ]);

  function openPanel(p: "type" | "service" | "family" | "coach") {
    setAddErr(null);
    setAddPanel((cur) => (cur === p ? "" : p));
  }

  async function saveNewType() {
    if (!ntLabel.trim()) return setAddErr("Name the type.");
    setAddBusy(true);
    setAddErr(null);
    const res = await createBookingType({
      label: ntLabel.trim(),
      color: ntColor,
      sort_order: 100,
    });
    setAddBusy(false);
    if (res.error || !res.bookingType)
      return setAddErr(res.error ?? "Could not add.");
    setBookingTypes((p) => [...p, res.bookingType!]);
    setBookingType(res.bookingType.key);
    setNtLabel("");
    setAddPanel("");
  }

  async function saveNewService() {
    const price = Math.round(parseFloat(nsPrice) * 100);
    if (!nsName.trim()) return setAddErr("Name the service.");
    if (!Number.isFinite(price) || price < 0)
      return setAddErr("Enter a valid price.");
    const min = parseFloat(nsMin) || 1;
    const code =
      nsName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString().slice(-4);
    setAddBusy(true);
    setAddErr(null);
    const res = await createService({
      code,
      name: nsName.trim(),
      category: "Custom",
      base_rate_cents: price,
      unit: nsUnit,
      min_duration_hours: min,
    });
    setAddBusy(false);
    if (res.error || !res.service)
      return setAddErr(res.error ?? "Could not add.");
    setServices((p) => [...p, res.service!]);
    setServiceId(res.service.id);
    setNsName("");
    setNsPrice("");
    setAddPanel("");
  }

  async function saveNewFamily() {
    const nameLabel =
      nfType === "organization"
        ? "Organization name"
        : nfType === "team"
        ? "Team name"
        : "Family name";
    if (!nfName.trim()) return setAddErr(`${nameLabel} is required.`);
    setAddBusy(true);
    setAddErr(null);
    const res = await createFamily({
      family_name: nfName.trim(),
      primary_email: nfEmail.trim() || null,
      primary_phone: nfPhone.trim() || null,
      client_type: nfType,
      sport: nfSport.trim() || null,
      point_of_contact: nfPoc.trim() || null,
      notes: nfNotes.trim() || null,
    });
    if (res.error || !res.id) {
      setAddBusy(false);
      return setAddErr(res.error ?? "Could not add client.");
    }
    const fid = res.id;
    const newAths: AthleteLite[] = [];
    // Organizations have no roster of their own athletes.
    if (nfType !== "organization") {
      for (const a of nfAths.filter((x) => x.first.trim() && x.last.trim())) {
        const ar = await createAthlete({
          family_id: fid,
          first_name: a.first.trim(),
          last_name: a.last.trim(),
          position: "unknown",
        });
        if (ar.athlete) newAths.push(ar.athlete);
      }
    }
    setAddBusy(false);
    setFamilies((p) => [...p, { id: fid, family_name: nfName.trim() }]);
    if (newAths.length) setAthletes((p) => [...p, ...newAths]);
    setFamilyId(fid);
    setAthleteIds([]);
    setNfName("");
    setNfType("family");
    setNfSport("");
    setNfPoc("");
    setNfNotes("");
    setNfEmail("");
    setNfPhone("");
    setNfAths([{ first: "", last: "" }]);
    setAddPanel("");
  }

  async function saveNewCoach() {
    if (!ncName.trim()) return setAddErr("Name the coach.");
    if (ncLogin) {
      setAddBusy(true);
      setAddErr(null);
      const res = await createCoachWithLogin({
        name: ncName.trim(),
        email: ncEmail.trim(),
      });
      setAddBusy(false);
      if (res.error || !res.coach)
        return setAddErr(res.error ?? "Could not add coach.");
      setCoaches((p) => [...p, res.coach!]);
      setCoachId(res.coach.id);
    } else {
      const id = "name:" + ncName.trim();
      setCoaches((p) =>
        p.some((c) => c.id === id)
          ? p
          : [...p, { id, full_name: ncName.trim() }]
      );
      setCoachId(id);
    }
    setNcName("");
    setNcEmail("");
    setNcLogin(false);
    setAddPanel("");
  }

  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [repeat, setRepeat] = useState
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
  const [blockMode, setBlockMode] = useState(params.get("block") === "1");
  const [blockLabel, setBlockLabel] = useState("");
  const [blockNotes, setBlockNotes] = useState("");

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
  const count = assetIds.size * includedDates.length;
  const grandTotal = count * totalPerBooking;

  function toggleAsset(id: string) {
    setResult(null);
    setAssetIds((prev) => {
      const next = new Set(prev);
      const isParent = Boolean(coverage[id]);

      if (isParent) {
        // Field / turf / facility: select it as one space, drop any of its
        // cages that were individually selected. Deselect just removes it.
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          for (const child of coverage[id]) next.delete(child);
        }
        if (next.size !== 1) setWantHalf(false);
        return next;
      }

      // A cage: if it's covered by a currently-selected field, "open up" that
      // field into its individual cages (minus this one) so cages are editable.
      const parentSel = Object.keys(coverage).find(
        (p) => prev.has(p) && coverage[p].includes(id)
      );
      if (parentSel && !prev.has(id)) {
        next.delete(parentSel);
        for (const child of coverage[parentSel]) {
          if (child !== id) next.add(child);
        }
        if (next.size !== 1) setWantHalf(false);
        return next;
      }

      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size !== 1) setWantHalf(false);
      return next;
    });
  }
  function toggleWeekday(d: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }
  function toggleExcluded(date: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }
  function addManualDate() {
    setResult(null);
    setManualDates((prev) => new Set(prev).add(startDate));
  }
  function removeManualDate(date: string) {
    setManualDates((prev) => {
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
  }
  function toggleAthlete(id: string) {
    setAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    setErr(null);
    setResult(null);
    if (assetIds.size === 0) return setErr("Pick at least one space.");
    if (!blockMode && !serviceId) return setErr("Pick a service.");
    if (includedDates.length === 0) return setErr("No dates selected.");
    if (!blockMode && durationHours < minDuration)
      return setErr(`This service needs at least ${minDuration} hr.`);

    const occurrences: Occurrence[] = includedDates.map((date) => {
      const start = new Date(`${date}T00:00:00`);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(start.getTime() + durationHours * 3600 * 1000);
      return { start_time: start.toISOString(), end_time: end.toISOString() };
    });

    setBusy(true);
    const res = await createBulkBookings({
      booking_type: blockMode ? "blocked" : bookingType,
      asset_ids: [...assetIds],
      coach_id:
        blockMode || coachId.startsWith("name:") ? null : coachId || null,
      coach_name:
        !blockMode && coachId.startsWith("name:")
          ? coachId.slice(5)
          : null,
      family_id: blockMode ? null : familyId || null,
      service_id: blockMode ? null : serviceId || null,
      athlete_ids: blockMode ? [] : athleteIds,
      occurrences,
      base_rate_cents: blockMode ? 0 : baseCents,
      peak_premium_cents: 0,
      total_cents: blockMode ? 0 : totalPerBooking,
      want_half: onlySplittable && wantHalf,
      notes: blockMode
        ? [blockLabel.trim(), blockNotes.trim()].filter(Boolean).join(" — ") ||
          null
        : null,
    });
    setBusy(false);

    if (res.error) {
      setErr(res.error);
      return;
    }
    setResult(res);
    if (res.created > 0 && !addAnother) {
      router.push(`/schedule?date=${startDate}`);
    }
  }

  return (
    <div className="mx-auto max-w-[680px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      {result && (
        <div className="mb-4 rounded-[12px] border border-success/40 bg-success/[.08] px-4 py-3">
          <div className="font-display text-[14px] font-extrabold text-text">
            {blockMode ? "Blocked" : "Created"} {result.created}{" "}
            {blockMode ? "Slot" : "Booking"}
            {result.created === 1 ? "" : "s"}.
          </div>
          {result.skipped.length > 0 && (
            <div className="mt-1 text-[12.5px] text-muted">
              Skipped {result.skipped.length}:{" "}
              {result.skipped
                .slice(0, 6)
                .map(
                  (s) =>
                    `${assetName.get(s.asset_id) ?? "Space"} ${dateChipLabel(
                      s.start_time.slice(0, 10)
                    )} (${s.reason})`
                )
                .join(", ")}
              {result.skipped.length > 6 ? ", …" : ""}
            </div>
          )}
          {result.warnings.map((w, i) => (
            <div key={i} className="mt-1 text-[12px] text-muted">
              {w}
            </div>
          ))}
          <button
            onClick={() => router.push(`/schedule?date=${startDate}`)}
            className="mt-2 font-display text-[12px] font-extrabold text-accent underline"
          >
            View schedule
          </button>
        </div>
      )}

      <div className="mb-3 flex rounded-[12px] border border-line-2 bg-paper p-1">
        <button
          type="button"
          onClick={() => setBlockMode(false)}
          className={`flex-1 rounded-[9px] px-3 py-[9px] font-display text-[13px] font-extrabold tracking-[.02em] ${
            !blockMode ? "bg-ink text-white" : "text-muted"
          }`}
        >
          New Booking
        </button>
        <button
          type="button"
          onClick={() => setBlockMode(true)}
          className={`flex-1 rounded-[9px] px-3 py-[9px] font-display text-[13px] font-extrabold tracking-[.02em] ${
            blockMode ? "bg-ink text-white" : "text-muted"
          }`}
        >
          Block Off
        </button>
      </div>

      {blockMode && (
        <div className="mb-3 rounded-[10px] border border-line-2 bg-bg/50 px-4 py-[10px] text-[12.5px] text-muted">
          Blocks a space so nothing can be booked there. No client, coach, or
          charge. Use it for maintenance, closures, or holds.
        </div>
      )}

      <div className="space-y-5 rounded-[16px] border border-line bg-paper p-6">
        {/* WHERE */}
        <div>
          <SecHead>Where</SecHead>
          <p className="lab">Spaces (tap one or several)</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {assets.map((a) => {
              const on = assetIds.has(a.id);
              const blocked = unavailable.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={blocked}
                  onClick={() => toggleAsset(a.id)}
                  className={`rounded-full border px-3 py-[7px] font-display text-[12px] font-extrabold tracking-[.02em] ${
                    blocked
                      ? "border-line bg-bg text-muted line-through opacity-60"
                      : on
                      ? "border-[#B07F00] bg-gold text-ink"
                      : "border-line-2 bg-paper text-muted hover:border-accent"
                  }`}
                >
                  {a.name}
                </button>
              );
            })}
          </div>

          <FacilityMap
            assets={assets}
            selectedIds={mapSelected}
            unavailable={unavailable}
            onToggle={toggleAsset}
          />

          {onlySplittable && (
            <div className="nbk-size-toggle mt-3" role="group" aria-label="Lane size">
              <button
                type="button"
                onClick={() => setWantHalf(false)}
                className={`nbk-size-btn${!wantHalf ? " on" : ""}`}
              >
                Full Lane
              </button>
              <button
                type="button"
                onClick={() => setWantHalf(true)}
                className={`nbk-size-btn${wantHalf ? " on" : ""}`}
              >
                Half Lane
              </button>
            </div>
          )}
          <p className="hint">
            {assetIds.size === 0
              ? "No spaces selected."
              : `${[...assetIds].map((id) => assetName.get(id)).join(", ")}${
                  onlySplittable && wantHalf ? "  (half lane)" : ""
                }`}
          </p>
        </div>

        {/* WHEN */}
        <div className="border-t border-line pt-5">
          <SecHead>When</SecHead>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label={
                repeat === "none"
                  ? "Date"
                  : repeat === "manual"
                  ? "Add a Date"
                  : "Start Date"
              }
            >
              {repeat === "manual" ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    min={today}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setResult(null);
                    }}
                    className="sel flex-1"
                  />
                  <button
                    type="button"
                    onClick={addManualDate}
                    className="inline-flex h-10 items-center rounded-[9px] border border-accent bg-accent px-[14px] font-display text-[12px] font-extrabold tracking-[.03em] text-white"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <input
                  type="date"
                  min={today}
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setExcluded(new Set());
                    setResult(null);
                  }}
                  className="sel"
                />
              )}
            </Field>
            {repeat !== "none" && repeat !== "manual" && (
              <Field label="End Date">
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setExcluded(new Set());
                  }}
                  className="sel"
                />
              </Field>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Start">
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="sel"
              >
                {START_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="End">
              <select
                value={minToHm(hmToMin(startTime) + Math.round(durationHours * 60))}
                onChange={(e) => {
                  const dur = (hmToMin(e.target.value) - hmToMin(startTime)) / 60;
                  if (dur >= 0.5) setDurationHours(dur);
                }}
                className="sel"
              >
                {END_OPTIONS.filter(
                  (o) => hmToMin(o.value) > hmToMin(startTime)
                ).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <p className="lab" style={{ marginTop: 16 }}>
            Repeat
          </p>
          <div className="seg">
            {(["none", "manual", "daily", "weekly", "biweekly"] as const).map(
              (r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRepeat(r);
                    setExcluded(new Set());
                    setResult(null);
                    if (r === "manual" && manualDates.size === 0)
                      setManualDates(new Set([startDate]));
                  }}
                  className={`seg-btn${repeat === r ? " on" : ""}`}
                >
                  {r === "none"
                    ? "Once"
                    : r === "manual"
                    ? "Pick Dates"
                    : r === "daily"
                    ? "Daily"
                    : r === "weekly"
                    ? "Weekly"
                    : "Biweekly"}
                </button>
              )
            )}
          </div>

          {(repeat === "weekly" || repeat === "biweekly") && (
            <div className="mt-3">
              <p className="lab">On These Days</p>
              <div className="flex flex-wrap gap-[6px]">
                {WEEKDAYS.map(([lbl, d]) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleWeekday(d)}
                    className={`h-[36px] w-[40px] rounded-[8px] border font-display text-[12px] font-extrabold ${
                      weekdays.has(d)
                        ? "border-[#B07F00] bg-gold text-ink"
                        : "border-line-2 bg-paper text-muted hover:border-accent"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {repeat !== "none" && (
            <div className="mt-4">
              <p className="lab">
                Dates ({includedDates.length} selected
                {repeat !== "manual" && excluded.size > 0
                  ? `, ${excluded.size} skipped`
                  : ""}
                ) {repeat === "manual" ? "— tap to remove" : "— tap to skip"}
              </p>
              {generated.length === 0 ? (
                <p className="hint">
                  {repeat === "manual"
                    ? "Pick a date above and tap Add."
                    : "No matching dates in that range."}
                </p>
              ) : (
                <div className="flex max-h-[160px] flex-wrap gap-[6px] overflow-auto rounded-[10px] border border-line bg-bg/40 p-2">
                  {generated.map((d) => {
                    const off = repeat !== "manual" && excluded.has(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          repeat === "manual"
                            ? removeManualDate(d)
                            : toggleExcluded(d)
                        }
                        className={`rounded-[7px] border px-[8px] py-[5px] font-display text-[11px] font-bold ${
                          off
                            ? "border-line bg-bg text-muted line-through opacity-60"
                            : "border-accent/40 bg-paper text-text"
                        }`}
                      >
                        {dateChipLabel(d)}
                        {repeat === "manual" ? "  ×" : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* DETAILS */}
        {blockMode && (
          <div className="border-t border-line pt-5">
            <SecHead>Block Details</SecHead>
            <div className="field">
              <label className="lab">Label / Reason</label>
              <input
                className="sel"
                value={blockLabel}
                onChange={(e) => setBlockLabel(e.target.value)}
                placeholder="e.g. Maintenance, Private Event"
              />
            </div>
            <div className="field">
              <label className="lab">Notes</label>
              <input
                className="sel"
                value={blockNotes}
                onChange={(e) => setBlockNotes(e.target.value)}
                placeholder="Anything else (optional)"
              />
            </div>
          </div>
        )}
        {!blockMode && (
        <div className="border-t border-line pt-5">
          <SecHead>Details</SecHead>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Booking Type">
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value)}
                className="sel"
              >
                {usableTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openPanel("type")}
                className="mt-1 font-display text-[11px] font-extrabold text-accent"
              >
                + New Type
              </button>
            </Field>
            <Field label="Service">
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="sel"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({moneyExact(s.base_rate_cents)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openPanel("service")}
                className="mt-1 font-display text-[11px] font-extrabold text-accent"
              >
                + New Service
              </button>
            </Field>
          </div>

          {addPanel === "type" && (
            <AddCard
              title="New Booking Type"
              busy={addBusy}
              err={addErr}
              onCancel={() => setAddPanel("")}
              onSave={saveNewType}
            >
              <div className="field">
                <label className="lab">Label</label>
                <input
                  className="sel"
                  value={ntLabel}
                  onChange={(e) => setNtLabel(e.target.value)}
                  placeholder="e.g. Clinic"
                />
              </div>
              <div className="field">
                <label className="lab">Color</label>
                <div className="flex gap-2">
                  {["#7DC4E8", "#1E78A6", "#F5C518", "#1E8E5A", "#C0392B", "#8A92A0"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNtColor(c)}
                        style={{ background: c }}
                        className={`h-[28px] w-[28px] rounded-[7px] ${
                          ntColor === c ? "ring-2 ring-ink ring-offset-1" : ""
                        }`}
                      />
                    )
                  )}
                </div>
              </div>
            </AddCard>
          )}

          {addPanel === "service" && (
            <AddCard
              title="New Service"
              busy={addBusy}
              err={addErr}
              onCancel={() => setAddPanel("")}
              onSave={saveNewService}
            >
              <div className="field">
                <label className="lab">Name</label>
                <input
                  className="sel"
                  value={nsName}
                  onChange={(e) => setNsName(e.target.value)}
                  placeholder="e.g. Small Group Hitting"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="lab">Price (USD)</label>
                  <input
                    className="sel"
                    inputMode="decimal"
                    value={nsPrice}
                    onChange={(e) => setNsPrice(e.target.value)}
                    placeholder="75"
                  />
                </div>
                <div className="field">
                  <label className="lab">Unit</label>
                  <select
                    className="sel"
                    value={nsUnit}
                    onChange={(e) => setNsUnit(e.target.value)}
                  >
                    <option value="/hr">/hr</option>
                    <option value="/session">/session</option>
                    <option value="/athlete/hr">/athlete/hr</option>
                    <option value="/mo">/mo</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="lab">Minimum Duration (hrs)</label>
                <input
                  className="sel"
                  inputMode="decimal"
                  value={nsMin}
                  onChange={(e) => setNsMin(e.target.value)}
                  placeholder="1"
                />
              </div>
              <p className="hint">
                Code is generated automatically. Category defaults to Custom and
                can be refined in Pricing.
              </p>
            </AddCard>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Coach">
              <select
                value={coachId}
                onChange={(e) => setCoachId(e.target.value)}
                className="sel"
              >
                <option value="">Unassigned</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                    {c.id.startsWith("name:") ? " (name only)" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openPanel("coach")}
                className="mt-1 font-display text-[11px] font-extrabold text-accent"
              >
                + New Coach
              </button>
            </Field>
            <Field label="Client">
              <select
                value={familyId}
                onChange={(e) => {
                  setFamilyId(e.target.value);
                  setAthleteIds([]);
                }}
                className="sel"
              >
                <option value="">None</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.family_name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => openPanel("family")}
                className="mt-1 font-display text-[11px] font-extrabold text-accent"
              >
                + New Client
              </button>
            </Field>
          </div>

          {addPanel === "coach" && (
            <AddCard
              title="New Coach"
              busy={addBusy}
              err={addErr}
              onCancel={() => setAddPanel("")}
              onSave={saveNewCoach}
            >
              <div className="field">
                <label className="lab">Name</label>
                <input
                  className="sel"
                  value={ncName}
                  onChange={(e) => setNcName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <label className="flex items-center gap-2 text-[12.5px] font-medium text-text">
                <input
                  type="checkbox"
                  checked={ncLogin}
                  onChange={(e) => setNcLogin(e.target.checked)}
                  className="h-[15px] w-[15px] accent-[#1E78A6]"
                />
                Create a login for them
              </label>
              {ncLogin && (
                <div className="field mt-2">
                  <label className="lab">Email</label>
                  <input
                    className="sel"
                    type="email"
                    value={ncEmail}
                    onChange={(e) => setNcEmail(e.target.value)}
                    placeholder="coach@email.com"
                  />
                  <p className="hint">
                    Creating a login needs your Supabase service role key in
                    Vercel. Without it, leave this off and the coach is assigned
                    by name only.
                  </p>
                </div>
              )}
            </AddCard>
          )}

          {addPanel === "family" && (
            <AddCard
              title="New Client"
              busy={addBusy}
              err={addErr}
              onCancel={() => setAddPanel("")}
              onSave={saveNewFamily}
            >
              <div className="field">
                <label className="lab">Client Type</label>
                <div className="seg">
                  {(
                    [
                      ["family", "Family"],
                      ["organization", "Organization"],
                      ["team", "Team"],
                    ] as const
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNfType(val)}
                      className={`seg-btn${nfType === val ? " on" : ""}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field mt-3">
                <label className="lab">
                  {nfType === "organization"
                    ? "Organization Name"
                    : nfType === "team"
                    ? "Team Name"
                    : "Family / Last Name"}
                </label>
                <input
                  className="sel"
                  value={nfName}
                  onChange={(e) => setNfName(e.target.value)}
                  placeholder={
                    nfType === "organization"
                      ? "e.g. Stamford Little League"
                      : nfType === "team"
                      ? "e.g. Stamford Thunder 12U"
                      : "e.g. Delgado"
                  }
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="lab">Sport</label>
                  <input
                    className="sel"
                    value={nfSport}
                    onChange={(e) => setNfSport(e.target.value)}
                    placeholder="e.g. Baseball"
                  />
                </div>
                <div className="field">
                  <label className="lab">Point of Contact</label>
                  <input
                    className="sel"
                    value={nfPoc}
                    onChange={(e) => setNfPoc(e.target.value)}
                    placeholder="Contact name"
                  />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="lab">Email</label>
                  <input
                    className="sel"
                    type="email"
                    value={nfEmail}
                    onChange={(e) => setNfEmail(e.target.value)}
                    placeholder="contact@email.com"
                  />
                </div>
                <div className="field">
                  <label className="lab">Phone</label>
                  <input
                    className="sel"
                    type="tel"
                    value={nfPhone}
                    onChange={(e) => setNfPhone(e.target.value)}
                    placeholder="(203) 555-0100"
                  />
                </div>
              </div>
              {nfType !== "organization" && (
                <div className="mt-3">
                  <p className="lab">
                    {nfType === "team" ? "Roster" : "Athletes"}
                  </p>
                  {nfAths.map((a, i) => (
                    <div
                      key={i}
                      className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2"
                    >
                      <input
                        className="sel"
                        value={a.first}
                        onChange={(e) =>
                          setNfAths((p) =>
                            p.map((x, j) =>
                              j === i ? { ...x, first: e.target.value } : x
                            )
                          )
                        }
                        placeholder="First"
                      />
                      <input
                        className="sel"
                        value={a.last}
                        onChange={(e) =>
                          setNfAths((p) =>
                            p.map((x, j) =>
                              j === i ? { ...x, last: e.target.value } : x
                            )
                          )
                        }
                        placeholder="Last"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNfAths((p) =>
                            p.length <= 1 ? p : p.filter((_, j) => j !== i)
                          )
                        }
                        className="px-2 font-display text-[12px] font-bold text-muted"
                        aria-label="Remove athlete"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setNfAths((p) => [...p, { first: "", last: "" }])
                    }
                    className="font-display text-[11px] font-extrabold text-accent"
                  >
                    + Add Athlete
                  </button>
                </div>
              )}
              <div className="field mt-3">
                <label className="lab">Notes</label>
                <textarea
                  className="sel"
                  style={{ height: "auto", minHeight: "68px" }}
                  rows={3}
                  value={nfNotes}
                  onChange={(e) => setNfNotes(e.target.value)}
                  placeholder="Anything worth recording about this client"
                />
              </div>
            </AddCard>
          )}

          {familyId && familyAthletes.length > 0 && (
            <div className="mt-3">
              <p className="lab">Athletes</p>
              <div className="flex flex-wrap gap-2">
                {familyAthletes.map((a) => {
                  const on = athleteIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAthlete(a.id)}
                      className={`rounded-full border px-3 py-[6px] font-display text-[11px] font-extrabold tracking-[.03em] ${
                        on
                          ? "border-sky bg-sky text-ink"
                          : "border-line-2 bg-paper text-muted hover:border-accent"
                      }`}
                    >
                      {a.first_name} {a.last_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* SUMMARY BAR */}
      <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-3 rounded-[14px] border border-line bg-paper px-4 py-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-extrabold text-text">
            {count} {blockMode ? "Block" : "Booking"}
            {count === 1 ? "" : "s"}
          </div>
          <div className="text-[12px] text-muted">
            {assetIds.size} space{assetIds.size === 1 ? "" : "s"} ×{" "}
            {includedDates.length} date{includedDates.length === 1 ? "" : "s"}
            {blockMode ? "" : ` · ${moneyExact(grandTotal)}`}
          </div>
        </div>
        <label className="flex items-center gap-[6px] text-[11.5px] font-medium text-muted">
          <input
            type="checkbox"
            checked={addAnother}
            onChange={(e) => setAddAnother(e.target.checked)}
            className="h-[15px] w-[15px] accent-[#1E78A6]"
          />
          Add another
        </label>
        <button
          onClick={submit}
          disabled={busy || count === 0}
          className="inline-flex h-11 items-center rounded-[10px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
        >
          {busy
            ? blockMode
              ? "Blocking…"
              : "Booking…"
            : blockMode
            ? count > 1
              ? `Block ${count}`
              : "Block Off"
            : count > 1
            ? `Create ${count}`
            : "Create"}
        </button>
      </div>

      <style>{`
        .lab{font-family:var(--fd);font-weight:700;font-size:11px;letter-spacing:.02em;color:var(--accent);margin:0 0 7px;}
        .hint{font-size:11.5px;color:var(--muted);margin-top:9px;}
        .sel{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:13px;height:40px;}
        .sel:focus{border-color:var(--accent);}
        .seg{display:flex;border:1px solid var(--line-2);border-radius:10px;overflow:hidden;}
        .seg-btn{flex:1;padding:9px 4px;font-family:var(--fd);font-weight:700;font-size:12px;background:var(--paper);color:var(--muted);border:none;border-right:1px solid var(--line-2);cursor:pointer;}
        .seg-btn:last-child{border-right:none;}
        .seg-btn.on{background:var(--ink);color:#fff;}
      `}</style>
    </div>
  );
}

function SecHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-display text-[13px] font-extrabold uppercase tracking-[.04em] text-accent">
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
        {label}
      </div>
      {children}
    </div>
  );
}

function AddCard({
  title,
  busy,
  err,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  busy: boolean;
  err: string | null;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 rounded-[12px] border border-line-2 bg-bg/40 p-4">
      <div className="mb-3 font-display text-[12.5px] font-extrabold text-text">
        {title}
      </div>
      {children}
      {err && (
        <p className="mt-2 text-[12px] font-semibold text-danger">{err}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="rounded-[9px] border border-ink bg-ink px-4 py-[9px] font-display text-[12px] font-extrabold text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-[9px] border border-line-2 bg-paper px-4 py-[9px] font-display text-[12px] font-extrabold text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
