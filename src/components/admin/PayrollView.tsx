"use client";

import { useEffect, useMemo, useState } from "react";
import { money, ymd } from "@/lib/format";
import { getPayroll, type PayrollResult } from "@/lib/data/payroll-actions";

function presetRange(kind: "month" | "last14" | "week"): {
  from: string;
  to: string;
} {
  const today = new Date();
  if (kind === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: ymd(first), to: ymd(today) };
  }
  if (kind === "week") {
    const day = today.getDay();
    const monOffset = day === 0 ? 6 : day - 1;
    const mon = new Date(today);
    mon.setDate(today.getDate() - monOffset);
    return { from: ymd(mon), to: ymd(today) };
  }
  const start = new Date(today);
  start.setDate(today.getDate() - 13);
  return { from: ymd(start), to: ymd(today) };
}

export default function PayrollView() {
  const initial = useMemo(() => presetRange("last14"), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [data, setData] = useState<PayrollResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPayroll(from, to).then((res) => {
      if (!active) return;
      setData(res);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [from, to]);

  function applyPreset(kind: "month" | "last14" | "week") {
    const r = presetRange(kind);
    setFrom(r.from);
    setTo(r.to);
  }

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-[16px] border border-line bg-paper p-4">
        <div className="flex gap-2">
          <PresetBtn label="This Week" onClick={() => applyPreset("week")} />
          <PresetBtn label="Last 14 Days" onClick={() => applyPreset("last14")} />
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
      ) : data.rows.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          <b className="mb-[5px] block font-display text-[16px] text-text">
            No coached sessions in this range
          </b>
          Pay is calculated from sessions with a coach assigned.
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <StatCard label="Total Gross" value={money(data.totalGrossCents)} accent />
            <StatCard label="Sessions" value={String(data.totalSessions)} />
            <StatCard label="Hours" value={String(data.totalHours)} />
          </div>

          <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
            <div className="flex items-center gap-3 border-b border-line bg-bg/40 px-4 py-[10px] font-display text-[10px] font-extrabold uppercase tracking-[.04em] text-muted">
              <div className="flex-1">Coach</div>
              <div className="w-[70px] text-right">Sessions</div>
              <div className="w-[70px] text-right">Hours</div>
              <div className="w-[90px] text-right">Gross</div>
            </div>
            {data.rows.map((r) => (
              <div
                key={r.coachId}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px] font-bold text-text">
                    {r.coachName}
                  </div>
                  {r.missingRate && (
                    <div className="text-[11px] text-danger">
                      Some sessions have no pay rate set
                    </div>
                  )}
                </div>
                <div className="tnum w-[70px] text-right font-display text-[14px] font-bold text-text">
                  {r.sessions}
                </div>
                <div className="tnum w-[70px] text-right font-display text-[14px] font-bold text-text">
                  {r.hours}
                </div>
                <div className="tnum w-[90px] text-right font-display text-[14px] font-extrabold text-text">
                  {money(r.grossCents)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[11px] text-muted">
            Estimated gross from each session's snapshot pay rate (rate × hours).
            Cancellations and no-shows are excluded. This is a working estimate,
            not an official payroll run.
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
        className={`tnum font
