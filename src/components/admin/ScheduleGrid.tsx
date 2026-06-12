"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { hourLabel } from "@/lib/format";
import EditBookingModal, {
  type EditableBooking,
} from "@/components/admin/EditBookingModal";
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
};

const START_HOUR = 8;
const END_HOUR = 21; // 8 AM through 9 PM rows

const STRIPE =
  "repeating-linear-gradient(45deg, var(--line) 0 6px, transparent 6px 12px)";

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
    <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
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
              onEdit={(b) => setEditing(toEditable(b))}
              onCreate={(assetId, portion) =>
                router.push(newBookingHref(assetId, h, portion))
              }
            />
          ))}
        </div>
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
    </div>
  );
}

function RowFragment({
  hour,
  assets,
  cellMap,
  blocked,
  splittable,
  railClass,
  onEdit,
  onCreate,
}: {
  hour: number;
  assets: Asset[];
  cellMap: Map<string, GridBooking[]>;
  blocked: Map<string, string>;
  splittable: Map<string, boolean | undefined>;
  railClass: (s: string) => string;
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
                onClick={() => onCreate(a.id)}
                aria-label={`Book ${a.name} at ${hourLabel(hour)}`}
                className="h-full w-full transition-colors hover:bg-sky/[.08]"
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
