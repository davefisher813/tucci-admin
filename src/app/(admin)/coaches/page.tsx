import { createClient } from "@/lib/supabase/server";
import CoachesManager, {
  type PersonRow,
  type ProfileRow,
} from "@/components/admin/CoachesManager";

export const dynamic = "force-dynamic";

export default async function CoachesPage() {
  const supabase = await createClient();

  const [{ data: peopleData }, { data: profData }] = await Promise.all([
    supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("coach_profiles")
      .select("user_id, tier, hourly_pay, specialties, is_taking_new"),
  ]);

  const people = (peopleData as PersonRow[]) ?? [];
  const profiles = (profData as ProfileRow[]) ?? [];

  return <CoachesManager people={people} profiles={profiles} />;
}
