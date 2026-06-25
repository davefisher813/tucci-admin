"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { moneyExact } from "@/lib/format";
import { updateBooking, cancelBooking } from "@/lib/data/booking-actions";
import {
  getSeriesInfo,
  updateManyBookings,
  cancelSeries,
  type SeriesInfo,
  type BookingUpdate,
} from "@/lib/data/bulk-booking-actions";
import type { Asset, Coach, Service, FamilyLite } from "@/lib/data/resources";
import type { BookingType } from "@/lib/data/booking-type-actions";

export type EditableBooking = {
  id: string;
  booking_number: number | null;
  asset_id: string;
  coach_id: string | null;
  service_id: string | null;
  family_id: string | null;
  booking_type: string | null;
  notes: string | null;
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
  families,
  bookingTypes,
  onClose,
}: {
  booking: EditableBooking;
  assets: Asset[];
  coaches: Coach[];
  services: Service[];
  families: FamilyLite[];
  bookingTypes: BookingType[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [assetId, setAssetId] = useState(booking.asset_id);
  const [coachId, setCoachId] = useState(booking.coach_id ?? "");
  const [serviceId, setServiceId] = useState(booking.service_id ?? "");
  const [clientId, setClientId] = useState(booking.family_id ?? "");
  const [typeKey, setTypeKey] = useState(booking.booking_type ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [start, setStart] = useState(toLocalInput(booking.start_time));
  const [end, setEnd] = useState(toLocalInput(booking.end_time));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [series, setSeries] = useState<SeriesInfo | null>(null);
  const [scope, setScope] = useState<"this" | "future">("this");
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    let active = true;
    getSeriesInfo(booking.id).then((s) => {
      if (active) setSeries(s);
    });
    return () => {
      active = false;
    };
  }, [booking.id]);

  const inSeries = !!series?.groupId && series.total > 1;
  const applyFuture = inSeries && scope === "future";

  async function save() {
    setBusy(true);
    setErr(null);
    const startISO = new Date(start).toISOString();
    const endISO = new Date(end).toISOString();

    // Always save this booking in full, including its details.
    const res = await updateBooking({
      id: booking.id,
      asset_id: assetId,
      coach_id: coachId || null,
      service_id: serviceId || null,
      family_id: clientId || null,
      booking_type: typeKey || null,
      notes: notes.trim() || null,
      start_time: startISO,
      end_time: endISO,
    });
    if (res.error) {
      setBusy(false);
      setErr(res.error);
      return;
    }

    // When applying to the whole series, propagate space/coach/service/time
    // to the remaining future bookings.
    if (applyFuture && series) {
      const ns = new Date(start);
      const sh = ns.getHours();
      const sm = ns.getMinutes();
      const durMs = new Date(end).getTime() - new Date(start).getTime();
      const timeChanged =
        startISO !== new Date(booking.start_time).toISOString() ||
        endISO !== new Date(booking.end_time).toISOString();

      const updates: BookingUpdate[] = series.future
        .filter((f) => f.id !== booking.id)
        .map((f) => {
          const u: BookingUpdate = { id: f.id };
          if (assetId !== booking.asset_id) u.asset_id = assetId;
          if ((coachId || null) !== booking.coach_id)
            u.coach_id = coachId || null;
          if ((serviceId || null) !== booking.service_id)
            u.service_id = serviceId || null;
          if (timeChanged) {
            const d = new Date(f.start_time);
            const s2 = new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate(),
              sh,
              sm,
              0,
              0
            );
            const e2 = new Date(s2.getTime() + durMs);
            u.start_time = s2.toISOString();
            u.end_time = e2.toISOString();
          }
          return u;
        });

      const r2 = await updateManyBookings(updates);
      setBusy(false);
      if (r2.error) {
        setErr(r2.error);
        return;
      }
      if (r2.skipped.length > 0) {
        setErr(
          `Updated ${r2.updated + 1}, skipped ${r2.skipped.length} (conflict). The rest are saved.`
        );
        router.refresh();
        return;
      }
      router.refresh();
      onClose();
      return;
    }

    setBusy(false);
    router.refresh();
    onClose();
  }

  async function doCancel() {
    setBusy(true);
    setErr(null);
    if (applyFuture && series?.groupId) {
      const res = await cancelSeries(series.groupId, booking.start_time);
      setBusy(false);
      if (res.error) {
        setErr(res.error);
        return;
      }
      router.refresh();
      onClose();
      return;
    }
    const res = await cancelBooking(booking.id);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  function duplicate() {
    const d = new Date(booking.start_time);
    const durH =
      (new Date(booking.end_time).getTime() -
        new Date(booking.start_time).getTime()) /
      3600000;
    const p = new URLSearchParams({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`,
      asset: booking.asset_id,
      hour: String(d.getHours()),
      dur: String(durH),
    });
    if (booking.service_id) p.set("service", booking.service_id);
    if (booking.coach_id) p.set("coach", booking.coach_id);
    router.push(`/new-booking?${p.toString()}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-auto rounded-[16px] border border-line bg-paper p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 font-display text-[10px] font-extrabold tracking-[.02em] text-accent">
          Booking {booking.booking_number ? `#${booking.booking_number}` : ""}
        </div>
        <div className="mb-3 font-display text-[20px] font-extrabold text-text">
          {booking.who}
        </div>

        {inSeries && (
          <div className="mb-4 rounded-[10px] border border-accent/30 bg-accent/[.06] p-3">
            <div className="mb-2 font-display text-[12px] font-extrabold text-accent">
              Part of a recurring series · {series?.total} bookings
            </div>
            <div className="flex rounded-[8px] border border-line-2 bg-paper">
              <button
                type="button"
                onClick={() => setScope("this")}
                className={`flex-1 rounded-[7px] px-2 py-[7px] font-display text-[11px] font-extrabold ${
                  scope === "this" ? "bg-ink text-white" : "text-muted"
                }`}
              >
                This booking
              </button>
              <button
                type="button"
                onClick={() => setScope("future")}
                className={`flex-1 rounded-[7px] px-2 py-[7px] font-display text-[11px] font-extrabold ${
                  scope === "future" ? "bg-ink text-white" : "text-muted"
                }`}
              >
                This + all future ({series?.future.length})
              </button>
            </div>
          </div>
        )}

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
          <Field label="Client">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="sel"
            >
              <option value="">None</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.family_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Booking Type">
            <select
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
              className="sel"
            >
              <option value="">Default</option>
              {bookingTypes.map((t) => (
                <option key={t.id} value={t.key}>
                  {t.label}
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
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="sel"
              style={{ minHeight: "56px", resize: "vertical" }}
              placeholder="Notes for this booking"
            />
          </Field>
          {applyFuture && (
            <p className="text-[11.5px] text-muted">
              Time changes re-apply to each future date; space, service, and
              coach changes apply to all future bookings.
            </p>
          )}
          <div className="flex items-center justify-between border-t border-line pt-3">
            <span className="text-[12px] text-muted">Total</span>
            <span className="tnum font-display text-[15px] font-extrabold text-text">
              {moneyExact(booking.total_cents)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-[9px]">
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={duplicate}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent disabled:opacity-50"
          >
            Duplicate
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent disabled:opacity-50"
          >
            Close
          </button>

          {confirmCancel ? (
            <div className="ml-auto flex items-center gap-[6px]">
              <button
                onClick={doCancel}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-[9px] border border-danger bg-danger px-[12px] font-display text-[11px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
              >
                {applyFuture ? "Cancel series" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[12px] font-display text-[11px] font-extrabold tracking-[.03em] text-text"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={busy || booking.status === "cancelled"}
              className="ml-auto inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-danger hover:border-danger disabled:opacity-40"
            >
              {applyFuture ? "Cancel Series" : "Cancel Booking"}
            </button>
          )}
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
