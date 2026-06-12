import { createClient } from "@/lib/supabase/server";
import AthletesManager, {
  type AthleteRow,
  type FamilyRow,
} from "@/components/admin/AthletesManager";

export const dynamic = "force-dynamic";

export default async function AthletesPage() {
  const supabase = await createClient();

  const [{ data: athData }, { data: famData }] = await Promise.all([
    supabase
      .from("athletes")
      .select(
        "id, family_id, first_name, last_name, preferred_name, position, grade, school, bats, throws"
      )
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
    supabase.from("families").select("id, family_name").eq("is_active", true),
  ]);

  const athletes = (athData as AthleteRow[]) ?? [];
  const families = (famData as FamilyRow[]) ?? [];

  return <AthletesManager athletes={athletes} families={families} />;
}
