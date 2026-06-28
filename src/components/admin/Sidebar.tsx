"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string };
type Group = { title: string; items: Item[] };

const GROUPS: Group[] = [
  {
    title: "Booking",
    items: [
      { label: "Today", href: "/today" },
      { label: "Schedule", href: "/schedule" },
      { label: "New Booking", href: "/new-booking" },
      { label: "Bookings", href: "/bookings" },
      { label: "Check-In", href: "/check-in" },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Clients", href: "/clients" },
      { label: "Athletes", href: "/athletes" },
      { label: "New Waiver", href: "/waivers/new" },
      { label: "Coaches", href: "/coaches" },
    ],
  },
  {
    title: "Money",
    items: [
      { label: "Payments", href: "/payments" },
      { label: "Memberships", href: "/memberships" },
      { label: "Pricing", href: "/pricing" },
      { label: "Payroll", href: "/payroll" },
      { label: "Promo Codes", href: "/promo-codes" },
      { label: "Reports", href: "/reports" },
      { label: "Space Value", href: "/space-value" },
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/settings" }],
  },
];

// Owners also see Accounts under System.
function groupsForRole(role?: string): Group[] {
  if (role !== "owner") return GROUPS;
  return GROUPS.map((g) =>
    g.title === "System"
      ? {
          ...g,
          items: [
            { label: "Accounts", href: "/accounts" },
            ...g.items,
          ],
        }
      : g
  );
}

function NavList({
  onNavigate,
  userRole,
}: {
  onNavigate?: () => void;
  userRole?: string;
}) {
  const pathname = usePathname();
  const groups = groupsForRole(userRole);
  return (
    <nav className="flex-1 overflow-y-auto px-[10px] py-[6px]">
      {groups.map((group) => (
        <div key={group.title}>
          <div className="px-[10px] pb-[6px] pt-[14px] font-display text-[10px] font-extrabold tracking-[.02em] text-accent">
            {group.title}
          </div>
          {group.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex w-full items-center gap-[11px] rounded-[9px] px-[10px] py-[11px] font-display text-[14px] font-bold transition-colors ${
                  active
                    ? "bg-sky/[.13] text-text"
                    : "text-muted hover:bg-black/[.045] hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export default function Sidebar({
  collapsed = false,
  onToggle,
  hydrated = true,
  userRole,
}: {
  collapsed?: boolean;
  onToggle?: () => void;
  hydrated?: boolean;
  userRole?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-[9px] border border-line bg-paper text-text shadow-sm md:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-line bg-paper transition-[width] duration-200 md:flex ${
          collapsed ? "w-0 border-r-0" : "w-[248px]"
        }`}
      >
        <div className="flex items-center justify-between px-[18px] pb-[14px] pt-[18px]">
          <div className="whitespace-nowrap font-display text-lg font-black leading-tight text-text">
            Tucci Elite
          </div>
          <button
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] border border-line text-muted hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        <NavList userRole={userRole} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[260px] flex-col bg-paper shadow-xl">
            <div className="flex items-center justify-between px-[18px] pb-[14px] pt-[18px]">
              <div className="font-display text-lg font-black leading-tight text-text">
                Tucci Elite
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line text-text"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} userRole={userRole} />
          </div>
        </div>
      )}
    </>
  );
}
