import { createClient } from "@/lib/supabase/server";
import PromoManager, { type PromoRow } from "@/components/admin/PromoManager";

export const dynamic = "force-dynamic";

export default async function PromoCodesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("promo_codes")
    .select(
      "id, code, discount_type, value, max_uses, used_count, valid_from, valid_to, is_active, notes"
    )
    .order("created_at", { ascending: false });

  const promos = (data as PromoRow[]) ?? [];

  return <PromoManager promos={promos} />;
}
