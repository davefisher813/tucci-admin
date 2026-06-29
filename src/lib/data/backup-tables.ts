// Plain (non-"use server") module so server actions, routes, and components can
// all import the shared table list and type without violating the
// "use server" export rules.

export const BACKUP_TABLES: string[] = [
  "users",
  "families",
  "family_members",
  "athletes",
  "coach_profiles",
  "services",
  "service_categories",
  "assets",
  "asset_blackouts",
  "business_hours",
  "peak_windows",
  "pricing_config",
  "pricing_versions",
  "bookings",
  "booking_athletes",
  "booking_addons",
  "addons",
  "payments",
  "memberships",
  "packages",
  "package_purchases",
  "college_passes",
  "college_pass_purchases",
  "family_credits",
  "promo_codes",
  "leads",
  "lead_interactions",
  "notifications",
  "athlete_metrics",
  "athlete_assessments",
  "athlete_goals",
  "athlete_achievements",
  "athlete_notes",
  "metric_types",
  "cancellation_policies",
  "audit_log",
  "conflict_log",
];

export type TableDump = {
  table: string;
  rows: Record<string, unknown>[];
  error?: string;
};
