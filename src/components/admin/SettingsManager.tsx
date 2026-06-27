"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { moneyExact } from "@/lib/format";
import {
  createAsset,
  updateAsset,
  deleteAsset,
  createAssetType,
  updateAssetType,
  deleteAssetType,
  createService,
  updateService,
  deleteService,
} from "@/lib/data/settings-actions";
import type { Asset, AssetType, Service } from "@/lib/data/resources";
import type { ServiceCategory } from "@/lib/data/category-actions";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
  assetTypes,
  services,
  categories,
}: {
  assets: Asset[];
  assetTypes: AssetType[];
  services: Service[];
  categories: ServiceCategory[];
}) {
  const activeCats = categories.filter((c) => c.is_active);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editAsset, setEditAsset] = useState<string | null>(null);
  const [editType, setEditType] = useState<string | null>(null);
  const [editService, setEditService] = useState<string | null>(null);

  const typeLabel = (id: string | null) =>
    assetTypes.find((t) => t.id === id)?.label ?? "No type";

  // add forms
  const [aName, setAName] = useState("");
  const [aType, setAType] = useState(assetTypes[0]?.id ?? "");
  const [newType, setNewType] = useState("");
  const [sName, setSName] = useState("");
  const [sCatId, setSCatId] = useState(activeCats[0]?.id ?? "");
  const [sPrice, setSPrice] = useState("");

  async function run(fn: () => Promise<{ error: string | null }>) {
    setBusy(true);
    setErr(null);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <Link
        href="/settings/cages"
        className="mb-6 flex items-center gap-3 rounded-[16px] border border-line bg-paper px-4 py-[15px] hover:border-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-bold tracking-[-.01em] text-text">
            Cage &amp; Field Setup
          </span>
          <span className="mt-[2px] block text-[13px] text-muted">
            Half-cage booking and which field covers which cages
          </span>
        </span>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      <Link
        href="/settings/hours"
        className="mb-6 flex items-center gap-3 rounded-[16px] border border-line bg-paper px-4 py-[15px] hover:border-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-bold tracking-[-.01em] text-text">
            Hours
          </span>
          <span className="mt-[2px] block text-[13px] text-muted">
            Operating hours and peak window for the Space Value numbers
          </span>
        </span>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      <Link
        href="/settings/categories"
        className="mb-6 flex items-center gap-3 rounded-[16px] border border-line bg-paper px-4 py-[15px] hover:border-accent"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[16px] font-bold tracking-[-.01em] text-text">
            Service Categories
          </span>
          <span className="mt-[2px] block text-[13px] text-muted">
            Revenue source categories used across Pricing and Reports
          </span>
        </span>
        <span className="shrink-0 text-muted">›</span>
      </Link>

      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      {/* ---------- SPACE TYPES ---------- */}
      <Section title="Space Types">
        <div className="mb-3 overflow-hidden rounded-[16px] border border-line bg-paper">
          {assetTypes.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted">
              No types yet. Add your first one below.
            </div>
          ) : (
            assetTypes.map((t) =>
              editType === t.id ? (
                <TypeEditRow
                  key={t.id}
                  type={t}
                  busy={busy}
                  onCancel={() => setEditType(null)}
                  onSave={async (label) => {
                    const ok = await run(() => updateAssetType(t.id, label));
                    if (ok) setEditType(null);
                  }}
                />
              ) : (
                <div
                  key={t.id}
                  className="flex items-center gap-3 border-b border-line px-4 py-[10px] last:border-b-0"
                >
                  <div className="flex-1 font-display text-[14px] font-bold text-text">
                    {t.label}
                  </div>
                  <button
                    onClick={() => setEditType(t.id)}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[5px] font-display text-[11px] font-extrabold text-text hover:border-accent disabled:opacity-40"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => run(() => deleteAssetType(t.id))}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[5px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              )
            )
          )}
        </div>
        <div className="rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            Add Type
          </div>
          <div className="flex gap-3">
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="e.g. Trackman Cage"
              className="sel flex-1"
            />
            <button
              onClick={async () => {
                if (!newType.trim()) return setErr("Enter a type name.");
                const ok = await run(() => createAssetType(newType.trim()));
                if (ok) setNewType("");
              }}
              disabled={busy}
              className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </Section>

      {/* ---------- SPACES ---------- */}
      <Section title="Spaces">
        <div className="mb-3 overflow-hidden rounded-[16px] border border-line bg-paper">
          {assets.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted">
              No spaces yet. Add your cages, gym, and lanes below.
            </div>
          ) : (
            assets.map((a) =>
              editAsset === a.id ? (
                <AssetEditRow
                  key={a.id}
                  asset={a}
                  assetTypes={assetTypes}
                  busy={busy}
                  onCancel={() => setEditAsset(null)}
                  onSave={async (patch) => {
                    const ok = await run(() => updateAsset({ id: a.id, ...patch }));
                    if (ok) setEditAsset(null);
                  }}
                />
              ) : (
                <div
                  key={a.id}
                  className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-bold text-text">
                      {a.name}
                    </div>
                    <div className="truncate text-[12px] text-muted">
                      {typeLabel(a.asset_type_id)}
                      {a.features && a.features.length > 0
                        ? " · " + a.features.join(", ")
                        : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditAsset(a.id)}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[6px] font-display text-[11px] font-extrabold text-text hover:border-accent disabled:opacity-40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => run(() => deleteAsset(a.id))}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[6px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              )
            )
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
              className="sel sm:w-[190px]"
            >
              {assetTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                if (!aName.trim()) return setErr("Enter a space name.");
                const ok = await run(() =>
                  createAsset({
                    name: aName.trim(),
                    asset_type_id: aType || null,
                    display_order: assets.length + 1,
                  })
                );
                if (ok) setAName("");
              }}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </Section>

      {/* ---------- SERVICES ---------- */}
      <Section title="Services & Pricing">
        <div className="mb-3 overflow-hidden rounded-[16px] border border-line bg-paper">
          {services.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px] text-muted">
              No services yet. Add what you offer and the price.
            </div>
          ) : (
            services.map((s) =>
              editService === s.id ? (
                <ServiceEditRow
                  key={s.id}
                  service={s}
                  categories={activeCats}
                  busy={busy}
                  onCancel={() => setEditService(null)}
                  onSave={async (patch) => {
                    const ok = await run(() => updateService({ id: s.id, ...patch }));
                    if (ok) setEditService(null);
                  }}
                />
              ) : (
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
                    onClick={() => setEditService(s.id)}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[6px] font-display text-[11px] font-extrabold text-text hover:border-accent disabled:opacity-40"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => run(() => deleteService(s.id))}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[6px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              )
            )
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
                value={sCatId}
                onChange={(e) => setSCatId(e.target.value)}
                className="sel flex-1"
              >
                {activeCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
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
                onClick={async () => {
                  if (!sName.trim()) return setErr("Enter a service name.");
                  const dollars = parseFloat(sPrice);
                  if (isNaN(dollars) || dollars < 0)
                    return setErr("Enter a valid price.");
                  const code =
                    sName
                      .trim()
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "") +
                    "-" +
                    Date.now().toString().slice(-4);
                  const chosen = activeCats.find((c) => c.id === sCatId);
                  const ok = await run(() =>
                    createService({
                      code,
                      name: sName.trim(),
                      category: chosen?.name ?? "",
                      category_id: chosen?.id ?? null,
                      base_rate_cents: Math.round(dollars * 100),
                      unit: "/hr",
                      min_duration_hours: 1,
                    })
                  );
                  if (ok) {
                    setSName("");
                    setSPrice("");
                  }
                }}
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
        .ta{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;width:100%;min-height:64px;resize:vertical;}
        .ta:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}

function TypeEditRow({
  type,
  busy,
  onCancel,
  onSave,
}: {
  type: AssetType;
  busy: boolean;
  onCancel:
