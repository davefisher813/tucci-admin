"use client";

import { useState } from "react";

export type AgendaItem = {
  id: string;
  athlete: string;
  service: string;
  coach: string;
  space: string;
  time: string;
  rail?: "warn" | "crit" | null;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AgendaRow({ item }: { item: AgendaItem }) {
  const [open, setOpen] = useState(false);
  const rail =
    item.rail === "crit"
      ? "border-l-danger"
      : item.rail === "warn"
        ? "border-l-gold"
        : "border-l-transparent";

  return (
    <div className={`border-b border-line border-l-[3px] last:border-b-0 ${rail}`}>
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-[14px] px-[18px] py-[15px] transition-colors hover:bg-bg"
      >
        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-sky/[.14] font-display text-[13px] font-extrabold text-accent">
          {initials(item.athlete)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-bold text-text">
            {item.athlete}
          </div>
          <div className="mt-[3px] text-[13px] font-semibold text-muted">
            {item.service} · {item.coach} · {item.space}
          </div>
        </div>
        <div className="tnum font-display text-[15px] font-extrabold text-text">
          {item.time}
        </div>
        <span
          className={`text-[19px] text-line-2 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </div>

      {open && (
        <div className="px-[18px] pb-[17px] pt-[2px]">
          <div className="mb-[14px] grid grid-cols-4 gap-px overflow-hidden rounded-[12px] border border-line bg-line">
            {[
              ["Service", item.service],
              ["Coach", item.coach],
              ["Space", item.space],
              ["Time", item.time],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 bg-paper px-[14px] py-3">
                <span className="font-display text-[10px] font-extrabold tracking-[.01em] text-accent">
                  {k}
                </span>
                <span className="text-[13px] font-semibold text-text">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-[9px]">
            <button className="inline-flex h-8 items-center rounded-[9px] border border-ink bg-ink px-[13px] font-display text-[11px] font-extrabold tracking-[.03em] text-white">
              Check In
            </button>
            <button className="inline-flex h-8 items-center rounded-[9px] border border-line-2 bg-paper px-[13px] font-display text-[11px] font-extrabold tracking-[.03em] text-text hover:border-accent">
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
