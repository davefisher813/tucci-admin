"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moneyExact } from "@/lib/format";
import { setUserRole, updateCoachProfile, createCoachWithLogin } from "@/lib/data/coach-actions";

export type PersonRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export type ProfileRow = {
  user_id: string;
  tier: string;
  hourly_pay: number | null;
  specialties: string[] | null;
  is_taking_new: boolean;
};

const ROLES = ["owner", "admin", "coach", "reception", "family"];
const TIERS = [
  { value: "t1", label: "Tier 1 (Elite)" },
  { value: "t2", label: "Tier 2 (Experienced)" },
  { value: "t3", label: "Tier 3 (Standard)" },
];

export default function CoachesManager({
  people,
  profiles,
}: {
  people: PersonRow[];
  profiles: ProfileRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  async function addCoach() {
    setBusy(true);
    setErr(null);
    const res = await createCoachWithLogin({
      name: newName.trim(),
      email: newEmail.trim(),
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setNewName("");
    setNewEmail("");
    setShowAdd(false);
    router.refresh();
  }

  const coaches = people.filter((p) => p.role === "coach");
  const others = people.filter((p) => p.role !== "coach");

  async function changeRole(userId: string, role: string) {
    setBusy(true);
    setErr(null);
    const res = await setUserRole({ user_id: userId, role });
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="mb-[14px] flex items-center justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
          Coaches
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white"
        >
          {showAdd ? "Close" : "Add Coach"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[10px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            New Coach
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Full Name
              </label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Mike Carter"
                className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Email (Creates Their Login)
              </label>
              <input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="mike@tucci.com"
                className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
              />
            </div>
            <button
              onClick={addCoach}
              disabled={busy || !newName.trim() || !newEmail.trim()}
              className="rounded-[10px] bg-accent py-[13px] font-display text-[14px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Coach"}
            </button>
            <div className="text-[11.5px] leading-[1.4] text-muted">
              Creating a login requires the Supabase service key in Vercel. For
              a coach without a login, assign them by name directly on a booking.
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 overflow-hidden rounded-[16px] border border-line bg-paper">
        {coaches.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No Coaches Yet. Add one above, or set someone&apos;s role to Coach in
            the People section below.
          </div>
        ) : (
          coaches.map((c) => {
            const prof = profiles.find((p) => p.user_id === c.id);
            const open = editing === c.id;
            return (
              <CoachRow
                key={c.id}
                coach={c}
                profile={prof}
                open={open}
                busy={busy}
                onToggle={() => setEditing(open ? null : c.id)}
                onSaved={() => {
                  setEditing(null);
                  router.refresh();
                }}
                onError={setErr}
                onSetBusy={setBusy}
              />
            );
          })
        )}
      </div>

      <div className="mb-[14px] font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
        People &amp; Roles
      </div>
      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {others.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            Everyone is a coach, or no other accounts exist yet.
          </div>
        ) : (
          others.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-[15px] font-bold text-text">
                  {p.full_name}
                </div>
                <div className="truncate text-[12px] text-muted">{p.email}</div>
              </div>
              <select
                value={p.role}
                onChange={(e) => changeRole(p.id, e.target.value)}
                disabled={busy}
                className="sel w-[130px] capitalize"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))
        )}
      </div>

      <style>{`
        .sel{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}

function CoachRow({
  coach,
  profile,
  open,
  busy,
  onToggle,
  onSaved,
  onError,
  onSetBusy,
}: {
  coach: PersonRow;
  profile?: ProfileRow;
  open: boolean;
  busy: boolean;
  onToggle: () => void;
  onSaved: () => void;
  onError: (s: string | null) => void;
  onSetBusy: (b: boolean) => void;
}) {
  const [tier, setTier] = useState(profile?.tier ?? "t3");
  const [pay, setPay] = useState(
    profile?.hourly_pay != null ? String(profile.hourly_pay) : ""
  );
  const [specialties, setSpecialties] = useState(
    (profile?.specialties ?? []).join(", ")
  );
  const [takingNew, setTakingNew] = useState(profile?.is_taking_new ?? true);

  async function save() {
    onSetBusy(true);
    onError(null);
    const payNum = pay.trim() === "" ? null : parseFloat(pay);
    const res = await updateCoachProfile({
      user_id: coach.id,
      tier,
      hourly_pay: payNum != null && !isNaN(payNum) ? payNum : null,
      specialties: specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      is_taking_new: takingNew,
    });
    onSetBusy(false);
    if (res.error) return onError(res.error);
    onSaved();
  }

  return (
    <div className="border-b border-line last:border-b-0">
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-bg"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold text-text">
            {coach.full_name}
          </div>
          <div className="truncate text-[12px] text-muted">
            {TIERS.find((t) => t.value === (profile?.tier ?? "t3"))?.label}
            {profile?.hourly_pay != null
              ? ` · ${moneyExact(profile.hourly_pay * 100)}/hr pay`
              : ""}
          </div>
        </div>
        <span
          className={`text-[19px] text-line-2 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </div>

      {open && (
        <div className="bg-bg/40 px-4 pb-4 pt-1">
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Tier
              </div>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="sel w-full"
              >
                {TIERS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Hourly Pay ($)
              </div>
              <input
                value={pay}
                onChange={(e) => setPay(e.target.value)}
                placeholder="e.g. 40"
                inputMode="decimal"
                className="sel w-full"
              />
            </div>
            <div>
              <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                Specialties (comma separated)
              </div>
              <input
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder="hitting, pitching, catching"
                className="sel w-full"
              />
            </div>
            <label className="flex items-center gap-2 text-[14px] font-semibold text-text">
              <input
                type="checkbox"
                checked={takingNew}
                onChange={(e) => setTakingNew(e.target.checked)}
                className="h-4 w-4"
              />
              Taking new clients
            </label>
            <div className="flex gap-[9px]">
              <button
                onClick={save}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={onToggle}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-[9px] border border-line-2 bg-paper px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-text"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
