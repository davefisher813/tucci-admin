import { requireRole } from "@/lib/auth/guard";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Staff only. family role -> /unauthorized, signed out -> /login.
  const user = await requireRole();

  return <AdminShell user={user}>{children}</AdminShell>;
}
