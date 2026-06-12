import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import KioskCheckIn, { type KioskRow } from "@/components/admin/KioskCheckIn";

export const dynamic = "force-dynamic";

type Joined = {
  id: string;
  start_time: string;
  checked_in_at: string | null;
  booking_type: string | null;
  assets: { name: string } | null;
  services: { name: string } | null;
  families: { family_name: string } | null;
};

function fmtTime(iso: string): string {
  const t = new Date(iso);
  const h = t.getHours();
  const m = t.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default async function KioskPage() {
  // Requires a staff session. family -> /unauthorized, signed out -> /login.
  await requireRole();
  const supabase = await createClient();

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data } = await supabase
    .from("bookings")
    .select(
      `id, start_time, checked_in_at, booking_type,
       assets ( name ),
       services ( name ),
       families ( family_name )`
    )
    .gte("start_time", start.toISOString())
    .lt("start_time", end.toISOString())
    .not("status", "in", "(cancelled)")
    .order("start_time", { ascending: true });

  const joined = ((data as unknown) as Joined[]) ?? [];

  const rows: KioskRow[] = joined.map((b) => ({
    id: b.id,
    who:
      b.families?.family_name ??
      (b.booking_type
        ? b.booking_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Session"),
    time: fmtTime(b.start_time),
    service_name: b.services?.name ?? "—",
    space_name: b.assets?.name ?? "—",
    checkedIn: b.checked_in_at != null,
  }));

  return <KioskCheckIn rows={rows} />;
}
