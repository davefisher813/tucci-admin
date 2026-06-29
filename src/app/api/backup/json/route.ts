import { NextResponse } from "next/server";
import { gatherBackup } from "@/lib/data/backup-actions";

export const dynamic = "force-dynamic";

// Complete machine-readable backup of every table and row, as one JSON file.
// This is the disaster-recovery snapshot. Manager-only.
export async function GET() {
  const { error, tables, generatedAt } = await gatherBackup();
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const payload = {
    facility: "Tucci Elite Athletic Complex",
    generatedAt,
    tableCount: tables.length,
    tables: tables.reduce<Record<string, Record<string, unknown>[]>>(
      (acc, t) => {
        acc[t.table] = t.rows;
        return acc;
      },
      {}
    ),
  };

  const stamp = new Date(generatedAt).toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tucci-full-backup-${stamp}.json"`,
    },
  });
}
