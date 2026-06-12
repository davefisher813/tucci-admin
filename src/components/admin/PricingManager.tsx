"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moneyExact } from "@/lib/format";
import { updateServiceRates } from "@/lib/data/pricing-actions";
import type { Service } from "@/lib/data/resources";

const CATEGORIES = [
  "Cage Rentals",
  "Lessons",
  "Memberships",
  "Field & Facility",
];

export default function PricingManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // group by category for display
  const grouped: Record<string, Service[]> = {};
  for (const s of services) {
    (grouped[s.category] ??= []).push(s);
  }
  const cats = Object.keys(grouped).sort();

  return (
    <div className="mx-auto max-w-[760px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      {services.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          <b className="mb-[5px] block font-display text-[16px] text-text">
            No services yet
          </b>
          Add services in Settings, then set rates here.
        </div>
      ) : (
        cats.map((cat) => (
          <section key={cat} className="mb-6">
            <div className="mb-[12px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
              {cat}
            </div>
            <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
              {grouped[cat].map((s) => (
                <PriceRow
                  key={s.id}
                  service={s}
                  open={editing === s.id}
                  onToggle={() => setEditing(editing === s.id ? null : s.id)}
                  onSaved={() => {
                    setEditing(null);
                    router.refresh();
                  }}
                  onError={setErr}
                />
              ))}
            </div>
          </section>
        ))
      )}

      <div className="rounded-[14px] border border-dashed border-line-2 bg-paper p-4 text-[13px] text-muted">
        Peak pricing windows (time-based premiums) are coming in a later update.
        For now, set a flat peak rate per service below the base rate.
      </div>

      <style>{`
        .sel{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;width:100%;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}

function PriceRow({
  service,
  open,
  onToggle,
  onSaved,
  onError,
}: {
  service: Service;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
  onError: (s: string | null) => void;
}) {
  const [name, setName] = useState(service.name);
  const [cat, setCat] = useState(service.category);
  const [base, setBase] = useState(String(service.base_rate_cents / 100));
  const [peak, setPeak] = useState(
    service.peak_rate_cents != null
      ? String(service.peak_rate_cents / 100)
      : ""
  );
  const [minHrs, setMinHrs] = useState(String(service.min_duration_hours));
  const [busy, setBusy] = useState(false);

  async function save() {
    const baseNum = parseFloat(base);
    if (isNaN(baseNum) || baseNum < 0) return onError("Enter a valid base rate.");
    const peakNum = peak.trim() === "" ? null : parseFloat(peak);
    const minNum = parseFloat(minHrs);
    setBusy(true);
    onError(null);
    const res = await updateServiceRates({
      id: service.id,
      name: name.trim() || service.name,
      category: cat,
      base_rate_cents: Math.round(baseNum * 100),
      peak_rate_cents:
        peakNum != null && !isNaN(peakNum) ? Math.round(peakNum * 100) : null,
      min_duration_hours: isNaN(minNum) ? 1 : minNum,
    });
    setBusy(false);
    if (res.error) return onError(res.error);
    onSaved();
  }

  return (
    <div className="border-b border-line last:border-b-0">
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-bg"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold text-text">
            {service.name}
          </div>
          <div className="truncate text-[12px] text-muted">
            {service.min_duration_hours}hr min
            {service.peak_rate_cents != null
              ? ` · peak ${moneyExact(service.peak_rate_cents)}`
              : ""}
          </div>
        </div>
        <div className="tnum font-display text-[15px] font-extrabold text-text">
          {moneyExact(service.base_rate_cents)}
        </div>
        <span
          className={`text-[19px] text-line-2 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </div>

      {open && (
        <div className="bg-bg/40 px-4 pb-4 pt-1">
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Name
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="sel" />
            </div>
            <div>
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Category
              </div>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="sel">
                {[...new Set([cat, ...CATEGORIES])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                  Base Rate ($)
                </div>
                <input value={base} onChange={(e) => setBase(e.target.value)} inputMode="decimal" className="sel" />
              </div>
              <div className="flex-1">
                <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                  Peak Rate ($)
                </div>
                <input value={peak} onChange={(e) => setPeak(e.target.value)} placeholder="optional" inputMode="decimal" className="sel" />
              </div>
              <div className="w-[90px]">
                <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                  Min Hrs
                </div>
                <input value={minHrs} onChange={(e) => setMinHrs(e.target.value)} inputMode="decimal" className="sel" />
              </div>
            </div>
            <div className="flex gap-[9px]">
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={onToggle}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
