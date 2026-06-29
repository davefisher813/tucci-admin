"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createAccount,
  resendInvite,
  changeAccountRole,
  setAccountActive,
  deleteAccount,
} from "@/lib/data/account-actions";
import { ASSIGNABLE_ROLES, type AccountRow } from "@/lib/data/account-types";
import type { UserRole } from "@/lib/auth/guard";

const ROLE_LABEL: Record<string, string> = {
  owner: "Manager",
  admin: "Admin",
  coach: "Coach",
  reception: "Reception",
  family: "Family",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function lastSeen(iso: string | null): string {
  if (!iso) return "Never signed in";
  const d = new Date(iso);
  return `Last in ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default function AccountsManager({
  accounts,
  currentUserId,
  serviceKeyReady,
}: {
  accounts: AccountRow[];
  currentUserId: string;
  serviceKeyReady: boolean;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("admin");

  async function add() {
    setBusy(true);
    setErr(null);
    setNotice(null);
    const res = await createAccount({
      full_name: name.trim(),
      email: email.trim(),
      role,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setNotice(`Invite sent to ${email.trim()}. They'll set their own password.`);
    setName("");
    setEmail("");
    setRole("admin");
    setShowAdd(false);
    router.refresh();
  }

  async function resend(acct: AccountRow) {
    setBusy(true);
    setErr(null);
    setNotice(null);
    const res = await resendInvite(acct.email);
    setBusy(false);
    if (res.error) return setErr(res.error);
    setNotice(`Invite re-sent to ${acct.email}.`);
  }

  async function changeRole(acct: AccountRow, next: UserRole) {
    setBusy(true);
    setErr(null);
    setNotice(null);
    const res = await changeAccountRole({ user_id: acct.id, role: next });
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function toggleActive(acct: AccountRow) {
    setBusy(true);
    setErr(null);
    setNotice(null);
    const res = await setAccountActive({
      user_id: acct.id,
      is_active: !acct.is_active,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function remove(acct: AccountRow) {
    setBusy(true);
    setErr(null);
    setNotice(null);
    const res = await deleteAccount(acct.id);
    setBusy(false);
    if (res.error) return setErr(res.error);
    setConfirmDelete(null);
    setNotice(`${acct.full_name} was permanently deleted.`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {!serviceKeyReady && (
        <div className="mb-4 rounded-[12px] border border-gold/50 bg-gold/[.12] px-4 py-3 text-[13px] text-text">
          <b className="font-display">Almost ready.</b> Adding accounts and
          sending invites needs the Supabase service role key set in Vercel.
          Once it's set, every control here works.
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-success/40 bg-success/[.10] px-3 py-2 text-[13px] text-success">
          {notice}
        </div>
      )}

      <div className="mb-[14px] flex items-center justify-between">
        <div className="font-display text-[12px] font-bold text-muted">
          {accounts.length} {accounts.length === 1 ? "Account" : "Accounts"}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white"
        >
          {showAdd ? "Close" : "Add Account"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[10px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            New Account
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alberto Martinez"
                className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="alberto@tucci.com"
                className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="rounded-[9px] border border-line-2 bg-paper px-[11px] py-[11px] text-[14px]"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <div className="text-[11.5px] leading-[1.4] text-muted">
                {ASSIGNABLE_ROLES.find((r) => r.value === role)?.blurb}
              </div>
            </div>
            <button
              onClick={add}
              disabled={busy || !name.trim() || !email.trim()}
              className="rounded-[10px] bg-accent py-[13px] font-display text-[14px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "Sending Invite…" : "Create & Send Invite"}
            </button>
            <div className="text-[11.5px] leading-[1.4] text-muted">
              They get an email with a link to set their own password. No
              temporary passwords to share.
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {accounts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-display text-[15px] font-extrabold text-text">
              No accounts yet
            </div>
            <div className="mt-1 text-[13px] text-muted">
              Add an account above to invite your team.
            </div>
          </div>
        ) : (
          accounts.map((a) => {
            const isOpen = open === a.id;
            const isSelf = a.id === currentUserId;
            const status = !a.is_active
              ? "Disabled"
              : a.invited_pending
              ? "Invite pending"
              : "Active";
            const statusClass = !a.is_active
              ? "bg-line-2 text-muted"
              : a.invited_pending
              ? "bg-gold/[.20] text-text"
              : "bg-success/[.14] text-success";
            return (
              <div key={a.id} className="border-b border-line last:border-b-0">
                <div
                  onClick={() => setOpen(isOpen ? null : a.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-bg"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky/[.16] font-display text-[12px] font-extrabold text-accent">
                    {initials(a.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-[15px] font-bold text-text">
                        {a.full_name}
                      </span>
                      {isSelf && (
                        <span className="rounded-[4px] bg-accent/[.10] px-[5px] text-[9px] font-extrabold uppercase tracking-[.03em] text-accent">
                          You
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[12px] text-muted">
                      {ROLE_LABEL[a.role] ?? a.role} · {a.email}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-[2px] font-display text-[10px] font-extrabold ${statusClass}`}
                  >
                    {status}
                  </span>
                  <span
                    className={`text-[19px] text-line-2 transition-transform ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  >
                    ›
                  </span>
                </div>

                {isOpen && (
                  <div className="bg-bg/40 px-4 pb-4 pt-1">
                    <div className="mb-3 text-[12px] text-muted">
                      {lastSeen(a.last_sign_in_at)}
                    </div>

                    <div className="mb-3">
                      <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                        Role
                      </div>
                      <select
                        value={a.role}
                        disabled={busy || (isSelf && a.role === "owner")}
                        onChange={(e) =>
                          changeRole(a, e.target.value as UserRole)
                        }
                        className="w-full rounded-[8px] border border-line-2 bg-paper px-[11px] py-[9px] text-[14px] disabled:opacity-60"
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      {isSelf && a.role === "owner" && (
                        <div className="mt-[6px] text-[11.5px] text-muted">
                          You can't remove your own Manager access.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-[9px]">
                      <button
                        onClick={() => resend(a)}
                        disabled={busy}
                        className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[12px] font-extrabold tracking-[.03em] text-text hover:border-accent disabled:opacity-50"
                      >
                        Resend Invite
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => toggleActive(a)}
                          disabled={busy}
                          className={`inline-flex h-10 items-center rounded-[9px] border px-[14px] font-display text-[12px] font-extrabold tracking-[.03em] disabled:opacity-50 ${
                            a.is_active
                              ? "border-line-2 bg-paper text-text hover:border-accent"
                              : "border-ink bg-ink text-white"
                          }`}
                        >
                          {a.is_active ? "Disable Account" : "Re-enable Account"}
                        </button>
                      )}
                    </div>

                    {!isSelf && (
                      <div className="mt-3 border-t border-line pt-3">
                        {confirmDelete === a.id ? (
                          <div className="flex flex-wrap items-center gap-[9px]">
                            <span className="text-[12.5px] font-semibold text-danger">
                              Delete {a.full_name} permanently?
                            </span>
                            <button
                              onClick={() => remove(a)}
                              disabled={busy}
                              className="inline-flex h-9 items-center rounded-[9px] border border-danger bg-danger px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
                            >
                              {busy ? "Deleting…" : "Yes, delete"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              disabled={busy}
                              className="inline-flex h-9 items-center rounded-[9px] border border-line-2 bg-paper px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-text"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(a.id)}
                            disabled={busy}
                            className="font-display text-[12px] font-bold text-muted hover:text-danger disabled:opacity-50"
                          >
                            Delete account permanently
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
