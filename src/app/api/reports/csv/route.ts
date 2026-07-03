import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOwnerOrNull } from "@/lib/auth/guard";

// Date-ranged booking/revenue CSV for the accountant. Owner-only.
// GET /api/reports/csv?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const owner = await getOwnerOrNull();
  if (!owner) return new NextResponse("Forbidden", { status: 403 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (!from || !to) return new NextResponse("Missing range", { status: 400 });

  const lower = new Date(`${from}T00:00:00`).toISOString();
  const upperDate = new Date(`${to}T00:00:00`);
  upperDate.setDate(upperDate.getDate() + 1);
  const upper = upperDate.toISOString();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `start_time, end_time, status, booking_type, total_cents, paid_at, paid_method,
       assets ( name ), services ( name ), families ( family_name ),
       coach:users!bookings_coach_id_fkey ( full_name ), coach_name`
    )
    .gte("start_time", lower)
    .lt("start_time", upper)
    .order("start_time", { ascending: true });

  if (error) return new NextResponse(error.message, { status: 500 });

  type Row = {
    start_time: string;
    end_time: string;
    status: string;
    booking_type: string | null;
    total_cents: number | null;
    paid_at: string | null;
    paid_method: string | null;
    assets: { name: string } | null;
    services: { name: string } | null;
    families: { family_name: string } | null;
    coach: { full_name: string } | null;
    coach_name: string | null;
  };
  const rows = ((data as unknown) as Row[]) ?? [];

  const esc = (v: string | null | undefined) => {
    const t = (v ?? "").replace(/"/g, '""');
    return `"${t}"`;
  };

  const header =
    "Date,Start,End,Client,Service,Space,Coach,Type,Status,Paid,Paid Method,Total";
  const lines = rows.map((r) => {
    const d = new Date(r.start_time);
    const date = d.toLocaleDateString("en-US");
    const t1 = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const t2 = new Date(r.end_time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const total = ((r.total_cents ?? 0) / 100).toFixed(2);
    return [
      esc(date),
      esc(t1),
      esc(t2),
      esc(r.families?.family_name ?? ""),
      esc(r.services?.name ?? ""),
      esc(r.assets?.name ?? ""),
      esc(r.coach?.full_name ?? r.coach_name ?? ""),
      esc(r.booking_type ?? ""),
      esc(r.status),
      esc(r.paid_at ? "Yes" : "No"),
      esc(r.paid_method ?? ""),
      total,
    ].join(",");
  });

  const csv = [header, ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tucci_revenue_${from}_${to}.csv"`,
    },
  });
}
