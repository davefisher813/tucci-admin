"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { moneyExact } from "@/lib/format";
import { createBooking } from "@/lib/data/booking-actions";
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

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

  const initialDate = params.get("date") ?? new Date().toISOString().slice(0, 10);
  const initialHour = params.get("hour") ? Number(params.get("hour")) : 16;
  const initialAsset = params.get("asset") ?? (assets[0]?.id ?? "");
  const initialHalf = params.get("portion") === "half";

  const [bookingType, setBookingType] = useState("lesson");
  const [assetId, setAssetId] = useState(initialAsset);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [coachId, setCoachId] = useState("");
  const [familyId, setFamilyId] = useState("");
  const [athleteIds, setAthleteIds] = useState<string[]>([]);
  const [date, setDate] = useState(initialDate);
  const [startHour, setStartHour] = useState(initialHour);
  const [durationHours, setDurationHours] = useState(1);
  const [wantHalf, setWantHalf] = useState(initialHalf);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dayBookings, setDayBookings] = useState<DayBooking[]>([]);
  const [coverage, setCoverage] = useState<Record<string, string[]>>({});

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId]
  );

  const familyAthletes = useMemo(
    () => athletes.filter((a) => a.family_id === familyId),
    [athletes, familyId]
  );

  const baseCents = service?.base_rate_cents ?? 0;
  const totalCents = Math.round(baseCents * durationHours);
  const selectedAsset = assets.find((a) => a.id === assetId) ?? null;
  const splittable = selectedAsset?.is_splittable ?? false;

  useEffect(() => {
    let active = true;
    getDayBookings(date).then((res) => {
      if (!active) return;
      setDayBookings(res.bookings);
      setCoverage(res.coverage);
    });
    return () => {
      active = false;
    };
  }, [date]);

  const unavailable = useMemo(() => {
    const winStart = new Date(`${date}T00:00:00`);
    winStart.setHours(startHour, 0, 0, 0);
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
      if (b.half_slot == null) {
        wholeSet.add(b.asset_id);
      } else {
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

      let coveredByOccupiedField = false;
      for (const [field, cages] of Object.entries(coverage)) {
        if (cages.includes(a.id) && occupied.has(field)) {
          coveredByOccupiedField = true;
          break;
        }
      }

      let fieldWithOccupiedCage = false;
      const myCages = coverage[a.id];
      if (myCages) {
        for (const c of myCages) {
          if (occupied.has(c)) {
            fieldWithOccupiedCage = true;
            break;
          }
        }
      }

      if (selfFull || coveredByOccupiedField || fieldWithOccupiedCage) {
        out.add(a.id);
      }
    }
    return out;
  }, [dayBookings, coverage, date, startHour, durationHours, assets]);

  function toggleAthlete(id: string) {
    setAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit() {
    setErr(null);
    if (!assetId) return setErr("Pick a space.");
    if (!serviceId) return setErr("Pick a service.");

    const start = new Date(`${date}T00:00:00`);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(start.getTime() + durationHours * 3600 * 1000);

    setBusy(true);
    const res = await createBooking({
      booking_type: bookingType,
      asset_id: assetId,
      coach_id: coachId || null,
      family_id: familyId || null,
      service_id: serviceId || null,
      athlete_ids: athleteIds,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      base_rate_cents: baseCents,
      peak_premium_cents: 0,
      total_cents: totalCents,
      want_half: splittable && wantHalf,
    });
    setBusy(false);

    if (res.error) {
      setErr(res.error);
      return;
    }
    router.push(`/schedule?date=${date}`);
  }

  return (
    <div className="mx-auto max-w-[640px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="space-y-4 rounded-[16px] border border-line bg-paper p-6">
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

        <div>
          <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            Space
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <FacilityMap
              assets={assets}
              selectedAssetId={assetId}
              unavailable={unavailable}
              onSelect={(id) => {
                setAssetId(id);
                setWantHalf(false);
              }}
            />
            <div className="nbk-selected-card">
              <div>
                <div className="nbk-selected-eyebrow">Selected Space</div>
                <div className="nbk-selected-title">
                  {selectedAsset ? selectedAsset.name : "Pick a lane"}
                </div>
                {selectedAsset && (
                  <div className="nbk-selected-meta">
                    {splittable ? "Splittable cage" : "Whole space"}
                  </div>
                )}
              </div>
              {splittable && (
                <div
                  className="nbk-size-toggle"
                  role="group"
                  aria-label="Lane size"
                >
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
            </div>
          </div>
        </div>

        <Field label="Service">
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="sel"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {moneyExact(s.base_rate_cents)}
              </option>
            ))}
          </select>
        </Field>

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

        {familyId && familyAthletes.length > 0 && (
          <Field label="Athletes">
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
          </Field>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="sel"
            />
          </Field>
          <Field label="Start Hour">
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="sel"
            >
              {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                <option key={h} value={h}>
                  {h % 12 === 0 ? 12 : h % 12}:00 {h >= 12 ? "PM" : "AM"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Duration">
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="sel"
            >
              {[0.5, 1, 1.5, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d} hr
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-[12px] text-muted">Total (snapshot at booking)</span>
          <span className="tnum font-display text-[20px] font-extrabold text-text">
            {moneyExact(totalCents)}
          </span>
        </div>

        <div className="flex gap-[9px]">
          <button
            onClick={submit}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
          >
            {busy ? "Booking…" : "Create Booking"}
          </button>
          <button
            onClick={() => router.push(`/schedule?date=${date}`)}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        .sel{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:8px 11px;outline:none;font-family:var(--fs);font-size:13px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
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
