"use server";

import { getOrCreateStripeCustomer, stripeRequest } from "@/lib/stripe/server";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://tucci-admin.vercel.app";

type Result = { url: string; error: null } | { url: null; error: string };

// Creates a Stripe Checkout session for a one-off amount and returns the
// hosted payment URL. The resulting payment is recorded by the webhook
// (payment_intent.succeeded) using the family_id metadata set below.
export async function createCheckoutSession(input: {
  familyId: string;
  amountCents: number;
  description: string;
}): Promise<Result> {
  try {
    if (!input.familyId) return { url: null, error: "Pick a family." };
    if (!input.amountCents || input.amountCents < 50) {
      return { url: null, error: "Amount must be at least $0.50." };
    }

    const customer = await getOrCreateStripeCustomer(input.familyId);

    const session = await stripeRequest<{ url: string | null }>(
      "POST",
      "/checkout/sessions",
      {
        mode: "payment",
        customer,
        success_url: `${APP_URL}/payments?paid=1`,
        cancel_url: `${APP_URL}/payments`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: input.amountCents,
              product_data: { name: input.description || "Tucci payment" },
            },
          },
        ],
        payment_intent_data: {
          metadata: { family_id: input.familyId },
        },
      }
    );

    if (!session.url) {
      return { url: null, error: "Stripe did not return a payment link." };
    }
    return { url: session.url, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    return { url: null, error: msg };
  }
}
