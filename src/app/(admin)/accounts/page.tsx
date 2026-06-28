import { requireOwner } from "@/lib/auth/guard";
import { listAccounts } from "@/lib/data/account-actions";
import AccountsManager from "@/components/admin/AccountsManager";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const owner = await requireOwner();
  const { accounts } = await listAccounts();
  const serviceKeyReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div>
      <div className="mb-1 font-display text-[24px] font-extrabold tracking-[-.02em] text-text">
        Accounts
      </div>
      <p className="mb-6 max-w-[640px] text-[13.5px] text-muted">
        People who can sign in to the admin app. Add a teammate and they'll get
        an email to set their own password. Managers can manage everyone here.
      </p>
      <AccountsManager
        accounts={accounts}
        currentUserId={owner.id}
        serviceKeyReady={serviceKeyReady}
      />
    </div>
  );
}
