"use server";

import { createClient } from "@/lib/supabase/server";

export type ReportSummary = {
  revenueCollectedCents: number;
  refundsCents: number;
  bookedValueCents: number;
  bookingsCount: number;
  noShowCount: number;
  cancelledCount: number;
  byType: { type: string; count: number; valueCents: number }[];
  byMethod: { method: string; count: number; amountCents: number }[];
  bySource: {
    name: string;
    colorHex: string | null;
    count: number;
    valueCents: number;
  }[];
  outstandingCents: number;
};

function bounds(from: string, to: string) {
  const lower = new Date(`${from}T00:00:00`).toISOString();
  const upperD = new Date(`${to}T00:00:00`);
  upperD.setDate(upperD.getDate() + 1);
  const upper = upperD.toISOString();
  return { lower, upper };
}

const COLLECTED_STATUSES = ["paid", "partially_refunded", "refunded"];

export async function getReportSummary(
  from: string,
  to: string
): Promise<ReportSummary> {
  const supabase = await createClient();
  const { lower, upper } = bounds(from, to);

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select(
      "booking_type, status, total_cents, start_time, services ( category_id )"
    )
    .gte("start_time", lower)
    .lt("start_time", upper);

  const bookings =
    (bookingRows as unknown as {
      booking_type: string;
      status: string;
      total_cents: number | null;
      services: { category_id: string | null } | { category_id: string | null }[] | null;
    }[]) ?? [];

  // Category lookup for names + colors (the real, editable table).
  const { data: catRows } = await supabase
    .from("service_categories")
    .select("id, name, color_hex");
  const catMap = new Map(
    ((catRows as { id: string; name: string; color_hex: string | null }[]) ?? []).map(
      (c) => [c.id, { name: c.name, color: c.color_hex }]
    )
  );

  const { data: paymentRows } = await supabase
    .from("payments")
    .select("amount_cents, refund_amount_cents, status, payment_method, paid_at")
    .gte("paid_at", lower)
    .lt("paid_at", upper);

  const payments =
    (paymentRows as {
      amount_cents: number | null;
      refund_amount_cents: number | null;
      status: string;
      payment_method: string | null;
    }[]) ?? [];

  let bookedValueCents = 0;
  let bookingsCount = 0;
  let noShowCount = 0;
  let cancelledCount = 0;
  const typeMap = new Map<string, { count: number; valueCents: number }>();
  const sourceMap = new Map
    string,
    { name: string; colorHex: string | null; count: number; valueCents: number }
  >();

  for (const b of bookings) {
    if (b.status === "cancelled") {
      cancelledCount += 1;
      continue;
    }
    if (b.status === "no_show") noShowCount += 1;
    bookingsCount += 1;
    const v = b.total_cents ?? 0;
    bookedValueCents += v;
    const t = typeMap.get(b.booking_type) ?? { count: 0, valueCents: 0 };
    t.count += 1;
    t.valueCents += v;
    typeMap.set(b.booking_type, t);

    // revenue by source category (booking -> service -> category)
    const svc = Array.isArray(b.services) ? b.services[0] : b.services;
    const catId = svc?.category_id ?? null;
    const meta = catId ? catMap.get(catId) : null;
    const sourceKey = catId ?? "__uncategorized__";
    const sName = meta?.name ?? "Uncategorized";
    const sColor = meta?.color ?? null;
    const sRow =
      sourceMap.get(sourceKey) ?? {
        name: sName,
        colorHex: sColor,
        count: 0,
        valueCents: 0,
      };
    sRow.count += 1;
    sRow.valueCents += v;
    sourceMap.set(sourceKey, sRow);
  }

  let revenueCollectedCents = 0;
  let refundsCents = 0;
  const methodMap = new Map<string, { count: number; amountCents: number }>();

  for (const p of payments) {
    if (!COLLECTED_STATUSES.includes(p.status)) continue;
    const gross = p.amount_cents ?? 0;
    const refund = p.refund_amount_cents ?? 0;
    revenueCollectedCents += gross - refund;
    refundsCents += refund;
    const m = p.payment_method ?? "unspecified";
    const row = methodMap.get(m) ?? { count: 0, amountCents: 0 };
    row.count += 1;
    row.amountCents += gross - refund;
    methodMap.set(m, row);
  }

  const byType = Array.from(typeMap.entries())
    .map(([type, v]) => ({ type, count: v.count, valueCents: v.valueCents }))
    .sort((a, b) => b.valueCents - a.valueCents);

  const byMethod = Array.from(methodMap.entries())
    .map(([method, v]) => ({
      method,
      count: v.count,
      amountCents: v.amountCents,
    }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const bySource = Array.from(sourceMap.values()).sort(
    (a, b) => b.valueCents - a.valueCents
  );

  // Outstanding (A/R): booked value not yet collected this period. Floored at 0.
  const outstandingCents = Math.max(
    0,
    bookedValueCents - revenueCollectedCents
  );

  return {
    revenueCollectedCents,
    refundsCents,
    bookedValueCents,
    bookingsCount,
    noShowCount,
    cancelledCount,
    byType,
    byMethod,
    bySource,
    outstandingCents,
  };
}
