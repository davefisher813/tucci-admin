import { requireRole } from "@/lib/auth/guard";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Staff only. family role -> /unauthorized, signed out -> /login.
  const user = await requireRole();

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto px-4 pb-[60px] pt-6 md:px-[26px]">
          {children}
        </main>
      </div>
    </div>
  );
}
