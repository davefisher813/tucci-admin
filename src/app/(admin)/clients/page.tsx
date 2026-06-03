import { createClient } from "@/lib/supabase/server";
import ClientsManager, {
  type FamilyRow,
  type AthleteRow,
} from "@/components/admin/ClientsManager";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();

  const [{ data: famData }, { data: athData }] = await Promise.all([
    supabase
      .from("families")
      .select("id, family_name, primary_email, primary_phone")
      .eq("is_active", true)
      .order("family_name", { ascending: true }),
    supabase
      .from("athletes")
      .select("id, family_id, first_name, last_name, position")
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
  ]);

  const families = (famData as FamilyRow[]) ?? [];
  const athletes = (athData as AthleteRow[]) ?? [];

  return <ClientsManager families={families} athletes={athletes} />;
}
