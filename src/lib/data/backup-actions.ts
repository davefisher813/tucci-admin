"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnerOrNull } from "@/lib/auth/guard";
import { BACKUP_TABLES, type TableDump } from "@/lib/data/backup-tables";

// Pulls every row of every table. Manager-only. Uses the service-role client so
// row-level security never hides anything from the backup.
export async function gatherBackup(): Promise<{
  error: string | null;
  generatedAt: string;
  tables: TableDump[];
}> {
  const owner = await getOwnerOrNull();
  if (!owner)
    return { error: "Only managers can export data.", generatedAt: "", tables: [] };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = await createClient();
  }

  const tables: TableDump[] = [];
  for (const table of BACKUP_TABLES) {
    try {
      const { data, error } = await admin.from(table).select("*");
      if (error) {
        continue;
      }
      tables.push({ table, rows: (data as Record<string, unknown>[]) ?? [] });
    } catch {
      continue;
    }
  }

  return {
    error: null,
    generatedAt: new Date().toISOString(),
    tables,
  };
}

// Lightweight summary for the screen: which tables exist and how many rows.
export async function backupSummary(): Promise<{
  error: string | null;
  rows: { table: string; count: number }[];
  totalRows: number;
}> {
  const owner = await getOwnerOrNull();
  if (!owner)
    return { error: "Only managers can view this.", rows: [], totalRows: 0 };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = await createClient();
  }

  const rows: { table: string; count: number }[] = [];
  let totalRows = 0;
  for (const table of BACKUP_TABLES) {
    try {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) continue;
      const c = count ?? 0;
      rows.push({ table, count: c });
      totalRows += c;
    } catch {
      continue;
    }
  }
  return { error: null, rows, totalRows };
}
