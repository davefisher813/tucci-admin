"use client";

import { useEffect, useMemo, useState } from "react";
import { money, ymd } from "@/lib/format";
import {
  getReportSummary,
  type ReportSummary,
} from "@/lib/data/reports-actions";

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function presetRange(kind: "month" | "last30" | "week"): {
  from: string;
  to: string;
} {
  const today = new Date();
  if (kind === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: ymd(first), to: ymd(today) };
  }
  if (kind === "week") {
    const day = today.getDay(); // 0 = Sun
    const monOffset = day === 0 ? 6 : day - 1;
    const mon = new Date(today);
    mon.setDate(today.getDate() - monOffset);
    return { from: ymd(mon), to: ymd(today) };
  }
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  return { from: ymd(start), to: ymd(today) };
}

export default function ReportsView() {
  const initial = useMemo(() => presetRange("last30"), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getReportSummary(from, to).then((res) => {
      if (!active) return;
      setData(res);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [from, to]);

  function applyPreset(kind: "month" | "last30" | "week") {
    const r = presetRange(kind);
    setFrom(r.from);
    setTo(r.to);
  }

  const noShowRate =
    data && data.bookingsCount > 0
      ? Math.round((data.noShowCount / data.bookingsCount) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-[16px] border border-line bg-paper p-4">
        <div className="flex gap-2">
          <PresetBtn label="This Week" onClick={() => applyPreset("week")} />
          <PresetBtn label="Last 30 Days" onClick={() => applyPreset("last30")} />
          <PresetBtn label="This Month" onClick={() => applyPreset("month")} />
        </div>
        <div className="ml-auto flex items-end gap-2">
          <div>
            <div className="mb-[5px] font-display text-[10px] font-extrabold tracking-[.03em] text-accent">
              From
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rdt"
            />
          </div>
          <div>
            <div className="mb-[5px] font-display text-[10px] font-extrabold tracking-[.03em] text-accent">
              To
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rdt"
            />
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="rounded-[16px] border border-line bg-paper p-10 text-center text-muted">
          Loading…
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Revenue Collected"
              value={money(data.revenueCollectedCents)}
              accent
            />
            <StatCard label="Booked Value" value={money(data.bookedValueCents)} />
            <StatCard label="Bookings" value={String(data.bookingsCount)} />
            <StatCard label="No-Show Rate" value={`${noShowRate}%`} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="By Booking Type">
              {data.byType.length === 0 ? (
                <Empty />
              ) : (
                <Table
                  rows={data.byType.map((r) => ({
                    label: titleCase(r.type),
                    sub: `${r.count} ${r.count === 1 ? "booking" : "bookings"}`,
                    value: money(r.valueCents),
                  }))}
                />
              )}
            </Panel>

            <Panel title="Payments by Method">
              {data.byMethod.length === 0 ? (
                <Empty />
              ) : (
                <Table
                  rows={data.byMethod.map((r) => ({
                    label: titleCase(r.method),
                    sub: `${r.count} ${r.count === 1 ? "payment" : "payments"}`,
                    value: money(r.amountCents),
                  }))}
                />
              )}
            </Panel>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-muted">
            <span>Cancelled: {data.cancelledCount}</span>
            <span>No-shows: {data.noShowCount}</span>
            <span>Refunds: {money(data.refundsCents)}</span>
          </div>

          <div className="mt-3 text-[11px] text-muted">
            Revenue Collected counts paid and refunded payments net of refunds.
            Booked Value is the scheduled total of non-cancelled bookings.
          </div>
        </>
      )}

      <style>{`
        .rdt{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:7px 9px;outline:none;font-family:var(--fs);font-size:13px;height:38px;}
        .rdt:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-line-2 bg-paper px-3 py-[7px] font-display text-[11px] font-extrabold tracking-[.02em] text-text transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </button>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-paper p-4">
      <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.03em] text-muted">
        {label}
      </div>
      <div
        className={`tnum font-display text-[26px] font-extrabold tracking-[-.02em] ${
          accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-[10px] font-display text-[17px] font-extrabold tracking-[-.01em] text-text">
        {title}
      </div>
      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {children}
      </div>
    </section>
  );
}

function Table({
  rows,
}: {
  rows: { label: string; sub: string; value: string }[];
}) {
  return (
    <div>
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[14px] font-bold text-text">
              {r.label}
            </div>
            <div className="truncate text-[12px] text-muted">{r.sub}</div>
          </div>
          <div className="tnum font-display text-[14px] font-extrabold text-text">
            {r.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="px-4 py-8 text-center text-[13px] text-muted">
      Nothing in this range.
    </div>
  );
}
