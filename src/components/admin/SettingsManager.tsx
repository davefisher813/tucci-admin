"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const CATEGORIES = ["Cage Rentals", "Lessons", "Memberships", "Field & Facility"];

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
}: {
  assets: Asset[];
  assetTypes: AssetType[];
  services: Service[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editAsset, setEditAsset] = useState<string | null>(null);
  const [editType, setEditType] = useState<string | null>(null);
  const [editService, setEditService] = useState<string | null>(null);

  const typeLabel = (id: string | null) =>
    assetTypes.find((t) => t.id === id)?.label ?? "No type";

  const [aName, setAName] = useState("");
  const [aType, setAType] = useState(assetTypes[0]?.id ?? "");
  const [newType, setNewType] = useState("");
  const [sName, setSName] = useState("");
  const [sCat, setSCat] = useState("Cage Rentals");
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
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

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
                value={sCat}
                onChange={(e) => setSCat(e.target.value)}
                className="sel flex-1"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
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
                  const ok = await run(() =>
                    createService({
                      code,
                      name: sName.trim(),
                      category: sCat,
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
  onCancel: () => void;
  onSave: (label: string) => void;
}) {
  const [label, setLabel] = useState(type.label);
  return (
    <div className="flex items-center gap-2 border-b border-line bg-bg/40 px-4 py-[10px] last:border-b-0">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="sel flex-1"
      />
      <button
        onClick={() => label.trim() && onSave(label.trim())}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
      >
        Save
      </button>
      <button
        onClick={onCancel}
        disabled={busy}
        className="inline-flex h-9 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-text"
      >
        Cancel
      </button>
    </div>
  );
}

function AssetEditRow({
  asset,
  assetTypes,
  busy,
  onCancel,
  onSave,
}: {
  asset: Asset;
  assetTypes: AssetType[];
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: {
    name: string;
    asset_type_id: string | null;
    description: string | null;
    features: string[];
  }) => void;
}) {
  const [name, setName] = useState(asset.name);
  const [typeId, setTypeId] = useState(asset.asset_type_id ?? "");
  const [desc, setDesc] = useState(asset.description ?? "");
  const [tags, setTags] = useState<string[]>(asset.features ?? []);
  const [tagInput, setTagInput] = useState("");

  function addTag() {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) {
      setTagInput("");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  }

  return (
    <div className="flex flex-col gap-3 border-b border-line bg-bg/40 px-4 py-4 last:border-b-0">
      <div>
        <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
          Name
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} className="sel w-full" />
      </div>
      <div>
        <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
          Type
        </div>
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="sel w-full">
          <option value="">No type</option>
          {assetTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
          Description
        </div>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Optional notes about this space"
          className="ta"
        />
      </div>
      <div>
        <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
          Feature Tags
        </div>
        {tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-sky/[.16] px-3 py-1 font-display text-[11px] font-bold text-accent"
              >
                {t}
                <button
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="text-[13px] leading-none text-accent/70 hover:text-danger"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="e.g. Trackman"
            className="sel flex-1"
          />
          <button
            onClick={addTag}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-text hover:border-accent"
          >
            Add Tag
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() =>
            name.trim() &&
            onSave({
              name: name.trim(),
              asset_type_id: typeId || null,
              description: desc.trim() ? desc.trim() : null,
              features: tags,
            })
          }
          disabled={busy}
          className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={busy}
          className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ServiceEditRow({
  service,
  busy,
  onCancel,
  onSave,
}: {
  service: Service;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: { name: string; category: string; base_rate_cents: number }) => void;
}) {
  const [name, setName] = useState(service.name);
  const [cat, setCat] = useState(service.category);
  const [price, setPrice] = useState(String(service.base_rate_cents / 100));

  return (
    <div className="flex flex-col gap-3 border-b border-line bg-bg/40 px-4 py-3 last:border-b-0">
      <input value={name} onChange={(e) => setName(e.target.value)} className="sel" />
      <div className="flex flex-col gap-3 sm:flex-row">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="sel flex-1">
          {[...new Set([cat, ...CATEGORIES])].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 sm:w-[150px]">
          <span className="text-[14px] text-muted">$</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            className="sel flex-1"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const d = parseFloat(price);
              if (isNaN(d) || d < 0) return;
              onSave({
                name: name.trim() || service.name,
                category: cat,
                base_rate_cents: Math.round(d * 100),
              });
            }}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[16px] font-display text-[11px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[16px] font-display text-[11px] font-extrabold tracking-[.03em] text-text"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
