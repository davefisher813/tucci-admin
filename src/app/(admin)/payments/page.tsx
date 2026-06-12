import { getFamilies } from "@/lib/data/resources";
import { createClient } from "@/lib/supabase/server";
import PaymentsManager, {
  type PaymentRow,
} from "@/components/admin/PaymentsManager";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  amount_cents: number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  families: { family_name: string } | { family_name: string }[] | null;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const sp = await searchParams;
  const justPaid = sp.paid === "1";

  const supabase = await createClient();
  const families = await getFamilies();

  const { data } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, status, payment_method, paid_at, created_at, families(family_name)"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data ?? []) as unknown as Row[];
  const payments: PaymentRow[] = rows.map((p) => {
    const fam = Array.isArray(p.families) ? p.families[0] : p.families;
    return {
      id: p.id,
      amount_cents: p.amount_cents ?? 0,
      status: p.status,
      payment_method: p.payment_method ?? null,
      paid_at: p.paid_at ?? null,
      created_at: p.created_at,
      family_name: fam?.family_name ?? "\u2014",
    };
  });

  return (
    <PaymentsManager
      families={families}
      payments={payments}
      justPaid={justPaid}
    />
  );
}
