import { createClient } from "@/lib/supabase/server";
import KpiCard from "@/components/admin/KpiCard";
import AgendaRow, { type AgendaItem } from "@/components/admin/AgendaRow";

export const dynamic = "force-dynamic";

function dayBounds() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100);
}

function clock(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

type Joined = {
  id: string;
  start_time: string | null;
  status: string | null;
  booking_type: string | null;
  checked_in_at: string | null;
  total_cents: number | null;
  assets: { name: string } | null;
  services: { name: string } | null;
  coach: { full_name: string } | null;
  families: { family_name: string } | null;
};

function SectionHead({ eyebrow, count }: { eyebrow: string; count: string }) {
  return (
    <div className="mb-[14px] flex items-baseline justify-between">
      <div className="font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        {eyebrow}
      </div>
      <div className="font-display text-[12px] font-bold text-muted">{count}</div>
    </div>
  );
}

export default async function TodayPage() {
  const supabase = await createClient();
  const { startIso, endIso } = dayBounds();

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `id, start_time, status, booking_type, checked_in_at, total_cents,
       assets ( name ),
       services ( name ),
       coach:users!bookings_coach_id_fkey ( full_name ),
       families ( family_name )`
    )
    .gte("start_time", startIso)
    .lt("start_time", endIso)
    .not("status", "in", "(cancelled)")
    .order("start_time", { ascending: true });

  const rows = ((data as unknown) as Joined[]) ?? [];

  const sessions = rows.length;
  const revenue = rows.reduce((s, b) => s + (b.total_cents ?? 0), 0);
  const checkedIn = rows.filter((b) => b.checked_in_at).length;
  const attention = rows.filter(
    (b) => b.status === "tentative" || b.status === "no_show"
  );

  function toItem(b: Joined): AgendaItem {
    const who =
      b.families?.family_name ??
      (b.booking_type ? b.booking_type.replace(/_/g, " ") : "Session");
    return {
      id: b.id,
      athlete: who,
      service: b.services?.name ?? (b.booking_type?.replace(/_/g, " ") ?? "Session"),
      coach: b.coach?.full_name ?? "Unassigned",
      space: b.assets?.name ?? "TBD",
      time: clock(b.start_time),
      rail: b.status === "no_show" ? "crit" : b.status === "tentative" ? "warn" : null,
    };
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      {error && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Could not load bookings: {error.message}
        </div>
      )}

      <div className="mb-[30px] grid grid-cols-2 gap-[14px] md:grid-cols-4">
        <KpiCard label="Sessions" value={String(sessions)} detail="Booked Today" />
        <KpiCard label="Revenue" value={money(revenue)} detail="Projected" />
        <KpiCard label="Checked In" value={String(checkedIn)} detail="Here Now" />
        <KpiCard
          label="Needs You"
          value={String(attention.length)}
          detail="Attention"
          bad
        />
      </div>

      {attention.length > 0 && (
        <section className="mb-[28px]">
          <SectionHead
            eyebrow="Needs Attention"
            count={`${attention.length} ${attention.length === 1 ? "Item" : "Items"}`}
          />
          <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
            {attention.map((b) => (
              <AgendaRow key={b.id} item={toItem(b)} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-[28px]">
        <SectionHead eyebrow="Today's Agenda" count="Next up" />
        <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
          {rows.length === 0 ? (
            <div className="px-[18px] py-[34px] text-center">
              <div className="font-display text-[16px] font-extrabold text-text">
                No bookings today
              </div>
              <div className="mt-1 text-[13px] text-muted">
                Nothing on the schedule yet.
              </div>
            </div>
          ) : (
            rows.map((b) => <AgendaRow key={b.id} item={toItem(b)} />)
          )}
        </div>
      </section>
    </div>
  );
}
