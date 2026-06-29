import { requireOwner } from "@/lib/auth/guard";
import { backupSummary } from "@/lib/data/backup-actions";
import BackupView from "@/components/admin/BackupView";

export const dynamic = "force-dynamic";

export default async function BackupPage() {
  await requireOwner();
  const { rows, totalRows } = await backupSummary();
  return (
    <div>
      <div className="mb-1 font-display text-[24px] font-extrabold tracking-[-.02em] text-text">
        Backup &amp; Export
      </div>
      <p className="mb-6 max-w-[640px] text-[13.5px] text-muted">
        Download a copy of all facility data at any time. Keep these files
        somewhere safe. Anyone with Manager access can run a backup.
      </p>
      <BackupView rows={rows} totalRows={totalRows} />
    </div>
  );
}
