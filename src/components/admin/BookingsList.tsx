"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { moneyExact, clock } from "@/lib/format";
import EditBookingModal, {
  type EditableBooking,
} from "@/components/admin/EditBookingModal";
import { cancelManyBookings } from "@/lib/data/bulk-booking-actions";
import type { Asset, Coach, Service, FamilyLite } from "@/lib/data/resources";
import type { BookingType } from "@/lib/data/booking-type-actions";

export type BookingListRow = {
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
  service_name: string;
  coach_name: string;
  space_name: string;
};

type Filter = "upcoming" | "past" | "cancelled" | "all";

const STATUS_STYLE: Record<string, string> = {
  confirmed: "text-accent",
  in_progress: "text-accent",
  completed: "text-muted",
  no_show: "text-danger",
  cancelled: "text-muted line-through",
  tentative: "text-gold",
};

export default function BookingsList({
  bookings,
  assets,
  coaches,
  services,
  families,
  bookingTypes,
}: {
  bookings: BookingListRow[];
  assets: Asset[];
  coaches: Coach[];
  services: Service[];
  families: FamilyLite[];
  bookingTypes: BookingType[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<EditableBooking | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const now = Date.now();

  const filtered = useMemo(() => {
    let rows = bookings;
    if (filter === "upcoming")
      rows = rows.filter(
        (b) =>
          b.status !== "cancelled" && new Date(b.start_time).getTime() >= now
      );
    else if (filter === "past")
      rows = rows.filter(
        (b) =>
          b.status !== "cancelled" && new Date(b.start_time).getTime() < now
      );
    else if (filter === "cancelled")
      rows = rows.filter((b) => b.status === "cancelled");

    const term = q.trim().toLowerCase();
    if (term)
      rows = rows.filter(
        (b) =>
          b.who.toLowerCase().includes(term) ||
          b.service_name.toLowerCase().includes(term) ||
          b.coach_name.toLowerCase().includes(term) ||
          b.space_name.toLowerCase().includes(term)
      );
    return rows;
  }, [bookings, filter, q, now]);

  function dayLabel(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function toggleSel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(filtered.filter((b) => b.status !== "cancelled").map((b) => b.id)));
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
    setConfirmCancel(false);
    setBulkErr(null);
  }

  async function cancelSelected() {
    setBusy(true);
    setBulkErr(null);
    const res = await cancelManyBookings([...selected]);
    setBusy(false);
    if (res.error) {
      setBulkErr(res.error);
      return;
    }
    exitSelect();
    router.refresh();
  }

  const TABS: { key: Filter; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "past", label: "Past" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`whitespace-nowrap rounded-[9px] border px-[14px] py-[7px] font-display text-[12px] font-extrabold tracking-[.02em] ${
                filter === t.key
                  ? "border-ink bg-ink text-white"
                  : "border-line-2 bg-paper text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
          className={`whitespace-nowrap rounded-[9px] border px-[14px] py-[7px] font-display text-[12px] font-extrabold tracking-[.02em] ${
            selectMode
              ? "border-accent bg-accent text-white"
              : "border-line-2 bg-paper text-text hover:border-accent"
          }`}
        >
          {selectMode ? "Done" : "Select"}
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by family, service, coach, space"
        className="mb-3 w-full rounded-[9px] border border-line-2 bg-paper px-3 py-[9px] text-[14px] text-text outline-none focus:border-accent"
      />

      {selectMode && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[12px] border border-accent/30 bg-accent/[.06] px-3 py-[10px]">
          <div className="flex-1 font-display text-[13px] font-extrabold text-text">
            {selected.size} selected
          </div>
          <button
            onClick={selectAllVisible}
            className="rounded-[8px] border border-line-2 bg-paper px-[12px] py-[7px] font-display text-[11px] font-extrabold text-text hover:border-accent"
          >
            Select all shown
          </button>
          {confirmCancel ? (
            <>
              <button
                onClick={cancelSelected}
                disabled={busy || selected.size === 0}
                className="rounded-[8px] border border-danger bg-danger px-[12px] py-[7px] font-display text-[11px] font-extrabold text-white disabled:opacity-50"
              >
                {busy ? "Cancelling…" : `Cancel ${selected.size}`}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="rounded-[8px] border border-line-2 bg-paper px-[12px] py-[7px] font-display text-[11px] font-extrabold text-text"
              >
                Keep
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={selected.size === 0}
              className="rounded-[8px] border border-line-2 bg-paper px-[12px] py-[7px] font-display text-[11px] font-extrabold text-danger hover:border-danger disabled:opacity-40"
            >
              Cancel selected
            </button>
          )}
        </div>
      )}

      {bulkErr && (
        <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {bulkErr}
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-display text-[15px] font-extrabold text-text">
              No bookings
            </div>
            <div className="mt-1 text-[13px] text-muted">
              Nothing matches this filter.
            </div>
          </div>
        ) : (
          filtered.map((b) => {
            const isSel = selected.has(b.id);
            const isCancelled = b.status === "cancelled";
            return (
              <button
                key={b.id}
                onClick={() => {
                  if (selectMode) {
                    if (!isCancelled) toggleSel(b.id);
                  } else {
                    setEditing({
                      id: b.id,
                      booking_number: b.booking_number,
                      asset_id: b.asset_id,
                      coach_id: b.coach_id,
                      service_id: b.service_id,
                      family_id: b.family_id,
                      booking_type: b.booking_type,
                      notes: b.notes,
                      start_time: b.start_time,
                      end_time: b.end_time,
                      status: b.status,
                      total_cents: b.total_cents,
                      who: b.who,
                    });
                  }
                }}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-bg ${
                  isSel ? "bg-accent/[.06]" : ""
                }`}
              >
                {selectMode && (
                  <span
                    className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-extrabold ${
                      isCancelled
                        ? "border-line bg-bg text-line-2"
                        : isSel
                        ? "border-accent bg-accent text-white"
                        : "border-line-2 bg-paper text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-display text-[15px] font-bold text-text">
                    {b.who}
                  </div>
                  <div className="truncate text-[13px] text-muted">
                    {b.service_name} · {b.space_name} · {b.coach_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[13px] font-bold text-text">
                    {dayLabel(b.start_time)}
                  </div>
                  <div className="tnum text-[12px] text-muted">
                    {clock(b.start_time)}
                  </div>
                </div>
                <div
                  className={`w-[78px] text-right font-display text-[11px] font-extrabold capitalize ${
                    STATUS_STYLE[b.status] ?? "text-muted"
                  }`}
                >
                  {b.status.replace(/_/g, " ")}
                </div>
              </button>
            );
          })
        )}
      </div>

      {editing && (
        <EditBookingModal
          booking={editing}
          assets={assets}
          coaches={coaches}
          services={services}
          families={families}
          bookingTypes={bookingTypes}
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
