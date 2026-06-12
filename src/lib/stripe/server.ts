import { createAdminClient } from "@/lib/supabase/admin";

const STRIPE_API = "https://api.stripe.com/v1";

function secretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) throw new Error("Missing STRIPE_SECRET_KEY");
  return k;
}

// Stripe expects application/x-www-form-urlencoded with bracket notation for
// nested fields, e.g. metadata[family_id]=123 and items[0][price]=price_123.
function encodeForm(
  value: Record<string, unknown>,
  out: URLSearchParams = new URLSearchParams(),
  prefix = ""
): URLSearchParams {
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (item && typeof item === "object") {
          encodeForm(item as Record<string, unknown>, out, `${key}[${i}]`);
        } else {
          out.append(`${key}[${i}]`, String(item));
        }
      });
    } else if (v && typeof v === "object") {
      encodeForm(v as Record<string, unknown>, out, key);
    } else {
      out.append(key, String(v));
    }
  }
  return out;
}

type StripeMethod = "GET" | "POST" | "DELETE";

export async function stripeRequest<T>(
  method: StripeMethod,
  path: string,
  params?: Record<string, unknown>,
  idempotencyKey?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
  };
  let url = `${STRIPE_API}${path}`;
  let body: string | undefined;

  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = params ? encodeForm(params).toString() : "";
  } else if (params) {
    const qs = encodeForm(params).toString();
    if (qs) url += `?${qs}`;
  }
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(url, { method, headers, body });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Stripe error ${res.status}`);
  }
  return json;
}

// Returns the family's Stripe customer id, creating one on first use and
// saving it back to families.stripe_customer_id.
export async function getOrCreateStripeCustomer(
  familyId: string
): Promise<string> {
  const supabase = createAdminClient();

  const { data: fam, error } = await supabase
    .from("families")
    .select("id, family_name, primary_email, stripe_customer_id")
    .eq("id", familyId)
    .single();
  if (error || !fam) throw new Error("Family not found");
  if (fam.stripe_customer_id) return fam.stripe_customer_id as string;

  const customer = await stripeRequest<{ id: string }>(
    "POST",
    "/customers",
    {
      name: fam.family_name ?? undefined,
      email: fam.primary_email ?? undefined,
      metadata: { family_id: familyId },
    },
    `customer_${familyId}`
  );

  await supabase
    .from("families")
    .update({ stripe_customer_id: customer.id })
    .eq("id", familyId);

  return customer.id;
}
