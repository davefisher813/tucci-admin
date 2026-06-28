import type { UserRole } from "@/lib/auth/guard";

export type AccountRow = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_sign_in_at: string | null;
  invited_pending: boolean;
};

export const ASSIGNABLE_ROLES: {
  value: UserRole;
  label: string;
  blurb: string;
}[] = [
  { value: "owner", label: "Manager", blurb: "Full access, including accounts and settings." },
  { value: "admin", label: "Admin", blurb: "Runs day-to-day. Cannot manage accounts." },
  { value: "coach", label: "Coach", blurb: "Coaching tools and their own schedule." },
  { value: "reception", label: "Reception", blurb: "Front desk: check-in and bookings." },
];
