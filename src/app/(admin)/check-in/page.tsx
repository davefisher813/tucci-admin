import { createClient } from "@/lib/supabase/server";
import CheckInList, { type CheckInRow } from "@/components/admin/CheckInList";

export const dynamic = "force-dynamic";

type Joined = {
  id: string;
  start_time: string;
  status: string;
  checked_in_at: string | null;
  booking_type: string | null;
  assets: { name: string } | null;
  services: { name: string } | null;
  families: { family_name: string } | null;
};

export default async function CheckInPage() {
  const supabase = await createClient();

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data } = await supabase
    .from("bookings")
    .select(
      `id, start_time, status, checked_in_at, booking_type,
       assets ( name ),
       services ( name ),
       families ( family_name )`
    )
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .not("status", "in", "(cancelled)")
    .order("start_time", { ascending: true });

  const joined = ((data as unknown) as Joined[]) ?? [];

  const rows: CheckInRow[] = joined.map((b) => ({
    id: b.id,
    start_time: b.start_time,
    status: b.status,
    checked_in_at: b.checked_in_at,
    who:
      b.families?.family_name ??
      (b.booking_type ? b.booking_type.replace(/_/g, " ") : "Session"),
    service_name: b.services?.name ?? "—",
    space_name: b.assets?.name ?? "—",
  }));

  return <CheckInList rows={rows} />;
}
