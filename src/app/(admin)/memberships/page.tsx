import { getFamilies } from "@/lib/data/resources";
import { createClient } from "@/lib/supabase/server";
import MembershipsManager, {
  type MembershipRow,
} from "@/components/admin/MembershipsManager";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  tier: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
  families: { family_name: string } | { family_name: string }[] | null;
};

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ started?: string }>;
}) {
  const sp = await searchParams;
  const justStarted = sp.started === "1";

  const supabase = await createClient();
  const families = await getFamilies();

  const { data } = await supabase
    .from("memberships")
    .select(
      "id, tier, status, current_period_end, cancel_at_period_end, stripe_subscription_id, families(family_name)"
    )
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as unknown as Row[];
  const memberships: MembershipRow[] = rows.map((m) => {
    const fam = Array.isArray(m.families) ? m.families[0] : m.families;
    return {
      id: m.id,
      family_name: fam?.family_name ?? "\u2014",
      tier: m.tier,
      status: m.status,
      current_period_end: m.current_period_end ?? null,
      cancel_at_period_end: Boolean(m.cancel_at_period_end),
      stripe_subscription_id: m.stripe_subscription_id ?? null,
    };
  });

  return (
    <MembershipsManager
      families={families}
      memberships={memberships}
      justStarted={justStarted}
    />
  );
}
