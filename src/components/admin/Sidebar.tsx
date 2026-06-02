"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { label: string; href: string };
type Group = { title: string; items: Item[] };

// Groups match v6 canonical nav. New feature screens slotted in by domain.
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
    ],
  },
  {
    title: "System",
    items: [{ label: "Settings", href: "/settings" }],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-paper md:flex">
      <div className="flex items-center gap-[10px] px-[18px] pb-[14px] pt-[18px]">
        <div className="font-display text-lg font-black leading-tight text-text">
          Tucci Elite
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-[10px] py-[6px]">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-[10px] pb-[6px] pt-[14px] font-display text-[10px] font-extrabold tracking-[.02em] text-accent">
              {group.title}
            </div>
            {group.items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex w-full items-center gap-[11px] rounded-[9px] px-[10px] py-[9px] font-display text-[13.5px] font-bold transition-colors ${
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
    </aside>
  );
}
