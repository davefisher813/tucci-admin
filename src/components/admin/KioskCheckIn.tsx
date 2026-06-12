"use client";

import { useEffect, useState } from "react";
import { checkInBooking } from "@/lib/data/checkin-actions";

export type KioskRow = {
  id: string;
  who: string;
  time: string;
  service_name: string;
  space_name: string;
  checkedIn: boolean;
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function KioskCheckIn({ rows }: { rows: KioskRow[] }) {
  const [list, setList] = useState<KioskRow[]>(rows);
  const [term, setTerm] = useState("");
  const [view, setView] = useState<"search" | "confirm" | "success">("search");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState(4);

  const active = list.find((r) => r.id === activeId) ?? null;

  const t = term.trim().toLowerCase();
  const matches = t
    ? list.filter(
        (r) =>
          r.who
            .toLowerCase()
            .split(" ")
            .some((w) => w.startsWith(t)) || r.who.toLowerCase().includes(t)
      )
    : [];

  useEffect(() => {
    if (view !== "success") return;
    setCount(4);
    let n = 4;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setTerm("");
        setActiveId(null);
        setView("search");
      } else {
        setCount(n);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [view]);

  function openConfirm(id: string) {
    setActiveId(id);
    setErr(null);
    setView("confirm");
  }

  function backToSearch() {
    setActiveId(null);
    setErr(null);
    setView("search");
  }

  async function doCheckIn() {
    if (!activeId) return;
    setPending(true);
    setErr(null);
    const res = await checkInBooking(activeId, "self");
    setPending(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setList((prev) =>
      prev.map((r) => (r.id === activeId ? { ...r, checkedIn: true } : r))
    );
    setView("success");
  }

  return (
    <div className="kiosk-bg">
      <div className="kiosk">
        <div className="brand">
          <div className="brand-mark">T</div>
          <div className="brand-name">
            TUCCI ELITE <span>· ATHLETIC COMPLEX</span>
          </div>
        </div>

        {view === "search" && (
          <section className="screen">
            <h1 className="h1">Check In</h1>
            <div className="sub">Enter your last name to find your session.</div>
            <input
              className="search"
              type="text"
              autoComplete="off"
              inputMode="text"
              placeholder="Last name"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <div className="results">
              {!t ? (
                <div className="hint">
                  <div className="hint-big">Start Typing Your Last Name</div>
                  <div className="hint-sm">
                    Your sessions for today will appear here.
                  </div>
                </div>
              ) : matches.length === 0 ? (
                <div className="hint">
                  <div className="hint-big">No Match</div>
                  <div className="hint-sm">
                    Check the spelling or see the front desk.
                  </div>
                </div>
              ) : (
                matches.map((r) =>
                  r.checkedIn ? (
                    <div key={r.id} className="card done">
                      <div className="av">{initials(r.who)}</div>
                      <div className="card-body">
                        <div className="card-name">{r.who}</div>
                        <div className="card-detail">
                          {r.time} · {r.service_name} · {r.space_name}
                        </div>
                      </div>
                      <span className="pill-done">✓ Checked In</span>
                    </div>
                  ) : (
                    <button
                      key={r.id}
                      className="card"
                      onClick={() => openConfirm(r.id)}
                    >
                      <div className="av">{initials(r.who)}</div>
                      <div className="card-body">
                        <div className="card-name">{r.who}</div>
                        <div className="card-detail">
                          {r.time} · {r.service_name} · {r.space_name}
                        </div>
                      </div>
                      <span className="chev">&#8250;</span>
                    </button>
                  )
                )
              )}
            </div>
          </section>
        )}

        {view === "confirm" && active && (
          <section className="screen screen-center">
            <div className="eyebrow">Confirming Check-In</div>
            <div className="confirm-name">{active.who}</div>
            <div className="detail-card">
              <div className="drow">
                <span className="dk">Time</span>
                <span className="dv">{active.time}</span>
              </div>
              <div className="drow">
                <span className="dk">Session</span>
                <span className="dv">{active.service_name}</span>
              </div>
              <div className="drow">
                <span className="dk">Space</span>
                <span className="dv">{active.space_name}</span>
              </div>
            </div>
            {err && <div className="kiosk-err">{err}</div>}
            <button
              className="btn btn-primary"
              onClick={doCheckIn}
              disabled={pending}
            >
              {pending ? "Checking In…" : "Confirm Check-In"}
            </button>
            <button
              className="btn btn-ghost"
              onClick={backToSearch}
              disabled={pending}
            >
              Not Me · Go Back
            </button>
          </section>
        )}

        {view === "success" && (
          <section className="screen screen-center">
            <div className="success-wrap">
              <div className="check">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#10B981"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="success-h">You're Checked In</h2>
              <div className="success-name">{active ? active.who : ""}</div>
              <div className="success-go">
                Head on in. Have a great session.
              </div>
              <div className="countdown">Returning in {count}</div>
            </div>
          </section>
        )}

        <style>{`
          .kiosk-bg{min-height:100vh;background:var(--bg);}
          .kiosk{max-width:600px;margin:0 auto;padding:26px 22px 34px;display:flex;flex-direction:column;min-height:100vh;}

          .brand{display:flex;align-items:center;gap:9px;margin-bottom:26px;flex-shrink:0;}
          .brand-mark{width:34px;height:34px;border-radius:9px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:900;font-size:16px;}
          .brand-name{font-family:var(--fd);font-weight:800;font-size:14px;letter-spacing:.04em;color:var(--text);}
          .brand-name span{color:var(--accent);}

          .screen{flex:1;display:flex;flex-direction:column;}
          .screen-center{justify-content:center;}

          .h1{font-family:var(--fd);font-weight:900;font-size:42px;line-height:1.02;letter-spacing:-.02em;color:var(--text);margin:0;}
          .sub{font-family:var(--fs);font-weight:400;font-size:17px;color:var(--text);margin:9px 0 22px;}
          .search{width:100%;height:64px;border:1.5px solid var(--line-2);background:var(--paper);border-radius:14px;padding:0 18px;font-family:var(--fs);font-size:20px;font-weight:500;color:var(--text);outline:none;transition:border-color .15s;}
          .search:focus{border-color:var(--accent);}
          .search::placeholder{color:var(--muted);}

          .results{margin-top:16px;display:flex;flex-direction:column;gap:10px;}
          .hint{text-align:center;padding:48px 16px;}
          .hint-big{font-family:var(--fd);font-weight:800;font-size:18px;color:var(--text);margin-bottom:5px;}
          .hint-sm{font-family:var(--fs);font-size:14px;color:var(--muted);}

          .card{display:flex;align-items:center;gap:14px;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:15px 16px;min-height:78px;text-align:left;cursor:pointer;transition:border-color .12s,background .12s;width:100%;font-family:var(--fs);}
          .card:active{border-color:var(--accent);background:rgba(125,196,232,.08);}
          .card.done{cursor:default;}
          .av{width:48px;height:48px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-weight:800;font-size:18px;background:rgba(125,196,232,.16);color:var(--accent);}
          .card.done .av{background:rgba(16,185,129,.14);color:var(--success);}
          .card-body{flex:1;min-width:0;}
          .card-name{font-family:var(--fd);font-weight:800;font-size:19px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .card-detail{font-family:var(--fs);font-weight:500;font-size:14px;color:var(--muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
          .chev{font-family:var(--fd);font-size:24px;color:var(--line-2);flex-shrink:0;line-height:1;}
          .pill-done{display:inline-flex;align-items:center;gap:5px;flex-shrink:0;font-family:var(--fd);font-weight:800;font-size:12px;color:var(--success);background:rgba(16,185,129,.12);padding:7px 11px;border-radius:999px;}

          .eyebrow{font-family:var(--fd);font-weight:800;font-size:12px;letter-spacing:.14em;color:var(--accent);text-transform:uppercase;}
          .confirm-name{font-family:var(--fd);font-weight:900;font-size:40px;line-height:1.05;letter-spacing:-.015em;color:var(--text);margin:8px 0 20px;}
          .detail-card{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:6px 18px;margin-bottom:24px;}
          .drow{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--line);}
          .drow:last-child{border-bottom:none;}
          .dk{font-family:var(--fd);font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
          .dv{font-family:var(--fd);font-weight:800;font-size:17px;color:var(--text);}

          .kiosk-err{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.25);color:var(--danger);border-radius:10px;padding:10px 13px;font-family:var(--fs);font-size:13px;margin-bottom:14px;}

          .btn{width:100%;border:none;border-radius:13px;font-family:var(--fd);font-weight:800;cursor:pointer;transition:opacity .12s,border-color .12s;}
          .btn:disabled{opacity:.55;cursor:default;}
          .btn-primary{height:62px;background:var(--ink);color:#fff;font-size:18px;letter-spacing:.01em;}
          .btn-primary:active{opacity:.85;}
          .btn-ghost{height:52px;background:var(--paper);border:1.5px solid var(--line-2);color:var(--text);font-size:15px;margin-top:11px;}
          .btn-ghost:active{border-color:var(--accent);}

          .success-wrap{text-align:center;}
          .check{width:108px;height:108px;border-radius:50%;background:rgba(16,185,129,.13);display:flex;align-items:center;justify-content:center;margin:0 auto 22px;}
          .check svg{width:54px;height:54px;}
          .success-h{font-family:var(--fd);font-weight:900;font-size:38px;letter-spacing:-.015em;color:var(--text);margin:0;}
          .success-name{font-family:var(--fd);font-weight:800;font-size:20px;color:var(--accent);margin:10px 0 4px;}
          .success-go{font-family:var(--fs);font-size:16px;color:var(--text);}
          .countdown{font-family:var(--fs);font-size:13px;color:var(--muted);margin-top:26px;}
        `}</style>
      </div>
    </div>
  );
}
