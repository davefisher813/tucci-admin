"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moneyExact } from "@/lib/format";
import {
  createAsset,
  deleteAsset,
  createService,
  deleteService,
} from "@/lib/data/settings-actions";
import type { Asset, Service } from "@/lib/data/resources";

const ASSET_TYPES = [
  { value: "cage_full", label: "Full Cage" },
  { value: "cage_half", label: "Half Cage" },
  { value: "cage_outside", label: "Outdoor Cage" },
  { value: "cage_probatter", label: "ProBatter Cage" },
  { value: "cage_hittrax", label: "HitTrax Cage" },
  { value: "field", label: "Field" },
  { value: "turf", label: "Turf Zone" },
  { value: "strength_zone", label: "Strength Zone" },
  { value: "full_facility", label: "Full Facility" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-[14px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        {title}
      </div>
      {children}
    </section>
  );
}

export default function SettingsManager({
  assets,
  services,
}: {
  assets: Asset[];
  services: Service[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [aName, setAName] = useState("");
  const [aType, setAType] = useState("cage_full");

  const [sName, setSName] = useState("");
  const [sCat, setSCat] = useState("Cage Rentals");
  const [sPrice, setSPrice] = useState("");

  async function addSpace() {
    if (!aName.trim()) return setErr("Enter a space name.");
    setBusy(true);
    setErr(null);
    const res = await createAsset({
      name: aName.trim(),
      asset_type: aType,
      display_order: assets.length + 1,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setAName("");
    router.refresh();
  }

  async function removeSpace(id: string) {
    setBusy(true);
    const res = await deleteAsset(id);
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function addService() {
    if (!sName.trim()) return setErr("Enter a service name.");
    const dollars = parseFloat(sPrice);
    if (isNaN(dollars) || dollars < 0) return setErr("Enter a valid price.");
    setBusy(true);
    setErr(null);
    const code =
      sName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
      "-" +
      Date.now().toString().slice(-4);
    const res = await createService({
      code,
      name: sName.trim(),
      category: sCat,
      base_rate_cents: Math.round(dollars * 100),
      unit: "/hr",
      min_duration_hours: 1,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setSName("");
    setSPrice("");
    router.refresh();
  }

  async function removeService(id: string) {
    setBusy(true);
    const res = await deleteService(id);
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <Section title="Spaces">
        <div className="mb-3 overflow-hidden rounded-[16px] border border-line bg-paper">
          {assets.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted">
              No spaces yet. Add your cages, gym, and lanes below.
            </div>
          ) : (
            assets.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-display text-[15px] font-bold text-text">
                    {a.name}
                  </div>
                  <div className="text-[12px] text-muted">
                    {ASSET_TYPES.find((t) => t.value === a.asset_type)?.label ??
                      a.asset_type}
                  </div>
                </div>
                <button
                  onClick={() => removeSpace(a.id)}
                  disabled={busy}
                  className="rounded-[8px] border border-line-2 px-3 py-[6px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            Add Space
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={aName}
              onChange={(e) => setAName(e.target.value)}
              placeholder="e.g. Cage 1"
              className="sel flex-1"
            />
            <select
              value={aType}
              onChange={(e) => setAType(e.target.value)}
              className="sel sm:w-[180px]"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={addSpace}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </Section>

      <Section title="Services & Pricing">
        <div className="mb-3 overflow-hidden rounded-[16px] border border-line bg-paper">
          {services.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted">
              No services yet. Add what you offer and the price.
            </div>
          ) : (
            services.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-display text-[15px] font-bold text-text">
                    {s.name}
                  </div>
                  <div className="text-[12px] text-muted">{s.category}</div>
                </div>
                <div className="tnum font-display text-[14px] font-extrabold text-text">
                  {moneyExact(s.base_rate_cents)}/hr
                </div>
                <button
                  onClick={() => removeService(s.id)}
                  disabled={busy}
                  className="rounded-[8px] border border-line-2 px-3 py-[6px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            Add Service
          </div>
          <div className="flex flex-col gap-3">
            <input
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              placeholder="e.g. Private Lesson"
              className="sel"
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={sCat}
                onChange={(e) => setSCat(e.target.value)}
                className="sel flex-1"
              >
                <option>Cage Rentals</option>
                <option>Lessons</option>
                <option>Memberships</option>
                <option>Field &amp; Facility</option>
              </select>
              <div className="flex items-center gap-2 sm:w-[160px]">
                <span className="text-[14px] text-muted">$</span>
                <input
                  value={sPrice}
                  onChange={(e) => setSPrice(e.target.value)}
                  placeholder="80"
                  inputMode="decimal"
                  className="sel flex-1"
                />
                <span className="text-[13px] text-muted">/hr</span>
              </div>
              <button
                onClick={addService}
                disabled={busy}
                className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </Section>

      <style>{`
        .sel{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}
