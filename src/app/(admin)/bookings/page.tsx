import { createClient } from "@/lib/supabase/server";
import { getAssets, getCoaches, getServices } from "@/lib/data/resources";
import BookingsList, {
  type BookingListRow,
} from "@/components/admin/BookingsList";

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
  assets: { name: string } | null;
  services: { name: string } | null;
  coach: { full_name: string } | null;
  families: { family_name: string } | null;
};

export default async function BookingsPage() {
  const supabase = await createClient();
  const [assets, coaches, services] = await Promise.all([
    getAssets(),
    getCoaches(),
    getServices(),
  ]);

  const { data } = await supabase
    .from("bookings")
    .select(
      `id, booking_number, asset_id, coach_id, service_id, start_time, end_time,
       status, total_cents, booking_type,
       assets ( name ),
       services ( name ),
       coach:users!bookings_coach_id_fkey ( full_name ),
       families ( family_name )`
    )
    .order("start_time", { ascending: false })
    .limit(500);

  const rows = ((data as unknown) as Joined[]) ?? [];

  const bookings: BookingListRow[] = rows.map((b) => ({
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
      (b.booking_type ? b.booking_type.replace(/_/g, " ") : "Session"),
    service_name: b.services?.name ?? "—",
    coach_name: b.coach?.full_name ?? "Unassigned",
    space_name: b.assets?.name ?? "—",
  }));

  return (
    <BookingsList
      bookings={bookings}
      assets={assets}
      coaches={coaches}
      services={services}
    />
  );
}
