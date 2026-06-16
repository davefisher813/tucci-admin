"use client";

import { useState } from "react";
import type { FamilyLite } from "@/lib/data/resources";
import {
  createSubscriptionCheckout,
  setCancelAtPeriodEnd,
} from "@/lib/data/membership-actions";

type Tier = "monthly" | "family" | "team";

export type MembershipRow = {
  id: string;
  family_name: string;
  tier: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
};

const TIERS: { key: Tier; name: string; price: string; blurb: string }[] = [
  { key: "monthly", name: "Monthly", price: "$199/mo", blurb: "Single athlete" },
  { key: "family", name: "Family", price: "$299/mo", blurb: "Up to 4 family members" },
  { key: "team", name: "Team", price: "$599/mo", blurb: "Full team, 10+ players" },
];

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function fmtDate(d: string | null): string {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status: string): string {
  if (status === "active") return "bg-success/[.14] text-success";
  if (status === "past_due") return "bg-danger/[.12] text-danger";
  return "bg-line-2 text-muted"; // cancelled, paused
}

export default function MembershipsManager({
  families,
  memberships,
  justStarted,
}: {
  families: FamilyLite[];
  memberships: MembershipRow[];
  justStarted: boolean;
}) {
  const [familyId, setFamilyId] = useState("");
  const [tier, setTier] = useState<Tier>("monthly");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState<string | null>(null);

  async function createLink() {
    setErr(null);
    setLink(null);
    if (!familyId) {
      setErr("Pick a family.");
      return;
    }
    setBusy(true);
    const res = await createSubscriptionCheckout({ familyId, tier });
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

  async function toggleCancel(m: MembershipRow) {
    setRowErr(null);
    setRowBusy(m.id);
    const res = await setCancelAtPeriodEnd({
      membershipId: m.id,
      subscriptionId: m.stripe_subscription_id,
      cancel: !m.cancel_at_period_end,
    });
    if (res.error) {
      setRowBusy(null);
      setRowErr(res.error);
      return;
    }
    // Refresh to show the updated state from the server.
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-[920px]">
      {justStarted && (
        <div className="mb-4 rounded-lg border border-success/40 bg-success/[.10] px-3 py-2 text-[13px] text-success">
          Membership signup completed. It will appear below once Stripe confirms
          the subscription.
        </div>
      )}

      {/* Tier reference */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.key} className="rounded-[16px] border border-line bg-paper p-4">
            <div className="font-display text-[15px] font-extrabold text-text">
              {t.name}
            </div>
            <div className="tnum font-display text-[22px] font-extrabold tracking-[-.02em] text-accent">
              {t.price}
            </div>
            <div className="mt-[2px] text-[12px] text-muted">{t.blurb}</div>
          </div>
        ))}
      </div>

      {/* Start a membership */}
      <section className="mb-6 rounded-[16px] border border-line bg-paper p-5">
        <div className="mb-3 font-display text-[18px] font-extrabold tracking-[-.01em] text-text">
          Start a Membership
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
              className="mf"
            >
              <option value="">Select a family</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.family_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
              Tier
            </div>
            <select
              value={tier}
              onChange={(e) => {
                setTier(e.target.value as Tier);
                setLink(null);
              }}
              className="mf"
            >
              {TIERS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name} · {t.price}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={createLink}
              disabled={busy || !familyId}
              className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create Signup Link"}
            </button>
          </div>
        </div>

        {link && (
          <div className="mt-4 rounded-[12px] border border-line bg-bg/50 p-4">
            <div className="mb-2 font-display text-[12px] font-extrabold tracking-[.02em] text-accent">
              Signup link ready
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
                Open Signup Page
              </a>
              <button
                onClick={copyLink}
                className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent"
              >
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
            <div className="mt-2 text-[11px] text-muted">
              Open it for the parent, or text them the link to subscribe.
            </div>
          </div>
        )}
      </section>

      {/* Current memberships */}
      <div className="mb-[10px] font-display text-[18px] font-extrabold tracking-[-.01em] text-text">
        Current Memberships
      </div>

      {rowErr && (
        <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {rowErr}
        </div>
      )}

      {memberships.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          No memberships yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
          {memberships.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-bold text-text">
                  {m.family_name}
                </div>
                <div className="truncate text-[12px] text-muted">
                  {titleCase(m.tier)}
                  {m.current_period_end
                    ? m.cancel_at_period_end
                      ? ` · ends ${fmtDate(m.current_period_end)}`
                      : ` · renews ${fmtDate(m.current_period_end)}`
                    : ""}
                </div>
              </div>
              <span
                className={`rounded-[5px] px-[7px] py-[3px] font-display text-[10px] font-extrabold uppercase tracking-[.03em] ${statusClass(
                  m.status
                )}`}
              >
                {titleCase(m.status)}
              </span>
              <button
                onClick={() => toggleCancel(m)}
                disabled={rowBusy === m.id || m.status === "cancelled"}
                className="inline-flex h-9 items-center rounded-[8px] border border-line-2 bg-paper px-[12px] font-display text-[11px] font-extrabold tracking-[.02em] text-text hover:border-accent disabled:opacity-50"
              >
                {rowBusy === m.id
                  ? "…"
                  : m.cancel_at_period_end
                  ? "Resume"
                  : "Cancel"}
              </button>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .mf{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .mf:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}
