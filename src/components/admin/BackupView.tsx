"use client";

import { useState } from "react";

export default function BackupView({
  rows,
  totalRows,
}: {
  rows: { table: string; count: number }[];
  totalRows: number;
}) {
  const [busy, setBusy] = useState<"" | "excel" | "json">("");

  function download(kind: "excel" | "json") {
    setBusy(kind);
    const url = `/api/backup/${kind}`;
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setBusy(""), 4000);
  }

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-[760px]">
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-[16px] border border-line bg-paper p-5">
          <div className="font-display text-[16px] font-extrabold text-text">
            Business Data (Excel)
          </div>
          <p className="mt-[6px] flex-1 text-[13px] leading-[1.5] text-muted">
            One spreadsheet with a tab for every part of the business: clients,
            athletes, bookings, payments, memberships, and more. Opens in Excel
            or Google Sheets. Best for an accountant or a handoff.
          </p>
          <button
            onClick={() => download("excel")}
            disabled={busy !== ""}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-[10px] border border-ink bg-ink px-5 font-display text-[13px] font-extrabold tracking-[.02em] text-white disabled:opacity-50"
          >
            {busy === "excel" ? "Preparing…" : "Download Excel"}
          </button>
        </div>

        <div className="flex flex-col rounded-[16px] border border-line bg-paper p-5">
          <div className="font-display text-[16px] font-extrabold text-text">
            Full Backup (Technical)
          </div>
          <p className="mt-[6px] flex-1 text-[13px] leading-[1.5] text-muted">
            A complete machine-readable copy of every table and record. This is
            the disaster-recovery file a developer would use to rebuild the
            system. Keep it, even if you never open it.
          </p>
          <button
            onClick={() => download("json")}
            disabled={busy !== ""}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-[10px] border border-line-2 bg-paper px-5 font-display text-[13px] font-extrabold tracking-[.02em] text-text hover:border-accent disabled:opacity-50"
          >
            {busy === "json" ? "Preparing…" : "Download Full Backup"}
          </button>
        </div>
      </div>

      <div className="rounded-[16px] border border-line bg-paper p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <div className="font-display text-[13px] font-extrabold uppercase tracking-[.03em] text-accent">
            What&apos;s Included
          </div>
          <div className="font-display text-[12px] font-bold text-muted">
            {totalRows.toLocaleString()} records · {today}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="py-4 text-[13px] text-muted">
            No data yet. Once you add clients and bookings, they&apos;ll show
            here and be included in every backup.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {rows.map((r) => (
              <div
                key={r.table}
                className="flex items-baseline justify-between border-b border-line py-[6px] text-[12.5px]"
              >
                <span className="capitalize text-text">
                  {r.table.replace(/_/g, " ")}
                </span>
                <span className="font-display font-bold tabular-nums text-muted">
                  {r.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 rounded-[10px] border border-line bg-paper px-[14px] py-[12px] text-[12px] leading-[1.5] text-muted">
        These downloads are a manual snapshot taken the moment you click. For
        automatic daily backups, the facility&apos;s database can be upgraded to
        a paid tier at launch. Until then, run a backup here whenever you want a
        safe copy, and store it somewhere off this computer.
      </div>
    </div>
  );
}
