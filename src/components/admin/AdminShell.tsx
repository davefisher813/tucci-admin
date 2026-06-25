"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import type { CurrentUser } from "@/lib/auth/guard";

const STORAGE_KEY = "tucci_sidebar_collapsed";

export default function AdminShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  // Desktop collapse state, remembered across navigations.
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar collapsed={collapsed} onToggle={toggle} hydrated={hydrated} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          sidebarCollapsed={collapsed}
          onReopenSidebar={toggle}
        />
        <main className="flex-1 overflow-y-auto px-4 pb-[60px] pt-6 md:px-[26px]">
          {children}
        </main>
      </div>
    </div>
  );
}
