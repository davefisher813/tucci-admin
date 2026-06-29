import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { gatherBackup } from "@/lib/data/backup-actions";

export const dynamic = "force-dynamic";

// Builds a multi-sheet Excel workbook (one sheet per table) and streams it as a
// download. Manager-only (enforced inside gatherBackup).
export async function GET() {
  const { error, tables, generatedAt } = await gatherBackup();
  if (error) {
    return NextResponse.json({ error }, { status: 403 });
  }

  const wb = XLSX.utils.book_new();

  const cover = [
    ["Tucci Elite Athletic Complex"],
    ["Business Data Export"],
    ["Generated", new Date(generatedAt).toLocaleString("en-US")],
    [],
    ["Table", "Rows"],
    ...tables.map((t) => [t.table, t.rows.length]),
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(cover),
    "Summary"
  );

  for (const t of tables) {
    const safe = t.table.replace(/[:\\/?*[\]]/g, "_").slice(0, 31);
    const sheet =
      t.rows.length > 0
        ? XLSX.utils.json_to_sheet(t.rows)
        : XLSX.utils.aoa_to_sheet([["(no rows)"]]);
    XLSX.utils.book_append_sheet(wb, sheet, safe);
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const stamp = new Date(generatedAt).toISOString().slice(0, 10);

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tucci-data-${stamp}.xlsx"`,
    },
  });
}
