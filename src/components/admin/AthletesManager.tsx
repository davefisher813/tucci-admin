"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAthlete } from "@/lib/data/family-actions";

export type AthleteRow = {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  position: string;
  grade: string | null;
  school: string | null;
  bats: string | null;
  throws: string | null;
};

export type FamilyRow = { id: string; family_name: string };

function initials(f: string, l: string): string {
  return ((f[0] ?? "") + (l[0] ?? "")).toUpperCase();
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const handed = (v: string | null) =>
  v === "L" ? "Left" : v === "R" ? "Right" : v === "S" ? "Switch" : null;

export default function AthletesManager({
  athletes,
  families,
}: {
  athletes: AthleteRow[];
  families: FamilyRow[];
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aFam, setAFam] = useState("");
  const [aFirst, setAFirst] = useState("");
  const [aLast, setALast] = useState("");
  const [aPos, setAPos] = useState("");

  async function addAthlete() {
    setBusy(true);
    setErr(null);
    const res = await createAthlete({
      family_id: aFam,
      first_name: aFirst.trim(),
      last_name: aLast.trim(),
      position: aPos.trim(),
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setAFam("");
    setAFirst("");
    setALast("");
    setAPos("");
    setShowAdd(false);
    router.refresh();
  }

  const famName = new Map(families.map((f) => [f.id, f.family_name]));
  const t = term.trim().toLowerCase();

  const rows = athletes
    .map((a) => ({ ...a, family: famName.get(a.family_id) ?? "—" }))
    .filter(
      (a) =>
        !t ||
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(t) ||
        (a.preferred_name ?? "").toLowerCase().includes(t) ||
        a.family.toLowerCase().includes(t)
    )
    .sort((a, b) => a.last_name.localeCompare(b.last_name));

  return (
    <div className="mx-auto max-w-[760px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div className="font-display text-[12px] font-bold text-muted">
          {rows.length} {rows.length === 1 ? "Athlete" : "Athletes"}
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="inline-flex h-9 items-center rounded-[9px] border border-ink bg-ink px-[14px] font-display text-[11px] font-extrabold tracking-[.03em] text-white"
        >
          {showAdd ? "Close" : "Add Athlete"}
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-[16px] border border-line bg-paper p-4">
          <div className="mb-[10px] font-display text-[11px] font-extrabold tracking-[.02em] text-accent">
            New Athlete
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Client / Family
              </label>
              <select
                value={aFam}
                onChange={(e) => setAFam(e.target.value)}
                className="rounded-[9px] border border-line-2 bg-paper px-[11px] py-[11px] text-[14px]"
              >
                <option value="">Choose a Family…</option>
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.family_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-[10px]">
              <div className="flex flex-1 flex-col gap-[6px]">
                <label className="text-[12px] font-semibold text-muted">
                  First Name
                </label>
                <input
                  value={aFirst}
                  onChange={(e) => setAFirst(e.target.value)}
                  placeholder="Jake"
                  className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
                />
              </div>
              <div className="flex flex-1 flex-col gap-[6px]">
                <label className="text-[12px] font-semibold text-muted">
                  Last Name
                </label>
                <input
                  value={aLast}
                  onChange={(e) => setALast(e.target.value)}
                  placeholder="Martinez"
                  className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-muted">
                Position
              </label>
              <input
                value={aPos}
                onChange={(e) => setAPos(e.target.value)}
                placeholder="Pitcher"
                className="rounded-[9px] border border-line-2 px-[11px] py-[11px] text-[14px]"
              />
            </div>
            <button
              onClick={addAthlete}
              disabled={busy || !aFam || !aFirst.trim() || !aLast.trim()}
              className="rounded-[10px] bg-accent py-[13px] font-display text-[14px] font-extrabold text-white disabled:opacity-50"
            >
              {busy ? "Adding…" : "Add Athlete"}
            </button>
          </div>
        </div>
      )}

      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search athletes or family"
        className="sel mb-3"
      />

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="font-display text-[15px] font-extrabold text-text">
              {athletes.length === 0 ? "No athletes yet" : "No matches"}
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {athletes.length === 0
                ? "Add an athlete above and attach them to a family."
                : "Try a different name."}
            </div>
          </div>
        ) : (
          rows.map((a) => {
            const isOpen = open === a.id;
            const detail = [
              a.family,
              a.position !== "unknown" ? cap(a.position) : null,
              a.grade,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={a.id} className="border-b border-line last:border-b-0">
                <div
                  onClick={() => setOpen(isOpen ? null : a.id)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-bg"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky/[.16] font-display text-[12px] font-extrabold text-accent">
                    {initials(a.first_name, a.last_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[15px] font-bold text-text">
                      {a.first_name} {a.last_name}
                      {a.preferred_name ? ` (${a.preferred_name})` : ""}
                    </div>
                    <div className="truncate text-[12px] text-muted">
                      {detail || "Athlete"}
                    </div>
                  </div>
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
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                      <Detail k="Family" v={a.family} />
                      <Detail
                        k="Position"
                        v={a.position !== "unknown" ? cap(a.position) : "—"}
                      />
                      <Detail k="Grade" v={a.grade || "—"} />
                      <Detail k="School" v={a.school || "—"} />
                      <Detail k="Bats" v={handed(a.bats) || "—"} />
                      <Detail k="Throws" v={handed(a.throws) || "—"} />
                    </dl>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`
        .sel{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:8px;padding:9px 11px;outline:none;font-family:var(--fs);font-size:14px;height:40px;}
        .sel:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-display text-[10px] font-extrabold uppercase tracking-[.06em] text-muted">
        {k}
      </dt>
      <dd className="mt-[1px] font-semibold text-text">{v}</dd>
    </div>
  );
}
