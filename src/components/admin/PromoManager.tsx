"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createPromoCode,
  setPromoActive,
  deletePromoCode,
} from "@/lib/data/promo-actions";

export type PromoRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  notes: string | null;
};

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function discountLabel(p: PromoRow): string {
  return p.discount_type === "percent" ? `${p.value}% off` : `${money(p.value)} off`;
}
function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PromoManager({ promos }: { promos: PromoRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [notes, setNotes] = useState("");

  async function save() {
    if (!code.trim()) return setErr("Enter a code.");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return setErr("Enter a valid amount.");
    if (type === "percent" && amt > 100)
      return setErr("Percent can't exceed 100.");
    const value = type === "percent" ? Math.round(amt) : Math.round(amt * 100);
    const mu = maxUses.trim() ? parseInt(maxUses, 10) : null;
    if (mu !== null && (isNaN(mu) || mu < 1))
      return setErr("Max uses must be 1 or more.");

    setBusy(true);
    setErr(null);
    const res = await createPromoCode({
      code: code.trim().toUpperCase(),
      discount_type: type,
      value,
      max_uses: mu,
      valid_from: from ? new Date(from + "T00:00:00").toISOString() : null,
      valid_to: to ? new Date(to + "T23:59:59").toISOString() : null,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setCode("");
    setAmount("");
    setMaxUses("");
    setFrom("");
    setTo("");
    setNotes("");
    setType("percent");
    setShowAdd(false);
    router.refresh();
  }

  async function toggle(p: PromoRow) {
    setBusy(true);
    setErr(null);
    const res = await setPromoActive(p.id, !p.is_active);
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function remove(p: PromoRow) {
    setBusy(true);
    setErr(null);
    const res = await deletePromoCode(p.id);
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

      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-[12px] font-bold text-muted">
          {promos.length} {promos.length === 1 ? "Code" : "Codes"}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white"
        >
          {showAdd ? "Close" : "Add Code"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            New Code
          </div>
          <div className="flex flex-col gap-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code (e.g. SUMMER25)"
              className="sel"
            />
            <div className="flex gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "percent" | "fixed")}
                className="sel flex-1"
              >
                <option value="percent">Percent Off</option>
                <option value="fixed">Amount Off ($)</option>
              </select>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder={type === "percent" ? "e.g. 15" : "e.g. 10.00"}
                className="sel flex-1"
              />
            </div>
            <input
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              inputMode="numeric"
              placeholder="Max uses (blank = unlimited)"
              className="sel"
            />
            <div className="flex gap-3">
              <label className="flex-1">
                <span className="mb-1 block font-display text-[10px] font-extrabold uppercase tracking-[.06em] text-muted">
                  Valid From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="sel"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block font-display text-[10px] font-extrabold uppercase tracking-[.06em] text-muted">
                  Valid To
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="sel"
                />
              </label>
            </div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="sel"
            />
            <button
              onClick={save}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              Save Code
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {promos.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-display text-[15px] font-extrabold text-text">
              No codes yet
            </div>
            <div className="mt-1 text-[13px] text-muted">
              Add a discount code to use at booking.
            </div>
          </div>
        ) : (
          promos.map((p) => {
            const uses =
              p.max_uses != null
                ? `${p.used_count}/${p.max_uses} used`
                : `${p.used_count} used`;
            const window = p.valid_to
              ? `until ${fmtDate(p.valid_to)}`
              : p.valid_from
                ? `from ${fmtDate(p.valid_from)}`
                : null;
            const sub = [discountLabel(p), uses, window]
              .filter(Boolean)
              .join(" · ");
            return (
              <div
                key={p.id}
                className="border-b border-line px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-[15px] font-extrabold tracking-[.02em] text-text">
                        {p.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-[2px] font-display text-[10px] font-extrabold ${
                          p.is_active
                            ? "bg-success/[.14] text-success"
                            : "bg-line-2 text-muted"
                        }`}
                      >
                        {p.is_active ? "Active" : "Off"}
                      </span>
                    </div>
                    <div className="mt-[2px] truncate text-[12px] text-muted">
                      {sub}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <button
                      onClick={() => toggle(p)}
                      disabled={busy}
                      className="font-display text-[11px] font-extrabold text-accent disabled:opacity-40"
                    >
                      {p.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => remove(p)}
                      disabled={busy}
                      className="font-display text-[11px] font-extrabold text-danger disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .sel{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}
