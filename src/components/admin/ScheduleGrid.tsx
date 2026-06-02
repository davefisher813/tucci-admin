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
};

const START_HOUR = 8;
const END_HOUR = 21; // 8 AM through 9 PM rows

export default function ScheduleGrid({
  date,
  assets,
  bookings,
  coaches,
  services,
}: {
  date: string;
  assets: Asset[];
  bookings: GridBooking[];
  coaches: Coach[];
  services: Service[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditableBooking | null>(null);

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const byCell = new Map<string, GridBooking>();
  for (const b of bookings) byCell.set(`${b.asset_id}@${b.start_hour}`, b);

  function newBookingHref(assetId: string, hour: number): string {
    const params = new URLSearchParams({
      date,
      asset: assetId,
      hour: String(hour),
    });
    return `/new-booking?${params.toString()}`;
  }

  function railClass(status: string): string {
    if (status === "no_show") return "border-l-danger bg-danger/[.08]";
    if (status === "tentative") return "border-l-gold bg-gold/[.10]";
    return "border-l-accent bg-sky/[.10]";
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
      <div className="overflow-auto">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `58px repeat(${assets.length}, minmax(132px, 1fr))`,
            gridAutoRows: "56px",
          }}
        >
          {/* header row */}
          <div className="border-b border-r border-line" />
          {assets.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-center border-b border-r border-line px-1 py-2 text-center font-display text-[11px] font-extrabold text-text last:border-r-0"
            >
              {a.name}
            </div>
          ))}

          {/* hour rows */}
          {hours.map((h) => (
            <RowFragment
              key={h}
              hour={h}
              assets={assets}
              byCell={byCell}
              railClass={railClass}
              onEdit={(b) =>
                setEditing({
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
                })
              }
              onCreate={(assetId) => router.push(newBookingHref(assetId, h))}
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
  byCell,
  railClass,
  onEdit,
  onCreate,
}: {
  hour: number;
  assets: Asset[];
  byCell: Map<string, GridBooking>;
  railClass: (s: string) => string;
  onEdit: (b: GridBooking) => void;
  onCreate: (assetId: string) => void;
}) {
  return (
    <>
      <div className="border-b border-r border-line py-[5px] pr-2 text-right font-display text-[11px] font-bold tabular-nums text-muted">
        {hourLabel(hour)}
      </div>
      {assets.map((a) => {
        const b = byCell.get(`${a.id}@${hour}`);
        return (
          <div
            key={a.id}
            className="border-b border-r border-line last:border-r-0"
          >
            {b ? (
              <button
                onClick={() => onEdit(b)}
                className={`m-[3px] block w-[calc(100%-6px)] overflow-hidden rounded-[9px] border-l-[3px] px-[9px] py-[7px] text-left transition-colors hover:border-accent ${railClass(b.status)}`}
              >
                <div className="truncate font-display text-[12.5px] font-extrabold text-text">
                  {b.who}
                </div>
                <div className="truncate text-[11px] text-muted">
                  {b.service_name} · {b.coach_name}
                </div>
              </button>
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
