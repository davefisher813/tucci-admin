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

const BOOKING_TYPES = [
  "lesson",
  "group_lesson",
  "rental",
  "event",
  "team_practice",
  "membership_use",
];

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

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
}: {
  assets: Asset[];
  services: Service[];
  coaches: Coach[];
  families: FamilyLite[];
  athletes: AthleteLite[];
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

  const [bookingType, setBookingType] = useState("lesson");
  const [assetIds, setAssetIds] = useState<Set<string>>(
    new Set(initialAsset ? [initialAsset] : [])
  );
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [coachId, setCoachId] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [athleteIds, setAthleteIds] = useState<string[]>([]);

  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly" | "biweekly">(
    "none"
  );
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [startTime, setStartTime] = useState(
    initialHour
      ? `${String(Number(initialHour)).padStart(2, "0")}:00`
      : "16:00"
  );
  const [durationHours, setDurationHours] = useState(1);
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

  // Availability is only meaningful for a single date; ranges vary per day and
  // are conflict-checked at creation time.
  useEffect(() => {
    if (repeat !== "none") return;
    let active = true;
    getDayBookings(startDate).then((res) => {
      if (!active) return;
      setDayBookings(res.bookings);
      setCoverage(res.coverage);
    });
    return () => {
      active = false;
    };
  }, [startDate, repeat]);

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

  const generated = useMemo(
    () => generateDates(startDate, repeat === "none" ? startDate : endDate, repeat, weekdays),
    [startDate, endDate, repeat, weekdays]
  );
  const includedDates = generated.filter((d) => !excluded.has(d));
  const count = assetIds.size * includedDates.length;
  const grandTotal = count * totalPerBooking;

  function toggleAsset(id: string) {
    setResult(null);
    setAssetIds((prev) => {
      const next = new Set(prev);
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
  function toggleAthlete(id: string) {
    setAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    setErr(null);
    setResult(null);
    if (assetIds.size === 0) return setErr("Pick at least one space.");
    if (!serviceId) return setErr("Pick a service.");
    if (includedDates.length === 0) return setErr("No dates selected.");
    if (durationHours < minDuration)
      return setErr(`This service needs at least ${minDuration} hr.`);

    const occurrences: Occurrence[] = includedDates.map((date) => {
      const start = new Date(`${date}T00:00:00`);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(start.getTime() + durationHours * 3600 * 1000);
      return { start_time: start.toISOString(), end_time: end.toISOString() };
    });

    setBusy(true);
    const res = await createBulkBookings({
      booking_type: bookingType,
      asset_ids: [...assetIds],
      coach_id: coachId || null,
      family_id: familyId || null,
      service_id: serviceId || null,
      athlete_ids: athleteIds,
      occurrences,
      base_rate_cents: baseCents,
      peak_premium_cents: 0,
      total_cents: totalPerBooking,
      want_half: onlySplittable && wantHalf,
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
            Created {result.created} booking{result.created === 1 ? "" : "s"}.
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
            selectedIds={assetIds}
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
            <Field label={repeat === "none" ? "Date" : "Start Date"}>
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
            </Field>
            {repeat !== "none" && (
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
            <Field label="Duration">
              <div className="flex flex-wrap gap-[6px]">
                {DURATIONS.map((d) => {
                  const tooShort = d < minDuration;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={tooShort}
                      onClick={() => setDurationHours(d)}
                      className={`rounded-[8px] border px-[10px] py-[7px] font-display text-[12px] font-extrabold ${
                        tooShort
                          ? "border-line bg-bg text-muted opacity-50"
                          : durationHours === d
                          ? "border-ink bg-ink text-white"
                          : "border-line-2 bg-paper text-text hover:border-accent"
                      }`}
                    >
                      {d === 0.5 ? "30m" : d === 1.5 ? "90m" : `${d}h`}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>

          <p className="lab" style={{ marginTop: 16 }}>
            Repeat
          </p>
          <div className="seg">
            {(["none", "daily", "weekly", "biweekly"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRepeat(r);
                  setExcluded(new Set());
                  setResult(null);
                }}
                className={`seg-btn${repeat === r ? " on" : ""}`}
              >
                {r === "none"
                  ? "Once"
                  : r === "daily"
                  ? "Daily"
                  : r === "weekly"
                  ? "Weekly"
                  : "Biweekly"}
              </button>
            ))}
          </div>

          {(repeat === "weekly" || repeat === "biweekly") && (
            <div className="mt-3">
              <p className="lab">On these days</p>
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
                {excluded.size > 0 ? `, ${excluded.size} skipped` : ""}) — tap to
                skip
              </p>
              {generated.length === 0 ? (
                <p className="hint">No matching dates in that range.</p>
              ) : (
                <div className="flex max-h-[160px] flex-wrap gap-[6px] overflow-auto rounded-[10px] border border-line bg-bg/40 p-2">
                  {generated.map((d) => {
                    const off = excluded.has(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleExcluded(d)}
                        className={`rounded-[7px] border px-[8px] py-[5px] font-display text-[11px] font-bold ${
                          off
                            ? "border-line bg-bg text-muted line-through opacity-60"
                            : "border-accent/40 bg-paper text-text"
                        }`}
                      >
                        {dateChipLabel(d)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="border-t border-line pt-5">
          <SecHead>Details</SecHead>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Booking Type">
              <select
                value={bookingType}
                onChange={(e) => setBookingType(e.target.value)}
                className="sel"
              >
                {BOOKING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {titleCase(t)}
                  </option>
                ))}
              </select>
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
            </Field>
          </div>

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
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Family">
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
            </Field>
          </div>

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
      </div>

      {/* SUMMARY BAR */}
      <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-3 rounded-[14px] border border-line bg-paper px-4 py-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-extrabold text-text">
            {count} booking{count === 1 ? "" : "s"}
          </div>
          <div className="text-[12px] text-muted">
            {assetIds.size} space{assetIds.size === 1 ? "" : "s"} ×{" "}
            {includedDates.length} date{includedDates.length === 1 ? "" : "s"} ·{" "}
            {moneyExact(grandTotal)}
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
          {busy ? "Booking…" : count > 1 ? `Create ${count}` : "Create"}
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
