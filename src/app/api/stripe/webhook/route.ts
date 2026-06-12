import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

type DB = ReturnType<typeof createAdminClient>;

// Stripe-Signature header looks like: t=1700000000,v1=hexdigest
function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string
): boolean {
  if (!header) return false;
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const idx = piece.indexOf("=");
    if (idx > 0) parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim();
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const expected = createHmac("sha256", secret)
    .update(`${t}.${rawBody}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 500 });

  const raw = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!verifySignature(raw, sig, secret)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  const supabase = createAdminClient();

  // Idempotency: Stripe can deliver the same event more than once.
  const { data: seen } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (seen) return new Response("ok (duplicate)", { status: 200 });

  await supabase
    .from("stripe_events")
    .insert({ id: event.id, type: event.type, payload: event });

  try {
    await handleEvent(supabase, event);
  } catch (err) {
    // The raw event is stored above for replay, so a 200 here avoids retry
    // storms when the failure is an app-side bug rather than a delivery issue.
    console.error("stripe webhook handler error:", event.type, err);
  }

  return new Response("ok", { status: 200 });
}

async function handleEvent(supabase: DB, event: StripeEvent) {
  const obj = event.data.object;
  switch (event.type) {
    case "payment_intent.succeeded":
      await recordPayment(supabase, obj, "paid");
      break;
    case "payment_intent.payment_failed":
      await recordPayment(supabase, obj, "failed");
      break;
    case "charge.refunded":
      await recordRefund(supabase, obj);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(supabase, obj);
      break;
    default:
      // Stored above; no action wired yet.
      break;
  }
}

async function recordPayment(
  supabase: DB,
  pi: Record<string, unknown>,
  status: "paid" | "failed"
) {
  const metadata = (pi.metadata ?? {}) as Record<string, string>;
  const familyId = metadata.family_id;
  if (!familyId) return; // payments.family_id is NOT NULL

  const intentId = pi.id as string;
  const amount =
    (pi.amount_received as number) ?? (pi.amount as number) ?? 0;
  const charge = (pi.latest_charge as string) ?? null;
  const nowIso = new Date().toISOString();

  const row = {
    family_id: familyId,
    booking_id: metadata.booking_id ?? null,
    amount_cents: amount,
    status,
    payment_method: "card",
    stripe_payment_intent_id: intentId,
    stripe_charge_id: charge,
    paid_at: status === "paid" ? nowIso : null,
    failed_at: status === "failed" ? nowIso : null,
  };

  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_payment_intent_id", intentId)
    .maybeSingle();

  if (existing) {
    await supabase.from("payments").update(row).eq("id", existing.id);
  } else {
    await supabase.from("payments").insert(row);
  }
}

async function recordRefund(supabase: DB, charge: Record<string, unknown>) {
  const chargeId = charge.id as string;
  const amount = (charge.amount as number) ?? 0;
  const refunded = (charge.amount_refunded as number) ?? 0;
  await supabase
    .from("payments")
    .update({
      status: refunded >= amount ? "refunded" : "partially_refunded",
      refund_amount_cents: refunded,
      refunded_at: new Date().toISOString(),
    })
    .eq("stripe_charge_id", chargeId);
}

const SUB_STATUS: Record<
  string,
  "active" | "paused" | "cancelled" | "past_due"
> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  canceled: "cancelled",
  incomplete_expired: "cancelled",
  paused: "paused",
};

async function syncSubscription(supabase: DB, sub: Record<string, unknown>) {
  const subId = sub.id as string;
  const update: Record<string, unknown> = {
    cancel_at_period_end: Boolean(sub.cancel_at_period_end),
  };
  const periodEnd = sub.current_period_end as number | undefined;
  if (periodEnd) {
    // memberships.current_period_end is a DATE column.
    update.current_period_end = new Date(periodEnd * 1000)
      .toISOString()
      .slice(0, 10);
  }
  const mapped = SUB_STATUS[sub.status as string];
  if (mapped) update.status = mapped;

  await supabase
    .from("memberships")
    .update(update)
    .eq("stripe_subscription_id", subId);
}
