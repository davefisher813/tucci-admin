"use client";

import { usePathname } from "next/navigation";
import { signout } from "@/lib/auth/actions";
import type { CurrentUser } from "@/lib/auth/guard";

const TITLES: Record<string, string> = {
  today: "Today",
  schedule: "Schedule",
  "new-booking": "New Booking",
  bookings: "Bookings",
  "check-in": "Check-In",
  clients: "Clients",
  athletes: "Athletes",
  coaches: "Coaches",
  payments: "Payments",
  memberships: "Memberships",
  pricing: "Pricing",
  payroll: "Payroll",
  "promo-codes": "Promo Codes",
  reports: "Reports",
  settings: "Settings",
};

export default function Topbar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const key = pathname.split("/").filter(Boolean)[0] ?? "today";
  const title = TITLES[key] ?? "Today";

  const initials = user.full_name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-[14px] border-b border-line bg-bg px-4 py-[14px] md:px-[26px]">
      <div>
        <div className="font-display text-[10px] font-extrabold tracking-[.02em] text-accent">
          Tucci Elite
        </div>
        <div className="font-display text-[28px] font-extrabold leading-none tracking-[-.02em] text-text">
          {title}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-[10px]">
        <div className="text-right leading-tight">
          <div className="font-display text-[13px] font-extrabold text-text">
            {user.full_name}
          </div>
          <div className="text-[11px] capitalize text-muted">{user.role}</div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky/[.14] font-display text-[12px] font-extrabold text-accent">
          {initials}
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="rounded-[9px] border border-line-2 bg-paper px-3 py-[6px] font-display text-[11px] font-extrabold tracking-[.03em] text-muted hover:border-accent"
          >
            Sign Out
          </button>
        </form>
      </div>
    </header>
  );
}
