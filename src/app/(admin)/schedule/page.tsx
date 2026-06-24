import { createClient } from "@/lib/supabase/server";
import {
  getAssets,
  getCoaches,
  getServices,
  getSpaceCoverage,
} from "@/lib/data/resources";
import { ymd } from "@/lib/format";
import DateNav from "@/components/admin/DateNav";
import ScheduleGrid, {
  type GridBooking,
} from "@/components/admin/ScheduleGrid";

export const dynamic = "force-dynamic";

type Joined = {
  id: string;
  booking_number: number | null;
  asset_id: string;
  coach_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  total_cents: number | null;
  booking_type: string | null;
  half_slot: number | null;
  services: { name: string } | null;
  coach: { full_name: string } | null;
  families: { family_name: string } | null;
};

function endHourCeil(iso: string): number {
  const d = new Date(iso);
  return d.getMinutes() > 0 ? d.getHours() + 1 : d.getHours();
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam ?? ymd(new Date());

  const start = new Date(date + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const supabase = await createClient();
  const [assets, coaches, services, coverage] = await Promise.all([
    getAssets(),
    getCoaches(),
    getServices(),
    getSpaceCoverage(),
  ]);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, booking_number, asset_id, coach_id, service_id, start_time, end_time,
       status, total_cents, booking_type, half_slot,
       services ( name ),
       coach:users!bookings_coach_id_fkey ( full_name ),
       families ( family_name )`
    )
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .not("status", "in", "(cancelled)")
    .order("start_time", { ascending: true });

  const rows = ((data as unknown) as Joined[]) ?? [];

  const bookings: GridBooking[] = rows.map((b) => ({
    id: b.id,
    booking_number: b.booking_number,
    asset_id: b.asset_id,
    coach_id: b.coach_id,
    service_id: b.service_id,
    start_time: b.start_time,
    end_time: b.end_time,
    status: b.status,
    total_cents: b.total_cents ?? 0,
    who:
      b.families?.family_name ??
      (b.booking_type
        ? b.booking_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Session"),
    service_name: b.services?.name ?? "—",
    coach_name: b.coach?.full_name ?? "Unassigned",
    start_hour: new Date(b.start_time).getHours(),
    end_hour: endHourCeil(b.end_time),
    half_slot: b.half_slot,
    booking_type: b.booking_type ?? null,
  }));

  return (
    <div className="mx-auto max-w-[1180px]">
      <DateNav date={date} />
      {error && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Could not load schedule: {error.message}
        </div>
      )}
      {assets.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line-2 bg-paper p-10 text-center text-muted">
          <b className="mb-[5px] block font-display text-[16px] text-text">
            No spaces configured
          </b>
          Add assets in Settings to see the schedule grid.
        </div>
      ) : (
        <ScheduleGrid
          date={date}
          assets={assets}
          bookings={bookings}
          coaches={coaches}
          services={services}
          coverage={coverage}
        />
      )}
    </div>
  );
}
