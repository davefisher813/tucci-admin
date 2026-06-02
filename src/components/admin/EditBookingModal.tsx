"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moneyExact } from "@/lib/format";
import { updateBooking, cancelBooking } from "@/lib/data/booking-actions";
import type { Asset, Coach, Service } from "@/lib/data/resources";

export type EditableBooking = {
  id: string;
  booking_number: number | null;
  asset_id: string;
  coach_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  total_cents: number;
  who: string;
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

export default function EditBookingModal({
  booking,
  assets,
  coaches,
  services,
  onClose,
}: {
  booking: EditableBooking;
  assets: Asset[];
  coaches: Coach[];
  services: Service[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(booking.asset_id);
  const [coachId, setCoachId] = useState(booking.coach_id ?? "");
  const [serviceId, setServiceId] = useState(booking.service_id ?? "");
  const [start, setStart] = useState(toLocalInput(booking.start_time));
  const [end, setEnd] = useState(toLocalInput(booking.end_time));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await updateBooking({
      id: booking.id,
      asset_id: assetId,
      coach_id: coachId || null,
      service_id: serviceId || null,
      start_time: new Date(start).toISOString(),
      end_time: new Date(end).toISOString(),
    });
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  async function doCancel() {
    setBusy(true);
    setErr(null);
    const res = await cancelBooking(booking.id);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[16px] border border-line bg-paper p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 font-display text-[10px] font-extrabold tracking-[.02em] text-accent">
          Booking {booking.booking_number ? `#${booking.booking_number}` : ""}
        </div>
        <div className="mb-4 font-display text-[20px] font-extrabold text-text">
          {booking.who}
        </div>

        {err && (
          <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {err}
          </div>
        )}

        <div className="space-y-3">
          <Field label="Space">
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="sel"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Service">
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="sel"
            >
              <option value="">None</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Coach">
            <select
              value={coachId}
              onChange={(e) => setCoachId(e.target.value)}
              className="sel"
            >
              <option value="">Unassigned</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="sel"
              />
            </Field>
            <Field label="End">
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="sel"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-[12px] text-muted">Total</span>
            <span className="tnum font-display text-[15px] font-extrabold text-text">
              {moneyExact(booking.total_cents)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-[9px]">
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent"
          >
            Close
          </button>
          <button
            onClick={doCancel}
            disabled={busy || booking.status === "cancelled"}
            className="ml-auto inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-danger hover:border-danger disabled:opacity-40"
          >
            Cancel Booking
          </button>
        </div>
      </div>
      <style>{`
        .sel{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:8px 11px;outline:none;font-family:var(--fs);font-size:13px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
        {label}
      </div>
      {children}
    </div>
  );
}
