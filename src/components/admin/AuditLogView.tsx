"use client";

import { useMemo, useState } from "react";

export type AuditRow = {
  id: number;
  tableName: string;
  recordId: string | null;
  action: string;
  changedAt: string;
  actor: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
};

type Filter = "all" | "insert" | "update" | "delete";

// Friendly names for the raw table names in the log.
const TABLE_LABEL: Record<string, string> = {
  bookings: "Booking",
  families: "Client",
  athletes: "Athlete",
  users: "User",
  memberships: "Membership",
  payments: "Payment",
  services: "Service",
  assets: "Space",
  promo_codes: "Promo Code",
  booking_types: "Booking Type",
};

const ACTION_META: Record<
  string,
  { label: string; box: string; text: string }
> = {
  insert: { label: "Created", box: "bg-success/[.15]", text: "text-success" },
  update: { label: "Updated", box: "bg-sky/[.18]", text: "text-accent" },
  delete: { label: "Deleted", box: "bg-danger/[.12]", text: "text-danger" },
};

function tableLabel(t: string): string {
  return TABLE_LABEL[t] ?? t.replace(/_/g, " ");
}

// Turn before/after JSON into a short human summary of what changed.
function summarize(row: AuditRow): string {
  if (row.action === "insert") return `New ${tableLabel(row.tableName).toLowerCase()} added`;
  if (row.action === "delete") return `${tableLabel(row.tableName)} removed`;
  // update: list changed fields
  const before = row.beforeState ?? {};
  const after = row.afterState ?? {};
  const changed: string[] = [];
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key.replace(/_/g, " "));
    }
  }
  if (changed.length === 0) return "Updated";
  if (changed.length <= 3) return `Changed ${changed.join(", ")}`;
  return `Changed ${changed.slice(0, 3).join(", ")} +${changed.length - 3} more`;
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "yesterday";
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function AuditLogView({ rows }: { rows: AuditRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");

  const shown = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.action === filter)),
    [rows, filter]
  );

  const chips: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "insert", label: "Created" },
    { key: "update", label: "Updated" },
    { key: "delete", label: "Deleted" },
  ];

  return (
    <div>
      <div className="mb-1 font-display text-[22px] font-extrabold tracking-[-.01em] text-text">
        Audit Log
      </div>
      <div className="mb-4 text-[13px] text-muted">
        Every data change, newest first. Owner and Manager only.
      </div>

      <div className="mb-4 flex flex-wrap gap-[6px]">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`rounded-[9px] border px-[13px] py-[7px] font-display text-[12px] font-extrabold tracking-[.02em] ${
              filter === c.key
                ? "border-ink bg-ink text-white"
                : "border-line-2 bg-paper text-muted hover:border-accent"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {shown.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            Nothing to show.
          </div>
        ) : (
          shown.map((r) => {
            const meta = ACTION_META[r.action] ?? {
              label: r.action,
              box: "bg-line",
              text: "text-muted",
            };
            return (
              <div
                key={r.id}
                className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0"
              >
                <span
                  className={`mt-[1px] shrink-0 rounded-[6px] px-2 py-[3px] font-display text-[10px] font-extrabold ${meta.box} ${meta.text}`}
                >
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[14px] font-bold text-text">
                    {tableLabel(r.tableName)}
                  </div>
                  <div className="truncate text-[12px] text-muted">
                    {summarize(r)} &middot; by {r.actor}
                  </div>
                </div>
                <span className="ml-auto shrink-0 whitespace-nowrap text-[11px] tabular-nums text-muted">
                  {relTime(r.changedAt)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
