"use client";

import { useState, useTransition } from "react";
import {
  getSpaceValue,
  type Period,
  type SpaceValuePayload,
} from "@/lib/data/space-value-actions";
import { projectAddedHours } from "@/lib/data/space-value";

function money(cents: number): string {
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(d).toLocaleString()}`;
}

const RAIL = ["#1E78A6", "#16A34A", "#F5C518", "#7DC4E8", "#6B7280"];

export default function SpaceValueManager({
  initial,
  initialPeriod,
}: {
  initial: SpaceValuePayload;
  initialPeriod: Period;
}) {
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [data, setData] = useState<SpaceValuePayload>(initial);
  const [pending, startTransition] = useTransition();
  const [addHrs, setAddHrs] = useState(0);

  function pick(p: Period) {
    setPeriod(p);
    setAddHrs(0);
    startTransition(async () => {
      const fresh = await getSpaceValue(p);
      setData(fresh);
    });
  }

  const r = data.result;
  const proj = projectAddedHours(r, addHrs, data.avgRateCents);
  const sliderMax = Math.max(
    10,
    Math.ceil(r.availableHours - r.bookedHours)
  );

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-[14px] font-display text-[23px] font-extrabold tracking-[-.01em] text-text">
        Space Value
      </div>

      {/* period switcher */}
      <div className="mb-[18px] flex gap-[3px] rounded-[11px] border border-line bg-paper p-[3px]">
        {(["today", "week", "month", "year", "custom"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => pick(p)}
            className={`flex-1 rounded-[8px] px-[2px] py-[9px] text-[12px] font-semibold capitalize ${
              period === p ? "bg-accent text-white" : "text-muted"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="-mt-[8px] mb-[16px] text-center text-[12.5px] text-muted">
        {pending ? "Loading…" : data.rangeLabel}
      </div>

      {/* year month strip */}
      {period === "year" && data.monthly && (
        <div className="mb-[16px] rounded-[14px] border border-line bg-paper p-[14px]">
          <div className="mb-[12px] text-[11.5px] font-bold uppercase tracking-[.04em] text-muted">
            Revenue by Month
          </div>
          <MonthStrip months={data.monthly} />
        </div>
      )}

      {/* hero */}
      <div className="mb-[10px] grid grid-cols-2 gap-[10px]">
        <div className="rounded-[14px] border border-line bg-paper p-[14px]">
          <div className="mb-[6px] text-[11.5px] font-bold uppercase tracking-[.04em] text-muted">
            Booked
          </div>
          <div className="font-display text-[27px] font-extrabold leading-none tracking-[-.02em] text-accent">
            {money(r.bookedCents)}
          </div>
          <div className="mt-[5px] text-[12px] text-muted">
            {r.bookingCount} bookings
          </div>
        </div>
        <div className="rounded-[14px] border border-line bg-paper p-[14px]">
          <div className="mb-[6px] text-[11.5px] font-bold uppercase tracking-[.04em] text-muted">
            Potential
          </div>
          <div className="font-display text-[27px] font-extrabold leading-none tracking-[-.02em]">
            {money(r.potentialCents)}
          </div>
          <div className="mt-[5px] text-[12px] text-muted">
            if every open hour sold
          </div>
        </div>
      </div>

      {/* utilization */}
      <div className="mb-[10px] rounded-[14px] border border-line bg-paper p-[15px]">
        <div className="mb-[10px] flex items-baseline justify-between">
          <span className="text-[11.5px] font-bold uppercase tracking-[.04em] text-muted">
            Utilization
          </span>
          <span className="font-display text-[24px] font-extrabold tracking-[-.02em]">
            {r.utilizationPct}%
          </span>
        </div>
        <div className="h-[11px] overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${r.utilizationPct}%` }}
          />
        </div>
        <div className="mt-[12px] flex gap-[14px] text-[12px]">
          <div className="flex-1">
            <div className="font-display text-[16px] font-extrabold">
              {r.utilizationPct}%
            </div>
            <div className="mt-[1px] text-muted">blocked = unavailable</div>
          </div>
          <div className="flex-1">
            <div className="font-display text-[16px] font-extrabold">
              {r.utilizationSellablePct}%
            </div>
            <div className="mt-[1px] text-muted">blocked = sellable</div>
          </div>
        </div>
      </div>

      {/* open gaps */}
      <div className="rounded-[14px] border border-line bg-paper p-[14px]">
        <div className="mb-[6px] text-[11.5px] font-bold uppercase tracking-[.04em] text-muted">
          Open Gaps (money on the table)
        </div>
        <div className="font-display text-[27px] font-extrabold leading-none tracking-[-.02em] text-gold">
          {money(r.openGapsCents)}
        </div>
        <div className="mt-[5px] text-[12px] text-muted">
          sellable hours still empty
        </div>
      </div>

      {/* unpriced warning */}
      {r.unpricedSpaces.length > 0 && (
        <div className="mt-[10px] rounded-[12px] border border-gold/50 bg-gold/[.10] px-[14px] py-[11px] text-[12.5px] text-text">
          {r.unpricedSpaces.length} space
          {r.unpricedSpaces.length > 1 ? "s have" : " has"} no rate set, so they
          are left out of Potential. Set rates in Pricing to include them:{" "}
          {r.unpricedSpaces.join(", ")}.
        </div>
      )}

      {/* by space */}
      <div className="mb-[10px] mt-[22px] font-display text-[15px] font-extrabold">
        By Space
      </div>
      <div className="overflow-hidden rounded-[14px] border border-line bg-paper">
        {r.byType.map((t, i) => (
          <div
            key={t.type_label}
            className="flex items-center gap-[12px] border-b border-line px-[14px] py-[13px] last:border-b-0"
          >
            <div
              className="w-[3px] self-stretch rounded-full"
              style={{ background: RAIL[i % RAIL.length] }}
            />
            <div>
              <div className="font-display text-[14.5px] font-bold">
                {t.type_label}
              </div>
              <div className="mt-[2px] text-[12px] text-muted">
                {t.spaceCount} space{t.spaceCount > 1 ? "s" : ""}
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-display text-[15px] font-extrabold">
                {t.utilizationPct}%
              </div>
              <div className="mt-[1px] text-[11.5px] text-muted">
                {money(t.bookedCents)} / {money(t.potentialCents)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* projection */}
      <div className="mb-[10px] mt-[22px] font-display text-[15px] font-extrabold">
        Projection
      </div>
      <div className="rounded-[14px] border border-line bg-paper p-[16px]">
        <div className="mb-[4px] text-[11.5px] font-bold uppercase tracking-[.04em] text-muted">
          What if
        </div>
        <div className="mb-[14px] font-display text-[15px] font-bold">
          Book <span className="text-accent">{addHrs}</span> more space-hours
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={addHrs}
          onChange={(e) => setAddHrs(+e.target.value)}
          className="h-[28px] w-full"
          style={{ accentColor: "#1E78A6" }}
        />
        <div className="-mt-[2px] flex justify-between text-[11px] text-muted">
          <span>0</span>
          <span>+{sliderMax} hrs</span>
        </div>
        <div className="mt-[16px] grid grid-cols-2 gap-[10px]">
          <div className="rounded-[11px] bg-bg p-[12px]">
            <div className="mb-[5px] text-[11px] font-semibold text-muted">
              Projected Revenue
            </div>
            <div className="font-display text-[21px] font-extrabold tracking-[-.02em] text-success">
              {money(proj.revenueCents)}
            </div>
            <div className="mt-[3px] text-[11.5px] font-semibold text-success">
              +{money(proj.revenueCents - r.bookedCents)}
            </div>
          </div>
          <div className="rounded-[11px] bg-bg p-[12px]">
            <div className="mb-[5px] text-[11px] font-semibold text-muted">
              Projected Utilization
            </div>
            <div className="font-display text-[21px] font-extrabold tracking-[-.02em]">
              {proj.utilizationPct}%
            </div>
            <div className="mt-[3px] text-[11.5px] font-semibold text-success">
              +{proj.utilizationPct - r.utilizationSellablePct} pts
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[24px] rounded-[10px] border border-line bg-paper px-[14px] py-[12px] text-[12px] leading-[1.5] text-muted">
        Booked is real revenue from bookings. Potential values every open hour
        (from Hours) at each space&apos;s rate (from Pricing). Outdoor cages
        count May–Sep only. Change a rate or your hours and these numbers follow.
      </div>
    </div>
  );
}

function MonthStrip({
  months,
}: {
  months: { label: string; bookedCents: number }[];
}) {
  const max = Math.max(1, ...months.map((m) => m.bookedCents));
  const min = Math.min(...months.map((m) => m.bookedCents));
  return (
    <div className="flex h-[96px] items-end gap-[5px]">
      {months.map((m, i) => {
        const h = Math.round((m.bookedCents / max) * 100);
        const isPeak = m.bookedCents === max && max > 0;
        const isLow = m.bookedCents === min;
        const bg = isPeak ? "#F5C518" : isLow ? "#CFD6E0" : "#1E78A6";
        return (
          <div
            key={i}
            className="flex h-full flex-1 flex-col items-center justify-end gap-[4px]"
            title={`${m.label}: ${money(m.bookedCents)}`}
          >
            <div
              className="w-full rounded-t-[4px]"
              style={{ height: `${Math.max(h, 3)}%`, background: bg }}
            />
            <div className="text-[9px] font-semibold text-muted">{m.label}</div>
          </div>
        );
      })}
    </div>
  );
}
