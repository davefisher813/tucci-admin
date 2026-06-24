"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { hourLabel, ymd } from "@/lib/format";
import EditBookingModal, {
  type EditableBooking,
} from "@/components/admin/EditBookingModal";
import { checkInBooking, undoCheckIn } from "@/lib/data/checkin-actions";
import { cancelBooking } from "@/lib/data/booking-actions";
import type { Asset, Coach, Service } from "@/lib/data/resources";

export type GridBooking = {
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
  service_name: string;
  coach_name: string;
  start_hour: number;
  end_hour: number;
  half_slot: number | null;
  booking_type?: string | null;
};

const START_HOUR = 8;
const END_HOUR = 21; // 8 AM through 9 PM rows

const STRIPE =
  "repeating-linear-gradient(45deg, var(--line) 0 6px, transparent 6px 12px)";

// Compact clock: "8:00a", "12:30p"
function fmtClock(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "p" : "a";
  h = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h}:00${ap}` : `${h}:${String(m).padStart(2, "0")}${ap}`;
}

function shiftDay(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export default function ScheduleGrid({
  date,
  assets,
  bookings,
  coaches,
  services,
  coverage,
}: {
  date: string;
  assets: Asset[];
  bookings: GridBooking[];
  coaches: Coach[];
  services: Service[];
  coverage: Record<string, string[]>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditableBooking | null>(null);

  // Multi-select (desktop): drag across empty cells, or tap one.
  const [sel, setSel] = useState<Set<string>>(new Set()); // `${assetId}@${hour}`
  const dragging = useRef(false);
  const anchor = useRef<{ c: number; r: number } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const assetName = new Map(assets.map((a) => [a.id, a.name]));
  const splittable = new Map(assets.map((a) => [a.id, a.is_splittable]));

  // Bookings grouped by asset + start hour (a split cell can hold two halves).
  const cellMap = new Map<string, GridBooking[]>();
  for (const b of bookings) {
    const k = `${b.asset_id}@${b.start_hour}`;
    const arr = cellMap.get(k);
    if (arr) arr.push(b);
    else cellMap.set(k, [b]);
  }

  // cage@hour -> covering field name, while that field is booked across the hour.
  const blocked = new Map<string, string>();
  for (const b of bookings) {
    const covers = coverage[b.asset_id];
    if (!covers || covers.length === 0) continue;
    for (let h = b.start_hour; h < b.end_hour; h++) {
      for (const childId of covers) {
        blocked.set(`${childId}@${h}`, assetName.get(b.asset_id) ?? "Field");
      }
    }
  }

  function newBookingHref(
    assetId: string,
    hour: number,
    portion?: "half"
  ): string {
    const params = new URLSearchParams({
      date,
      asset: assetId,
      hour: String(hour),
    });
    if (portion) params.set("portion", portion);
    return `/new-booking?${params.toString()}`;
  }

  const colOf = (aid: string) => assets.findIndex((a) => a.id === aid);
  const isOpen = (aid: string, h: number) =>
    !cellMap.has(`${aid}@${h}`) && !blocked.has(`${aid}@${h}`);

  function rectSet(a: { c: number; r: number }, b: { c: number; r: number }) {
    const c0 = Math.min(a.c, b.c),
      c1 = Math.max(a.c, b.c),
      r0 = Math.min(a.r, b.r),
      r1 = Math.max(a.r, b.r);
    const s = new Set<string>();
    for (let c = c0; c <= c1; c++) {
      for (let r = r0; r <= r1; r++) {
        const aid = assets[c]?.id;
        const h = START_HOUR + r;
        if (aid && isOpen(aid, h)) s.add(`${aid}@${h}`);
      }
    }
    return s;
  }

  function cellDown(aid: string, h: number) {
    const key = `${aid}@${h}`;
    if (sel.size === 1 && sel.has(key)) {
      setSel(new Set());
      dragging.current = false;
      anchor.current = null;
      return;
    }
    dragging.current = true;
    moved.current = false;
    anchor.current = { c: colOf(aid), r: h - START_HOUR };
    setSel(new Set([key]));
  }

  function cellEnter(aid: string, h: number) {
    if (!dragging.current || !anchor.current) return;
    moved.current = true;
    setSel(rectSet(anchor.current, { c: colOf(aid), r: h - START_HOUR }));
  }

  function selSpaces(): string[] {
    return assets
      .filter((a) => [...sel].some((k) => k.startsWith(a.id + "@")))
      .map((a) => a.name);
  }
  function selHourSpan(): { h0: number; dur: number } {
    const hrs = [...new Set([...sel].map((k) => Number(k.split("@")[1])))].sort(
      (x, y) => x - y
    );
    const h0 = hrs[0] ?? START_HOUR;
    return { h0, dur: (hrs[hrs.length - 1] ?? h0) + 1 - h0 };
  }
  function openForm(block: boolean) {
    const aids = assets
      .filter((a) => [...sel].some((k) => k.startsWith(a.id + "@")))
      .map((a) => a.id);
    const { h0, dur } = selHourSpan();
    const p = new URLSearchParams({
      date,
      assets: aids.join(","),
      hour: String(h0),
      dur: String(dur),
    });
    if (block) p.set("block", "1");
    router.push(`/new-booking?${p.toString()}`);
  }

  function railClass(status: string): string {
    if (status === "no_show") return "border-l-danger bg-danger/[.08]";
    if (status === "tentative") return "border-l-gold bg-gold/[.10]";
    return "border-l-accent bg-sky/[.10]";
  }

  function toEditable(b: GridBooking): EditableBooking {
    return {
      id: b.id,
      booking_number: b.booking_number,
      asset_id: b.asset_id,
      coach_id: b.coach_id,
      service_id: b.service_id,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      total_cents: b.total_cents,
      who: b.who,
    };
  }

  return (
    <>
      {/* Desktop / tablet: full grid */}
      <div className="hidden overflow-hidden rounded-[16px] border border-line bg-paper md:block">
        <div className="overflow-auto">
          <div
            className="grid min-w-max"
            style={{
              gridTemplateColumns: `66px repeat(${assets.length}, minmax(132px, 1fr))`,
              gridAutoRows: "58px",
            }}
          >
            <div className="border-b border-r border-line" />
            {assets.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-center border-b border-r border-line px-1 py-2 text-center font-display text-[11px] font-extrabold text-text last:border-r-0"
              >
                {a.name}
              </div>
            ))}

            {hours.map((h) => (
              <RowFragment
                key={h}
                hour={h}
                assets={assets}
                cellMap={cellMap}
                blocked={blocked}
                splittable={splittable}
                railClass={railClass}
                sel={sel}
                onCellDown={cellDown}
                onCellEnter={cellEnter}
                onEdit={(b) => setEditing(toEditable(b))}
                onCreate={(assetId, portion) =>
                  router.push(newBookingHref(assetId, h, portion))
                }
              />
            ))}
          </div>
        </div>
      </div>

      {sel.size > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 hidden w-[min(640px,92vw)] -translate-x-1/2 items-center gap-3 rounded-[14px] border border-line-2 bg-paper px-4 py-3 shadow-2xl md:flex">
          <div className="min-w-0 flex-1">
            <div className="font-display text-[14.5px] font-extrabold text-text">
              {sel.size} slot{sel.size === 1 ? "" : "s"}
            </div>
            <div className="truncate text-[12px] text-muted">
              {(() => {
                const sp = selSpaces();
                const { h0, dur } = selHourSpan();
                const spaceTxt =
                  sp.length <= 2 ? sp.join(", ") : `${sp.length} spaces`;
                return `${spaceTxt} · ${hourLabel(h0)}–${hourLabel(h0 + dur)}`;
              })()}
            </div>
          </div>
          <button
            onClick={() => setSel(new Set())}
            className="px-2 font-display text-[12px] font-bold text-muted hover:text-text"
          >
            Clear
          </button>
          <button
            onClick={() => openForm(true)}
            className="h-10 rounded-[10px] border border-line-2 bg-paper px-[14px] font-display text-[12px] font-extrabold tracking-[.02em] text-text hover:border-accent"
          >
            Block Off
          </button>
          <button
            onClick={() => openForm(false)}
            className="h-10 rounded-[10px] border border-ink bg-ink px-[14px] font-display text-[12px] font-extrabold tracking-[.02em] text-white"
          >
            New Booking
          </button>
        </div>
      )}

      {/* Phone: agenda */}
      <div className="md:hidden">
        <MobileAgenda
          date={date}
          bookings={bookings}
          assetName={assetName}
          onEditBooking={(b) => setEditing(toEditable(b))}
        />
      </div>

      {editing && (
        <EditBookingModal
          booking={editing}
          assets={assets}
          coaches={coaches}
          services={services}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function RowFragment({
  hour,
  assets,
  cellMap,
  blocked,
  splittable,
  railClass,
  sel,
  onCellDown,
  onCellEnter,
  onEdit,
  onCreate,
}: {
  hour: number;
  assets: Asset[];
  cellMap: Map<string, GridBooking[]>;
  blocked: Map<string, string>;
  splittable: Map<string, boolean | undefined>;
  railClass: (s: string) => string;
  sel: Set<string>;
  onCellDown: (assetId: string, hour: number) => void;
  onCellEnter: (assetId: string, hour: number) => void;
  onEdit: (b: GridBooking) => void;
  onCreate: (assetId: string, portion?: "half") => void;
}) {
  return (
    <>
      <div className="flex items-start justify-end whitespace-nowrap border-b border-r border-line py-[5px] pr-2 text-right font-display text-[11px] font-bold tabular-nums text-muted">
        {hourLabel(hour)}
      </div>
      {assets.map((a) => {
        const list = cellMap.get(`${a.id}@${hour}`) ?? [];
        const blockName = blocked.get(`${a.id}@${hour}`);
        const whole = list.find((b) => b.half_slot == null);

        return (
          <div
            key={a.id}
            className="border-b border-r border-line last:border-r-0"
          >
            {whole ? (
              <BookingBlock b={whole} railClass={railClass} onEdit={onEdit} />
            ) : list.length > 0 ? (
              <HalfCell
                list={list}
                railClass={railClass}
                onEdit={onEdit}
                onCreate={() => onCreate(a.id, "half")}
              />
            ) : blockName ? (
              <div
                className="m-[3px] flex h-[calc(100%-6px)] flex-col items-center justify-center rounded-[9px] border border-line-2 text-center"
                style={{ background: STRIPE }}
              >
                <div className="font-display text-[10px] font-extrabold text-muted">
                  Blocked
                </div>
                <div className="text-[10px] text-muted">{blockName}</div>
              </div>
            ) : (
              <button
                onMouseDown={() => onCellDown(a.id, hour)}
                onMouseEnter={() => onCellEnter(a.id, hour)}
                aria-label={`Select ${a.name} at ${hourLabel(hour)}`}
                className={`h-full w-full transition-colors ${
                  sel.has(`${a.id}@${hour}`) ? "" : "hover:bg-sky/[.08]"
                }`}
                style={
                  sel.has(`${a.id}@${hour}`)
                    ? {
                        background: "rgba(245,197,24,.18)",
                        boxShadow: "inset 0 0 0 2px var(--gold)",
                      }
                    : undefined
                }
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function BookingBlock({
  b,
  railClass,
  onEdit,
}: {
  b: GridBooking;
  railClass: (s: string) => string;
  onEdit: (b: GridBooking) => void;
}) {
  if (b.booking_type === "blocked") {
    return (
      <button
        onClick={() => onEdit(b)}
        className="m-[3px] block w-[calc(100%-6px)] overflow-hidden rounded-[9px] border border-line-2 px-[9px] py-[7px] text-left transition-colors hover:border-accent"
        style={{ background: STRIPE }}
      >
        <div className="truncate font-display text-[12.5px] font-extrabold text-muted">
          Blocked
        </div>
        <div className="truncate text-[11px] text-muted">Unavailable</div>
      </button>
    );
  }
  return (
    <button
      onClick={() => onEdit(b)}
      className={`m-[3px] block w-[calc(100%-6px)] overflow-hidden rounded-[9px] border-l-[3px] px-[9px] py-[7px] text-left transition-colors hover:border-accent ${railClass(
        b.status
      )}`}
    >
      <div className="truncate font-display text-[12.5px] font-extrabold text-text">
        {b.who}
      </div>
      <div className="truncate text-[11px] text-muted">
        {b.service_name} · {b.coach_name}
      </div>
    </button>
  );
}

function HalfCell({
  list,
  railClass,
  onEdit,
  onCreate,
}: {
  list: GridBooking[];
  railClass: (s: string) => string;
  onEdit: (b: GridBooking) => void;
  onCreate: () => void;
}) {
  const slot1 = list.find((b) => b.half_slot === 1) ?? null;
  const slot2 = list.find((b) => b.half_slot === 2) ?? null;
  const sides: (GridBooking | null)[] = [slot1, slot2];
  if (!slot1 && !slot2 && list.length > 0) sides[0] = list[0];

  return (
    <div className="flex h-full gap-[3px] p-[3px]">
      {sides.map((b, i) => (
        <div key={i} className="min-w-0 flex-1">
          {b ? (
            <button
              onClick={() => onEdit(b)}
              className={`block h-full w-full overflow-hidden rounded-[8px] border-l-[3px] px-[7px] py-[5px] text-left transition-colors hover:border-accent ${railClass(
                b.status
              )}`}
            >
              <div className="truncate font-display text-[11.5px] font-extrabold text-text">
                {b.who}
              </div>
              <span className="mt-[2px] inline-block rounded-[4px] bg-accent/[.10] px-[4px] text-[9px] font-bold text-accent">
                ½
              </span>
            </button>
          ) : (
            <button
              onClick={onCreate}
              aria-label="Book open half"
              className="flex h-full w-full items-center justify-center rounded-[8px] border border-dashed border-line-2 text-[16px] text-line-2 transition-colors hover:border-accent hover:text-accent"
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Mobile agenda ----------------------------- */

function MobileAgenda({
  date,
  bookings,
  assetName,
  onEditBooking,
}: {
  date: string;
  bookings: GridBooking[];
  assetName: Map<string, string>;
  onEditBooking: (b: GridBooking) => void;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<GridBooking | null>(null);
  const nowRef = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const todayYmd = ymd(new Date());
  const isToday = date === todayYmd;
  const nowMs = Date.now();

  const items = [...bookings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  let nowIndex = items.findIndex(
    (b) => new Date(b.start_time).getTime() >= nowMs
  );
  if (nowIndex === -1) nowIndex = items.length;

  useEffect(() => {
    if (isToday && nowRef.current) {
      nowRef.current.scrollIntoView({ block: "center" });
    }
  }, [date, isToday]);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      router.push(`/schedule?date=${shiftDay(date, dx < 0 ? 1 : -1)}`);
    }
  }

  const nowLine = (
    <div
      ref={nowRef}
      className="flex items-center gap-2 bg-paper px-3 py-[5px]"
    >
      <span className="font-display text-[10px] font-extrabold uppercase tracking-[.05em] text-danger">
        Now
      </span>
      <span className="h-px flex-1 bg-danger/50" />
    </div>
  );

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex-1 text-[13px] font-medium text-muted">
          {items.length === 0
            ? "No sessions"
            : `${items.length} session${items.length > 1 ? "s" : ""}`}
          {isToday ? " today" : ""}
        </div>
        {!isToday && (
          <button
            onClick={() => router.push(`/schedule?date=${todayYmd}`)}
            className="rounded-[9px] border border-line-2 bg-paper px-[12px] py-[8px] font-display text-[12px] font-extrabold text-text hover:border-accent"
          >
            Today
          </button>
        )}
        <button
          onClick={() => router.push(`/new-booking?date=${date}`)}
          className="inline-flex items-center gap-[5px] rounded-[9px] border border-ink bg-ink px-[13px] py-[8px] font-display text-[12px] font-extrabold text-white"
        >
          <span className="text-[15px] leading-none">+</span> New
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          <b className="mb-[5px] block font-display text-[15px] text-text">
            Nothing scheduled
          </b>
          Tap + New to book a session.
        </div>
      ) : (
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="overflow-hidden rounded-[16px] border border-line bg-paper"
        >
          {items.map((b, i) => (
            <div key={b.id}>
              {isToday && i === nowIndex && nowLine}
              <AgendaRow
                b={b}
                assetName={assetName}
                past={new Date(b.end_time).getTime() < nowMs}
                onOpen={() => setSheet(b)}
              />
            </div>
          ))}
          {isToday && nowIndex >= items.length && nowLine}
        </div>
      )}

      {sheet && (
        <ActionSheet
          b={sheet}
          assetName={assetName}
          onClose={() => setSheet(null)}
          onEdit={() => {
            const b = sheet;
            setSheet(null);
            onEditBooking(b);
          }}
          onChanged={() => {
            setSheet(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AgendaRow({
  b,
  assetName,
  past,
  onOpen,
}: {
  b: GridBooking;
  assetName: Map<string, string>;
  past: boolean;
  onOpen: () => void;
}) {
  const arrived = b.status === "in_progress";
  const isBlock = b.booking_type === "blocked";
  const rail = isBlock
    ? "bg-line-2"
    : b.status === "no_show"
    ? "bg-danger"
    : b.status === "tentative"
    ? "bg-gold"
    : "bg-accent";
  const hasCoach = !isBlock && b.coach_name && b.coach_name !== "Unassigned";

  return (
    <button
      onClick={onOpen}
      className={`flex w-full items-stretch gap-3 border-b border-line px-3 py-3 text-left last:border-b-0 active:bg-bg/40 ${
        past ? "opacity-60" : ""
      }`}
    >
      <div className="w-[50px] flex-shrink-0 pt-[1px] text-right">
        <div className="font-display text-[14px] font-bold tabular-nums text-text">
          {fmtClock(b.start_time)}
        </div>
        <div className="mt-[2px] text-[11.5px] tabular-nums text-muted">
          {fmtClock(b.end_time)}
        </div>
      </div>
      <div className={`w-[3px] flex-shrink-0 rounded-full ${rail}`} />
      <div className="min-w-0 flex-1 self-center">
        <div className="flex items-center gap-[6px]">
          <span
            className={`h-[7px] w-[7px] flex-shrink-0 rounded-full ${
              arrived ? "bg-accent" : "border border-line-2"
            }`}
          />
          <span className="truncate font-display text-[15px] font-bold text-text">
            {b.who}
          </span>
          {b.status === "no_show" && (
            <span className="flex-shrink-0 rounded-[4px] bg-danger/[.12] px-[5px] text-[9px] font-extrabold uppercase tracking-[.03em] text-danger">
              No-show
            </span>
          )}
          {b.status === "tentative" && (
            <span className="flex-shrink-0 rounded-[4px] bg-gold/[.18] px-[5px] text-[9px] font-extrabold uppercase tracking-[.03em] text-text">
              Tentative
            </span>
          )}
        </div>
        <div className="truncate text-[12.5px] text-muted">
          {assetName.get(b.asset_id) ?? "Space"} ·{" "}
          {isBlock ? "Unavailable" : b.service_name}
        </div>
        {hasCoach && (
          <div className="truncate text-[12px] text-muted">{b.coach_name}</div>
        )}
      </div>
      <span className="self-center font-display text-[20px] text-line-2">›</span>
    </button>
  );
}

function ActionSheet({
  b,
  assetName,
  onClose,
  onEdit,
  onChanged,
}: {
  b: GridBooking;
  assetName: Map<string, string>;
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const arrived = b.status === "in_progress";
  const hasCoach = b.coach_name && b.coach_name !== "Unassigned";

  async function toggleCheckIn() {
    setBusy(true);
    setErr(null);
    const res = arrived
      ? await undoCheckIn(b.id)
      : await checkInBooking(b.id, "staff");
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    onChanged();
  }

  async function doCancel() {
    setBusy(true);
    setErr(null);
    const res = await cancelBooking(b.id);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full rounded-t-[20px] border-t border-line bg-paper p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-2" />

        <div className="font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
          {b.who}
        </div>
        <div className="mt-[3px] text-[13px] text-muted">
          {fmtClock(b.start_time)} to {fmtClock(b.end_time)} ·{" "}
          {assetName.get(b.asset_id) ?? "Space"}
        </div>
        <div className="text-[13px] text-muted">
          {b.service_name}
          {hasCoach ? ` · ${b.coach_name}` : ""}
        </div>
        {arrived && (
          <div className="mt-[8px] inline-flex items-center gap-[6px] rounded-[6px] bg-success/[.14] px-[8px] py-[3px] font-display text-[11px] font-extrabold uppercase tracking-[.03em] text-success">
            Checked in
          </div>
        )}

        {err && (
          <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {err}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-[10px]">
          <button
            onClick={toggleCheckIn}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-[11px] border border-ink bg-ink font-display text-[13px] font-extrabold tracking-[.02em] text-white disabled:opacity-50"
          >
            {busy ? "Working…" : arrived ? "Undo Check-in" : "Check In"}
          </button>

          <button
            onClick={onEdit}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center rounded-[11px] border border-line-2 bg-paper font-display text-[13px] font-extrabold tracking-[.02em] text-text hover:border-accent disabled:opacity-50"
          >
            Edit
          </button>

          {confirmCancel ? (
            <div className="flex gap-[10px]">
              <button
                onClick={doCancel}
                disabled={busy}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-[11px] border border-danger bg-danger font-display text-[13px] font-extrabold tracking-[.02em] text-white disabled:opacity-50"
              >
                {busy ? "Working…" : "Yes, cancel"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                disabled={busy}
                className="inline-flex h-12 flex-1 items-center justify-center rounded-[11px] border border-line-2 bg-paper font-display text-[13px] font-extrabold tracking-[.02em] text-text disabled:opacity-50"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-[11px] font-display text-[13px] font-extrabold tracking-[.02em] text-danger disabled:opacity-50"
            >
              Cancel booking
            </button>
          )}

          <button
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center font-display text-[12px] font-bold tracking-[.02em] text-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
