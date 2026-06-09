"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clock } from "@/lib/format";
import { checkInBooking, undoCheckIn } from "@/lib/data/checkin-actions";

export type CheckInRow = {
  id: string;
  start_time: string;
  status: string;
  checked_in_at: string | null;
  who: string;
  service_name: string;
  space_name: string;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CheckInList({ rows }: { rows: CheckInRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.who.toLowerCase().includes(term));
  }, [rows, q]);

  const here = filtered.filter((r) => r.checked_in_at);
  const expected = filtered.filter((r) => !r.checked_in_at);

  async function doCheckIn(id: string) {
    setBusy(id);
    setErr(null);
    const res = await checkInBooking(id);
    setBusy(null);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  async function doUndo(id: string) {
    setBusy(id);
    setErr(null);
    const res = await undoCheckIn(id);
    setBusy(null);
    if (res.error) return setErr(res.error);
    router.refresh();
  }

  function Row({ r }: { r: CheckInRow }) {
    const isIn = !!r.checked_in_at;
    return (
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
        <div
          className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-extrabold ${
            isIn ? "bg-success/[.15] text-success" : "bg-sky/[.14] text-accent"
          }`}
        >
          {initials(r.who)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold text-text">
            {r.who}
          </div>
          <div className="truncate text-[13px] text-muted">
            {clock(r.start_time)} · {r.service_name} · {r.space_name}
          </div>
        </div>
        {isIn ? (
          <button
            onClick={() => doUndo(r.id)}
            disabled={busy === r.id}
            className="rounded-[9px] border border-line-2 bg-paper px-[14px] py-[7px] font-display text-[11px] font-extrabold tracking-[.02em] text-muted hover:border-accent disabled:opacity-40"
          >
            Undo
          </button>
        ) : (
          <button
            onClick={() => doCheckIn(r.id)}
            disabled={busy === r.id}
            className="rounded-[9px] border border-ink bg-ink px-[14px] py-[7px] font-display text-[11px] font-extrabold tracking-[.02em] text-white disabled:opacity-50"
          >
            Check In
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[760px]">
      {err && (
        <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {err}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name"
        className="mb-4 w-full rounded-[9px] border border-line-2 bg-paper px-3 py-[9px] text-[14px] text-text outline-none focus:border-accent"
      />

      <div className="mb-[14px] flex items-baseline justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
          Expected
        </div>
        <div className="font-display text-[12px] font-bold text-muted">
          {expected.length}
        </div>
      </div>
      <div className="mb-6 overflow-hidden rounded-[16px] border border-line bg-paper">
        {expected.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            Everyone expected today is checked in.
          </div>
        ) : (
          expected.map((r) => <Row key={r.id} r={r} />)
        )}
      </div>

      <div className="mb-[14px] flex items-baseline justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-[-.01em] text-text">
          Checked In
        </div>
        <div className="font-display text-[12px] font-bold text-muted">
          {here.length}
        </div>
      </div>
      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {here.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-muted">
            No one checked in yet.
          </div>
        ) : (
          here.map((r) => <Row key={r.id} r={r} />)
        )}
      </div>
    </div>
  );
}
