"use client";

import { useState } from "react";
import { money, clock } from "@/lib/format";
import type { FamilyLite } from "@/lib/data/resources";
import { createCheckoutSession } from "@/lib/data/payment-actions";

export type PaymentRow = {
  id: string;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  family_name: string;
};

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function statusClass(status: string): string {
  if (status === "paid") return "bg-success/[.14] text-success";
  if (status === "failed" || status === "void")
    return "bg-danger/[.12] text-danger";
  if (status === "refunded" || status === "partially_refunded")
    return "bg-line-2 text-muted";
  return "bg-gold/[.16] text-text"; // pending
}

export default function PaymentsManager({
  families,
  payments,
  justPaid,
}: {
  families: FamilyLite[];
  payments: PaymentRow[];
  justPaid: boolean;
}) {
  const [familyId, setFamilyId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setErr(null);
    setLink(null);
    const dollars = parseFloat(amount);
    if (isNaN(dollars) || dollars <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    setBusy(true);
    const res = await createCheckoutSession({
      familyId,
      amountCents: Math.round(dollars * 100),
      description: note.trim(),
    });
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setLink(res.url);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mx-auto max-w-[860px]">
      {justPaid && (
        <div className="mb-4 rounded-lg border border-success/40 bg-success/[.10] px-3 py-2 text-[13px] text-success">
          Payment completed. It will appear in the list below once Stripe
          confirms it.
        </div>
      )}

      {/* Take a payment */}
      <section className="mb-6 rounded-[16px] border border-line bg-paper p-5">
        <div className="mb-3 font-display text-[18px] font-extrabold tracking-[-.01em] text-text">
          Take a Payment
        </div>

        {err && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {err}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div>
            <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
              Family
            </div>
            <select
              value={familyId}
              onChange={(e) => {
                setFamilyId(e.target.value);
                setLink(null);
              }}
              className="pf"
            >
              <option value="">Select a family</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.family_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="w-[140px]">
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Amount ($)
              </div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="pf"
              />
            </div>
            <div className="flex-1">
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Note (shown to payer)
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Private lesson"
                className="pf"
              />
            </div>
          </div>

          <div>
            <button
              onClick={createLink}
              disabled={busy || !familyId}
              className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create Payment Link"}
            </button>
          </div>
        </div>

        {link && (
          <div className="mt-4 rounded-[12px] border border-line bg-bg/50 p-4">
            <div className="mb-2 font-display text-[12px] font-extrabold tracking-[.02em] text-accent">
              Payment link ready
            </div>
            <div className="mb-3 break-all rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[12px] text-text">
              {link}
            </div>
            <div className="flex flex-wrap gap-[9px]">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-[9px] border border-accent bg-accent px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white"
              >
                Open Payment Page
              </a>
              <button
                onClick={copyLink}
                className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent"
              >
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-muted">
              Open it on the desk tablet for the parent to pay, or text them the
              link.
            </div>
          </div>
        )}
      </section>

      {/* Recent payments */}
      <div className="mb-[10px] font-display text-[18px] font-extrabold tracking-[-.01em] text-text">
        Recent Payments
      </div>
      {payments.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          No payments yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-bold text-text">
                  {p.family_name}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {p.paid_at ? clock(p.paid_at) : clock(p.created_at)}
                  {p.payment_method ? ` · ${titleCase(p.payment_method)}` : ""}
                </div>
              </div>
              <span
                className={`rounded-[5px] px-[7px] py-[3px] font-display text-[10px] font-extrabold uppercase tracking-[.03em] ${statusClass(
                  p.status
                )}`}
              >
                {titleCase(p.status)}
              </span>
              <div className="tnum w-[90px] text-right font-display text-[15px] font-extrabold text-text">
                {money(p.amount_cents)}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .pf{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .pf:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}
