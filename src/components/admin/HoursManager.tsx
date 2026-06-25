"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateFacilityHours,
  updatePeakWindow,
  type FacilityDay,
  type PeakWindow,
} from "@/lib/data/hours-actions";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// minutes-from-midnight <-> "HH:MM" for the native time input
function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
// minutes -> readable "4:00 PM"
function minToClock(min: number): string {
  let h = Math.floor(min / 60);
  const m = min % 60;
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

type Editing =
  | { kind: "day"; idx: number; field: "open" | "close" }
  | { kind: "peak"; field: "start" | "end" }
  | null;

export default function HoursManager({
  initialHours,
  initialPeak,
}: {
  initialHours: FacilityDay[];
  initialPeak: PeakWindow | null;
}) {
  const router = useRouter();

  // Ensure a full 7-day array even if the table is sparse.
  const seeded: FacilityDay[] = Array.from({ length: 7 }, (_, i) => {
    const found = initialHours.find((d) => d.day_of_week === i);
    return (
      found ?? {
        day_of_week: i,
        is_open: true,
        open_minute: 720,
        close_minute: 1260,
      }
    );
  });

  const [days, setDays] = useState<FacilityDay[]>(seeded);
  const [peak, setPeak] = useState<PeakWindow>(
    initialPeak ?? { peak_start_minute: 960, peak_end_minute: 1200 }
  );
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleDay(i: number) {
    setSaved(false);
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === i ? { ...d, is_open: !d.is_open } : d
      )
    );
  }

  function currentEditValue(): string {
    if (!editing) return "12:00";
    if (editing.kind === "day") {
      const d = days[editing.idx];
      return minToTime(editing.field === "open" ? d.open_minute : d.close_minute);
    }
    return minToTime(
      editing.field === "start" ? peak.peak_start_minute : peak.peak_end_minute
    );
  }

  function applyEdit(timeStr: string) {
    const min = timeToMin(timeStr);
    setSaved(false);
    if (editing?.kind === "day") {
      const { idx, field } = editing;
      setDays((prev) =>
        prev.map((d, i) =>
          i === idx
            ? {
                ...d,
                [field === "open" ? "open_minute" : "close_minute"]: min,
              }
            : d
        )
      );
    } else if (editing?.kind === "peak") {
      const { field } = editing;
      setPeak((p) => ({
        ...p,
        [field === "start" ? "peak_start_minute" : "peak_end_minute"]: min,
      }));
    }
    setEditing(null);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const r1 = await updateFacilityHours(days);
    if (r1.error) {
      setErr(r1.error);
      setBusy(false);
      return;
    }
    const r2 = await updatePeakWindow(peak);
    if (r2.error) {
      setErr(r2.error);
      setBusy(false);
      return;
    }
    setBusy(false);
    setSaved(true);
    router.refresh();
  }

  const editLabel =
    editing?.kind === "day"
      ? `${DAY_LABELS[editing.idx]} ${editing.field === "open" ? "Open" : "Close"}`
      : editing?.kind === "peak"
      ? `Peak ${editing.field === "start" ? "Start" : "End"}`
      : "";

  return (
    <div className="mx-auto max-w-[460px]">
      <div className="mb-[2px] font-display text-[23px] font-extrabold tracking-[-.01em] text-text">
        Hours
      </div>
      <div className="mb-[18px] text-[12.5px] text-muted">
        Settings › Hours
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="mb-[12px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        Operating Hours
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line bg-paper">
        {days.map((d, i) => (
          <div
            key={i}
            className="flex items-center gap-[10px] border-b border-line px-[14px] py-[13px] last:border-b-0"
          >
            <button
              onClick={() => toggleDay(i)}
              className={`relative h-[25px] w-[42px] flex-shrink-0 rounded-full transition-colors ${
                d.is_open ? "bg-accent" : "bg-line-2"
              }`}
              aria-label={`Toggle ${DAY_LABELS[i]}`}
            >
              <span
                className={`absolute top-[2.5px] h-[20px] w-[20px] rounded-full bg-white shadow transition-all ${
                  d.is_open ? "left-[19.5px]" : "left-[2.5px]"
                }`}
              />
            </button>
            <span
              className={`w-[46px] flex-shrink-0 font-display text-[15px] font-bold ${
                d.is_open ? "text-text" : "text-muted"
              }`}
            >
              {DAY_LABELS[i]}
            </span>

            {d.is_open ? (
              <div className="ml-auto flex items-center gap-[7px]">
                <button
                  onClick={() => setEditing({ kind: "day", idx: i, field: "open" })}
                  className="min-w-[78px] rounded-[9px] border border-line-2 bg-bg px-[10px] py-[7px] text-center text-[14px] font-semibold tabular-nums text-text"
                >
                  {minToClock(d.open_minute)}
                </button>
                <span className="text-[13px] text-muted">to</span>
                <button
                  onClick={() => setEditing({ kind: "day", idx: i, field: "close" })}
                  className="min-w-[78px] rounded-[9px] border border-line-2 bg-bg px-[10px] py-[7px] text-center text-[14px] font-semibold tabular-nums text-text"
                >
                  {minToClock(d.close_minute)}
                </button>
              </div>
            ) : (
              <span className="ml-auto text-[12.5px] italic text-muted">
                Closed
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mb-[12px] mt-[26px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        Peak Window
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line bg-paper">
        <div className="flex items-center gap-[8px] px-[14px] py-[14px]">
          <span className="font-display text-[15px] font-bold text-text">Peak</span>
          <div className="ml-auto flex items-center gap-[7px]">
            <button
              onClick={() => setEditing({ kind: "peak", field: "start" })}
              className="min-w-[78px] rounded-[9px] border border-line-2 bg-bg px-[10px] py-[7px] text-center text-[14px] font-semibold tabular-nums text-text"
            >
              {minToClock(peak.peak_start_minute)}
            </button>
            <span className="text-[13px] text-muted">to</span>
            <button
              onClick={() => setEditing({ kind: "peak", field: "end" })}
              className="min-w-[78px] rounded-[9px] border border-line-2 bg-bg px-[10px] py-[7px] text-center text-[14px] font-semibold tabular-nums text-text"
            >
              {minToClock(peak.peak_end_minute)}
            </button>
          </div>
        </div>
        <div className="px-[14px] pb-[14px] text-[12px] leading-[1.45] text-muted">
          Bookings inside this window are valued at your peak rate. Outside it,
          base rate. This feeds the Space Value numbers.
        </div>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="mt-[22px] w-full rounded-[12px] bg-accent py-[15px] font-display text-[16px] font-extrabold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save Hours"}
      </button>
      {saved && (
        <div className="mt-[10px] text-center text-[13px] font-semibold text-success">
          Saved
        </div>
      )}

      {/* time editor sheet */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-[460px] rounded-t-[18px] bg-white px-[16px] pb-[24px] pt-[18px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-[14px] text-center font-display text-[17px] font-extrabold text-text">
              {editLabel}
            </h3>
            <input
              type="time"
              defaultValue={currentEditValue()}
              onChange={(e) => {
                // store latest into a data attribute; commit on Done
                (e.target as HTMLInputElement).dataset.val = e.target.value;
              }}
              id="hours-time-input"
              className="w-full rounded-[10px] border border-line-2 px-[12px] py-[12px] text-center text-[22px]"
            />
            <button
              onClick={() => {
                const el = document.getElementById(
                  "hours-time-input"
                ) as HTMLInputElement | null;
                const val = el?.value ?? currentEditValue();
                applyEdit(val);
              }}
              className="mt-[16px] w-full rounded-[11px] bg-accent py-[13px] font-display text-[15px] font-extrabold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
