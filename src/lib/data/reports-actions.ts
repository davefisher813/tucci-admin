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
    .select("booking_type, status, total_cents, start_time")
    .gte("start_time", lower)
    .lt("start_time", upper);

  const bookings =
    (bookingRows as {
      booking_type: string;
      status: string;
      total_cents: number | null;
    }[]) ?? [];

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

  return {
    revenueCollectedCents,
    refundsCents,
    bookedValueCents,
    bookingsCount,
    noShowCount,
    cancelledCount,
    byType,
    byMethod,
  };
}
