"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createWaiverIntake } from "@/lib/data/waiver-actions";

type Ath = { first: string; last: string; dob: string };

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function WaiverIntakeForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [aths, setAths] = useState<Ath[]>([{ first: "", last: "", dob: "" }]);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [signed, setSigned] = useState(todayYmd());

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ name: string; count: number } | null>(
    null
  );

  function setAth(i: number, patch: Partial<Ath>) {
    setAths((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }
  function addAth() {
    setAths((prev) => [...prev, { first: "", last: "", dob: "" }]);
  }
  function rmAth(i: number) {
    setAths((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }

  function reset() {
    setFile(null);
    setFamilyName("");
    setEmail("");
    setPhone("");
    setAths([{ first: "", last: "", dob: "" }]);
    setEcName("");
    setEcPhone("");
    setSigned(todayYmd());
    setErr(null);
    setDone(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    setErr(null);
    const filled = aths.filter((a) => a.first.trim() || a.last.trim());
    const problems: string[] = [];
    if (!file) problems.push("a signed PDF");
    if (!familyName.trim()) problems.push("the family name");
    if (filled.length === 0) problems.push("at least one athlete");
    filled.forEach((a, i) => {
      if (!a.first.trim() || !a.last.trim())
        problems.push(`first + last name for athlete ${i + 1}`);
    });
    if (problems.length) {
      setErr("Still need: " + problems.join(", ") + ".");
      return;
    }

    const fd = new FormData();
    fd.append("pdf", file as File);
    fd.append("family_name", familyName.trim());
    fd.append("email", email.trim());
    fd.append("phone", phone.trim());
    fd.append("ec_name", ecName.trim());
    fd.append("ec_phone", ecPhone.trim());
    fd.append("signed_date", signed);
    fd.append(
      "athletes",
      JSON.stringify(
        filled.map((a) => ({
          first_name: a.first.trim(),
          last_name: a.last.trim(),
          date_of_birth: a.dob || null,
        }))
      )
    );

    setBusy(true);
    const res = await createWaiverIntake(fd);
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setDone({ name: familyName.trim(), count: filled.length });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-[760px]">
        <div className="rounded-[16px] border border-success bg-paper p-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success text-[20px] text-white">
            ✓
          </div>
          <h2 className="mb-1 font-display text-[18px] font-extrabold text-text">
            Waiver saved
          </h2>
          <p className="text-[14px] text-muted">
            Created <b className="text-text">{done.name}</b> with {done.count}{" "}
            athlete{done.count === 1 ? "" : "s"} and stored the signed PDF.
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={reset}
              className="rounded-[10px] border border-ink bg-ink px-4 py-[10px] font-display text-[12.5px] font-extrabold text-white"
            >
              Add another
            </button>
            <button
              onClick={() => router.push("/athletes")}
              className="rounded-[10px] border border-line-2 bg-paper px-4 py-[10px] font-display text-[12.5px] font-extrabold text-text"
            >
              Go to Athletes
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fileLabel = file
    ? `${file.name} · ${(file.size / 1024).toFixed(0)} KB`
    : null;

  return (
    <div className="mx-auto max-w-[760px] pb-[120px]">
      <h1 className="mb-[3px] font-display text-[21px] font-extrabold text-text">
        Add waiver
      </h1>
      <p className="mb-[18px] text-[13px] text-muted">
        Upload a signed waiver, enter the family, and the app creates the
        records.
      </p>

      {/* UPLOAD */}
      <div className="mb-[14px] rounded-[16px] border border-line bg-paper p-[18px]">
        <div className="sec">Signed Waiver</div>
        {file ? (
          <div className="flex items-center gap-[10px] rounded-[10px] border border-line bg-bg/50 px-3 py-[10px]">
            <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[8px] bg-accent font-display text-[13px] font-extrabold text-white">
              PDF
            </div>
            <div className="min-w-0 truncate font-display text-[13px] font-bold text-text">
              {fileLabel}
            </div>
            <button
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="ml-auto px-1 text-[18px] text-muted"
              aria-label="Remove file"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-[12px] border-[1.5px] border-dashed border-line-2 px-3 py-[22px] text-center transition-colors hover:border-accent"
          >
            <div className="text-[26px] leading-none">📄</div>
            <div className="mt-[6px] font-display text-[13.5px] font-extrabold text-text">
              Tap to choose the signed PDF
            </div>
            <div className="mt-[3px] text-[11.5px] text-muted">
              PDF, stored privately
            </div>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* PARENT */}
      <div className="mb-[14px] rounded-[16px] border border-line bg-paper p-[18px]">
        <div className="sec">Parent / Guardian</div>
        <div className="field">
          <label className="lab">
            Family / last name <span className="text-danger">*</span>
          </label>
          <input
            className="inp"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="e.g. Martinez"
          />
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          <div className="field">
            <label className="lab">Email</label>
            <input
              className="inp"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
            />
          </div>
          <div className="field">
            <label className="lab">Phone</label>
            <input
              className="inp"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(203) 555-0100"
            />
          </div>
        </div>
      </div>

      {/* ATHLETES */}
      <div className="mb-[14px] rounded-[16px] border border-line bg-paper p-[18px]">
        <div className="sec">Athletes</div>
        {aths.map((a, i) => (
          <div
            key={i}
            className="mb-[10px] rounded-[12px] border border-line p-3"
          >
            <div className="mb-[10px] flex items-center justify-between">
              <b className="font-display text-[12.5px] font-extrabold text-text">
                Athlete {i + 1}
              </b>
              {aths.length > 1 && (
                <button
                  onClick={() => rmAth(i)}
                  className="font-display text-[12px] font-bold text-muted hover:text-danger"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-[10px]">
              <div className="field">
                <label className="lab">
                  First <span className="text-danger">*</span>
                </label>
                <input
                  className="inp"
                  value={a.first}
                  onChange={(e) => setAth(i, { first: e.target.value })}
                />
              </div>
              <div className="field">
                <label className="lab">
                  Last <span className="text-danger">*</span>
                </label>
                <input
                  className="inp"
                  value={a.last}
                  onChange={(e) => setAth(i, { last: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label className="lab">Date of Birth</label>
              <input
                className="inp"
                type="date"
                value={a.dob}
                onChange={(e) => setAth(i, { dob: e.target.value })}
              />
            </div>
          </div>
        ))}
        <button
          onClick={addAth}
          className="w-full rounded-[10px] border border-dashed border-line-2 px-3 py-[11px] font-display text-[12.5px] font-extrabold text-accent hover:border-accent"
        >
          + Add athlete
        </button>
      </div>

      {/* EMERGENCY + DATE */}
      <div className="mb-[14px] rounded-[16px] border border-line bg-paper p-[18px]">
        <div className="sec">
          Emergency contact{" "}
          <span className="text-[11px] font-semibold text-muted">
            (optional)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-[10px]">
          <div className="field">
            <label className="lab">Name</label>
            <input
              className="inp"
              value={ecName}
              onChange={(e) => setEcName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="field">
            <label className="lab">Phone</label>
            <input
              className="inp"
              type="tel"
              value={ecPhone}
              onChange={(e) => setEcPhone(e.target.value)}
              placeholder="(203) 555-0199"
            />
          </div>
        </div>
        <div className="field mt-[6px]">
          <label className="lab">Date Signed</label>
          <input
            className="inp"
            type="date"
            value={signed}
            onChange={(e) => setSigned(e.target.value)}
          />
        </div>
        <p className="mt-[10px] text-[11.5px] leading-[1.45] text-muted">
          Emergency contact is saved to the family&apos;s notes. Auto-extract
          from the PDF would later pre-fill all of these.
        </p>
      </div>

      {err && (
        <p className="mb-3 text-[12.5px] font-semibold text-danger">{err}</p>
      )}

      <div className="sticky bottom-4 flex items-center gap-3 rounded-[14px] border border-line-2 bg-paper px-4 py-3 shadow-lg">
        <div className="min-w-0 flex-1">
          <div className="font-display text-[14px] font-extrabold text-text">
            {familyName.trim() || "New family"}
          </div>
          <div className="text-[11.5px] text-muted">
            {aths.filter((a) => a.first.trim()).length} athlete
            {aths.filter((a) => a.first.trim()).length === 1 ? "" : "s"} ·{" "}
            {file ? "file ready" : "no file"}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={busy}
          className="inline-flex h-11 items-center rounded-[11px] border border-ink bg-ink px-5 font-display text-[13px] font-extrabold tracking-[.02em] text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Create"}
        </button>
      </div>

      <style>{`
        .sec{font-family:var(--fd);font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--accent);margin:0 0 12px;}
        .lab{font-family:var(--fd);font-size:11.5px;font-weight:700;color:#525866;margin:0 0 5px;display:block;}
        .field{margin-bottom:12px;}
        .field:last-child{margin-bottom:0;}
        .inp{width:100%;border:1px solid var(--line-2);background:var(--paper);color:var(--text);border-radius:9px;padding:11px 12px;font-family:var(--fs);font-size:14px;outline:none;}
        .inp:focus{border-color:var(--accent);}
      `}</style>
    </div>
  );
}
