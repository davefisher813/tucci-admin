"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setSplittable, setCoverage } from "@/lib/data/overlap-actions";
import type { Asset, AssetType } from "@/lib/data/resources";

export default function SpaceSetupManager({
  assets,
  assetTypes,
  coverage,
}: {
  assets: Asset[];
  assetTypes: AssetType[];
  coverage: Record<string, string[]>;
}) {
  const router = useRouter();
  const [split, setSplit] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(assets.map((a) => [a.id, a.is_splittable]))
  );
  const [cov, setCov] = useState<Record<string, string[]>>(() => ({
    ...coverage,
  }));
  const [open, setOpen] = useState<string | null>(null);
  const [covOpen, setCovOpen] = useState<string | null>(null);
  const [pendingCov, setPendingCov] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const nameOf = (id: string) =>
    assets.find((x) => x.id === id)?.name ?? "?";
  const typeLabel = (id: string | null) =>
    assetTypes.find((t) => t.id === id)?.label ?? "No type";
  const coveredBy = (id: string) =>
    assets.filter((a) => (cov[a.id] ?? []).includes(id)).map((a) => a.name);

  const stats = useMemo(() => {
    const s = Object.values(split).filter(Boolean).length;
    const c = Object.values(cov).filter((arr) => arr.length > 0).length;
    return { spaces: assets.length, split: s, cover: c };
  }, [split, cov, assets.length]);

  function flashSaved(id: string) {
    setSaved(id);
    setTimeout(() => setSaved((s) => (s === id ? null : s)), 1400);
  }

  async function toggleSplit(id: string) {
    const next = !split[id];
    setErr(null);
    setBusy(true);
    setSplit((p) => ({ ...p, [id]: next }));
    const res = await setSplittable(id, next);
    setBusy(false);
    if (res.error) {
      setSplit((p) => ({ ...p, [id]: !next }));
      setErr(res.error);
      return;
    }
    flashSaved(id);
    router.refresh();
  }

  function openCoverage(id: string) {
    if (covOpen === id) {
      setCovOpen(null);
      return;
    }
    setPendingCov(cov[id] ?? []);
    setCovOpen(id);
  }

  function toggleChip(childId: string) {
    setPendingCov((p) =>
      p.includes(childId) ? p.filter((x) => x !== childId) : [...p, childId]
    );
  }

  async function saveCoverage(id: string) {
    setErr(null);
    setBusy(true);
    const res = await setCoverage(id, pendingCov);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setCov((p) => ({ ...p, [id]: [...pendingCov] }));
    flashSaved(id);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[760px]">
      <Link
        href="/settings"
        className="mb-3 inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-accent"
      >
        ‹ Settings
      </Link>
      <h2 className="mb-1 font-display text-[22px] font-extrabold tracking-[-.01em] text-text">
        Cage &amp; Field Setup
      </h2>
      <p className="mb-5 max-w-[46ch] text-[14px] text-muted">
        Set which cages can be booked in halves, and which field covers which
        cages. The schedule blocks double-bookings from this.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-[10px]">
        {[
          { n: stats.spaces, l: "Spaces" },
          { n: stats.split, l: "Split in half" },
          { n: stats.cover, l: "Fields w/ coverage" },
        ].map((k) => (
          <div
            key={k.l}
            className="rounded-[14px] border border-line bg-paper px-3 py-[11px]"
          >
            <div className="font-display text-[24px] font-extrabold leading-none tabular-nums text-text">
              {k.n}
            </div>
            <div className="mt-[5px] text-[11px] font-medium text-muted">
              {k.l}
            </div>
          </div>
        ))}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="mb-[14px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        All Spaces
      </div>

      <div className="space-y-[10px]">
        {assets.map((a) => {
          const under = coveredBy(a.id);
          const isOpen = open === a.id;
          const isSplit = !!split[a.id];
          const covList = cov[a.id] ?? [];
          return (
            <div
              key={a.id}
              className="overflow-hidden rounded-[16px] border border-line bg-paper"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : a.id)}
                className="relative flex w-full items-center gap-3 px-4 py-[15px] text-left"
              >
                <span
                  className={`absolute bottom-0 left-0 top-0 w-[3px] ${
                    isSplit ? "bg-accent" : "bg-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[16px] font-bold tracking-[-.01em] text-text">
                      {a.name}
                    </span>
                    {under.length > 0 && (
                      <span className="rounded-full border border-line bg-bg px-[7px] py-[2px] text-[11px] font-semibold text-muted">
                        Under {under.join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="mt-[2px] block truncate text-[13px] text-muted">
                    {typeLabel(a.asset_type_id)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-[6px] text-[13px] font-semibold text-muted">
                  <span
                    className={`h-[8px] w-[8px] rounded-full ${
                      isSplit ? "bg-accent" : "bg-line-2"
                    }`}
                  />
                  {isSplit ? "Splittable" : "Whole only"}
                </span>
                <span
                  className={`shrink-0 text-muted transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                >
                  ›
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-line bg-bg/40 px-4 py-1">
                  <div className="flex items-center justify-between gap-4 py-[13px]">
                    <div>
                      <div className="text-[15px] font-semibold text-text">
                        Bookable in halves
                      </div>
                      <div className="mt-[2px] text-[12px] text-muted">
                        Two lessons can share this space.
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleSplit(a.id)}
                      aria-pressed={isSplit}
                      className={`relative h-[28px] w-[48px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                        isSplit ? "bg-accent" : "bg-line-2"
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all ${
                          isSplit ? "left-[23px]" : "left-[3px]"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="border-t border-line">
                    <button
                      type="button"
                      onClick={() => openCoverage(a.id)}
                      className="flex w-full items-center justify-between gap-3 py-[13px] text-left"
                    >
                      <div>
                        <div className="text-[15px] font-semibold text-text">
                          Covers other spaces
                        </div>
                        <div className="mt-[2px] text-[12px] text-muted">
                          For fields or areas sitting over cages.
                        </div>
                      </div>
                      <div className="max-w-[55%] text-right text-[13px] text-muted">
                        {covList.length > 0 ? (
                          <span className="font-semibold text-text">
                            {covList.map(nameOf).join(", ")}
                          </span>
                        ) : (
                          "None"
                        )}
                      </div>
                    </button>

                    {covOpen === a.id && (
                      <div className="pb-3">
                        <div className="flex flex-wrap gap-2">
                          {assets
                            .filter((o) => o.id !== a.id)
                            .map((o) => {
                              const sel = pendingCov.includes(o.id);
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => toggleChip(o.id)}
                                  className={`rounded-full border px-3 py-[7px] font-display text-[13px] font-semibold ${
                                    sel
                                      ? "border-accent bg-accent text-white"
                                      : "border-line-2 bg-paper text-text"
                                  }`}
                                >
                                  {o.name}
                                </button>
                              );
                            })}
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => saveCoverage(a.id)}
                          className="mt-3 inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
                        >
                          {saved === a.id ? "Saved ✓" : "Save coverage"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
