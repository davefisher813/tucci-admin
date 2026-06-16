"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateStripeCustomer, stripeRequest } from "@/lib/stripe/server";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://tucci-admin.vercel.app";

type Tier = "monthly" | "family" | "team";

// Each tier's Stripe Price id lives in an env var, filled in after the
// membership Products/Prices are created in the Stripe Dashboard.
const PRICE_ENV: Record<Tier, string> = {
  monthly: "STRIPE_PRICE_MONTHLY",
  family: "STRIPE_PRICE_FAMILY",
  team: "STRIPE_PRICE_TEAM",
};

type LinkResult = { url: string; error: null } | { url: null; error: string };

// Creates a Stripe Checkout session in subscription mode and returns the
// hosted signup URL. The membership row is created by the webhook when the
// subscription becomes active (metadata carries family_id + tier).
export async function createSubscriptionCheckout(input: {
  familyId: string;
  tier: Tier;
}): Promise<LinkResult> {
  try {
    if (!input.familyId) return { url: null, error: "Pick a family." };
    const envKey = PRICE_ENV[input.tier];
    const priceId = process.env[envKey];
    if (!priceId) {
      return {
        url: null,
        error: `No Stripe price is set for the ${input.tier} tier yet. Create the price in Stripe, then add ${envKey} in Vercel.`,
      };
    }

    const customer = await getOrCreateStripeCustomer(input.familyId);

    const session = await stripeRequest<{ url: string | null }>(
      "POST",
      "/checkout/sessions",
      {
        mode: "subscription",
        customer,
        success_url: `${APP_URL}/memberships?started=1`,
        cancel_url: `${APP_URL}/memberships`,
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          metadata: { family_id: input.familyId, tier: input.tier },
        },
      }
    );

    if (!session.url) {
      return { url: null, error: "Stripe did not return a signup link." };
    }
    return { url: session.url, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    return { url: null, error: msg };
  }
}

type ActionResult = { error: string | null };

// Turns auto-renew off (or back on) for a membership. Updates Stripe when a
// subscription exists, and reflects the change in our row immediately so the
// screen updates without waiting for the webhook.
export async function setCancelAtPeriodEnd(input: {
  membershipId: string;
  subscriptionId: string | null;
  cancel: boolean;
}): Promise<ActionResult> {
  try {
    if (input.subscriptionId) {
      await stripeRequest(
        "POST",
        `/subscriptions/${input.subscriptionId}`,
        { cancel_at_period_end: input.cancel }
      );
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("memberships")
      .update({ cancel_at_period_end: input.cancel })
      .eq("id", input.membershipId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong.";
    return { error: msg };
  }
}
