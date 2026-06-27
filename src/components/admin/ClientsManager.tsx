"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFamily,
  deleteFamily,
  createAthlete,
  deleteAthlete,
} from "@/lib/data/family-actions";
import { formatPhone } from "@/lib/format";

export type FamilyRow = {
  id: string;
  family_name: string;
  primary_email: string | null;
  primary_phone: string | null;
};

export type AthleteRow = {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  position: string;
};

const POSITIONS = [
  "unknown",
  "pitcher",
  "catcher",
  "infield",
  "outfield",
  "utility",
];

export default function ClientsManager({
  families,
  athletes,
}: {
  families: FamilyRow[];
  athletes: AthleteRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [fName, setFName] = useState("");
  const [fEmail, setFEmail] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const [athFirst, setAthFirst] = useState("");
  const [athLast, setAthLast] = useState("");
  const [athPos, setAthPos] = useState("unknown");

  async function addFamily() {
    if (!fName.trim()) return setErr("Enter a family name.");
    setBusy(true);
    setErr(null);
    const res = await createFamily({
      family_name: fName.trim(),
      primary_email: fEmail.trim() || null,
      primary_phone: fPhone.trim() || null,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setFName("");
    setFEmail("");
    setFPhone("");
    setShowAdd(false);
    router.refresh();
  }

  async function removeFamily(id: string) {
    setBusy(true);
    const res = await deleteFamily(id);
    setBusy(false);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function addAthlete(familyId: string) {
    if (!athFirst.trim() || !athLast.trim())
      return setErr("Enter athlete first and last name.");
    setBusy(true);
    setErr(null);
    const res = await createAthlete({
      family_id: familyId,
      first_name: athFirst.trim(),
      last_name: athLast.trim(),
      position: athPos,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setAthFirst("");
    setAthLast("");
    setAthPos("unknown");
    router.refresh();
  }

  async function removeAthlete(id: string) {
    setBusy(true);
    const res = await deleteAthlete(id);
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

      <div className="mb-4 flex items-center justify-between">
        <div className="font-display text-[12px] font-bold text-muted">
          {families.length} {families.length === 1 ? "Family" : "Families"}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white"
        >
          {showAdd ? "Close" : "Add Family"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[6px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            New Family
          </div>
          <div className="flex flex-col gap-3">
            <input
              value={fName}
              onChange={(e) => setFName(e.target.value)}
              placeholder="Family name (e.g. Martinez)"
              className="sel"
            />
            <input
              value={fEmail}
              onChange={(e) => setFEmail(e.target.value)}
              placeholder="Email (optional)"
              inputMode="email"
              className="sel"
            />
            <input
              value={fPhone}
              onChange={(e) => setFPhone(e.target.value)}
              placeholder="Phone (optional)"
              inputMode="tel"
              className="sel"
            />
            <button
              onClick={addFamily}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[18px] font-display text-[12px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
            >
              Save Family
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {families.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-display text-[15px] font-extrabold text-text">
              No families yet
            </div>
            <div className="mt-1 text-[13px] text-muted">
              Add a family to start booking sessions for their athletes.
            </div>
          </div>
        ) : (
          families.map((f) => {
            const kids = athletes.filter((a) => a.family_id === f.id);
            const open = expanded === f.id;
            return (
              <div key={f.id} className="border-b border-line last:border-b-0">
                <div
                  onClick={() => setExpanded(open ? null : f.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-bg"
                >
                  <div className="flex-1">
                    <div className="font-display text-[15px] font-bold text-text">
                      {f.family_name}
                    </div>
                    <div className="text-[12px] text-muted">
                      {kids.length} {kids.length === 1 ? "Athlete" : "Athletes"}
                      {f.primary_phone ? ` · ${formatPhone(f.primary_phone)}` : ""}
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
                    {f.primary_email && (
                      <div className="mb-2 text-[12px] text-muted">
                        {f.primary_email}
                      </div>
                    )}

                    <div className="mb-2 font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
                      Athletes
                    </div>
                    {kids.length > 0 && (
                      <div className="mb-3 overflow-hidden rounded-[12px] border border-line bg-paper">
                        {kids.map((k) => (
                          <div
                            key={k.id}
                            className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0"
                          >
                            <div className="flex-1 text-[14px] font-semibold text-text">
                              {k.first_name} {k.last_name}
                              <span className="ml-2 text-[12px] font-normal capitalize text-muted">
                                {k.position !== "unknown" ? k.position : ""}
                              </span>
                            </div>
                            <button
                              onClick={() => removeAthlete(k.id)}
                              disabled={busy}
                              className="text-[11px] font-extrabold text-danger disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={open ? athFirst : ""}
                        onChange={(e) => setAthFirst(e.target.value)}
                        placeholder="First"
                        className="sel flex-1"
                      />
                      <input
                        value={open ? athLast : ""}
                        onChange={(e) => setAthLast(e.target.value)}
                        placeholder="Last"
                        className="sel flex-1"
                      />
                      <select
                        value={athPos}
                        onChange={(e) => setAthPos(e.target.value)}
                        className="sel sm:w-[130px]"
                      >
                        {POSITIONS.map((p) => (
                          <option key={p} value={p} className="capitalize">
                            {p}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => addAthlete(f.id)}
                        disabled={busy}
                        className="inline-flex h-10 items-center justify-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white disabled:opacity-50"
                      >
                        Add Athlete
                      </button>
                    </div>

                    <div className="mt-3">
                      <button
                        onClick={() => removeFamily(f.id)}
                        disabled={busy}
                        className="text-[11px] font-extrabold text-danger disabled:opacity-40"
                      >
                        Remove Family
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .sel{border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}
