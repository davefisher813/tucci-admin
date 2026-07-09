import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import AuditLogView, {
  type AuditRow,
} from "@/components/admin/AuditLogView";

export const dynamic = "force-dynamic";

type Joined = {
  id: number;
  table_name: string;
  record_id: string | null;
  action: string;
  changed_at: string;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  users: { full_name: string | null } | null;
};

export default async function AuditLogPage() {
  // Owner and admin (Manager) only. Everyone else is bounced.
  const user = await getCurrentUser();
  if (!user || (user.role !== "owner" && user.role !== "admin")) {
    redirect("/unauthorized");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select(
      `id, table_name, record_id, action, changed_at, before_state, after_state,
       users:changed_by ( full_name )`
    )
    .order("changed_at", { ascending: false })
    .limit(200);

  const rows: AuditRow[] = ((data as Joined[] | null) ?? []).map((r) => ({
    id: r.id,
    tableName: r.table_name,
    recordId: r.record_id,
    action: r.action,
    changedAt: r.changed_at,
    actor: r.users?.full_name ?? "System",
    beforeState: r.before_state,
    afterState: r.after_state,
  }));

  return <AuditLogView rows={rows} />;
}
