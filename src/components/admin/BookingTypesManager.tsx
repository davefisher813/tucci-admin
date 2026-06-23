"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBookingType,
  updateBookingType,
  deleteBookingType,
  setBookingTypeActive,
  type BookingType,
} from "@/lib/data/booking-type-actions";

export default function BookingTypesManager({
  types,
}: {
  types: BookingType[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#1E78A6");

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

  const nextSort =
    types.reduce((m, t) => Math.max(m, t.sort_order), 0) + 10;

  return (
    <section className="mx-auto mb-7 max-w-[760px]">
      <div className="mb-[14px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        Booking Types
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="mb-3 overflow-hidden rounded-[16px] border border-line bg-paper">
        {types.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No booking types yet. Add one below.
          </div>
        ) : (
          types.map((t) =>
            editing === t.id ? (
              <EditRow
                key={t.id}
                type={t}
                busy={busy}
                onCancel={() => setEditing(null)}
                onSave={async (lbl, clr) => {
                  const ok = await run(() =>
                    updateBookingType(t.id, { label: lbl, color: clr })
                  );
                  if (ok) setEditing(null);
                }}
              />
            ) : (
              <div
                key={t.id}
                className="flex items-center gap-3 border-b border-line px-4 py-[11px] last:border-b-0"
              >
                <span
                  className="h-[18px] w-[18px] flex-shrink-0 rounded-[6px] border border-line-2"
                  style={{ background: t.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-[14px] font-bold text-text">
                    {t.label}
                    {t.is_block && (
                      <span className="ml-2 rounded-full bg-bg px-2 py-[1px] font-display text-[10px] font-extrabold text-muted">
                        Built-in
                      </span>
                    )}
                    {!t.is_active && (
                      <span className="ml-2 rounded-full bg-bg px-2 py-[1px] font-display text-[10px] font-extrabold text-muted">
                        Off
                      </span>
                    )}
                  </div>
                </div>
                {!t.is_block && (
                  <button
                    onClick={() =>
                      run(() => setBookingTypeActive(t.id, !t.is_active))
                    }
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[5px] font-display text-[11px] font-extrabold text-text hover:border-accent disabled:opacity-40"
                  >
                    {t.is_active ? "Turn off" : "Turn on"}
                  </button>
                )}
                <button
                  onClick={() => setEditing(t.id)}
                  disabled={busy}
                  className="rounded-[8px] border border-line-2 px-3 py-[5px] font-display text-[11px] font-extrabold text-text hover:border-accent disabled:opacity-40"
                >
                  Edit
                </button>
                {!t.is_block && (
                  <button
                    onClick={() => run(() => deleteBookingType(t.id))}
                    disabled={busy}
                    className="rounded-[8px] border border-line-2 px-3 py-[5px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
                  >
                    Remove
                  </button>
                )}
              </div>
            )
          )
        )}
      </div>

      <div className="rounded-[16px] border border-line bg-paper p-4">
        <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
          Add Booking Type
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Birthday Party"
            className="bt-sel flex-1"
          />
          <label className="flex items-center gap-2 text-[12px] font-medium text-muted">
            Color
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-line-2 bg-paper"
            />
          </label>
          <button
            onClick={async () => {
              if (!label.trim()) return setErr("Enter a name.");
              const ok = await run(() =>
                createBookingType({
                  label: label.trim(),
                  color,
                  sort_order: nextSort,
                })
              );
              if (ok) {
                setLabel("");
                setColor("#1E78A6");
              }
            }}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <style>{`
        .bt-sel{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .bt-sel:focus{border-color:var(--accent);}
      `}</style>
    </section>
  );
}

function EditRow({
  type,
  busy,
  onCancel,
  onSave,
}: {
  type: BookingType;
  busy: boolean;
  onCancel: () => void;
  onSave: (label: string, color: string) => void;
}) {
  const [label, setLabel] = useState(type.label);
  const [color, setColor] = useState(type.color);
  return (
    <div className="flex flex-col gap-3 border-b border-line bg-bg/40 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="bt-sel flex-1"
      />
      <label className="flex items-center gap-2 text-[12px] font-medium text-muted">
        Color
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-line-2 bg-paper"
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => label.trim() && onSave(label.trim(), color)}
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
  );
}
