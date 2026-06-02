"use client";

import { useRouter } from "next/navigation";

export default function DateNav({ date }: { date: string }) {
  const router = useRouter();

  function shift(days: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    router.push(`/schedule?date=${y}-${m}-${day}`);
  }

  const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mb-4 flex items-center gap-3">
      <button
        onClick={() => shift(-1)}
        className="h-[30px] w-[30px] rounded-[8px] border border-line-2 bg-paper text-[15px] text-text hover:border-accent"
      >
        ‹
      </button>
      <button
        onClick={() => shift(1)}
        className="h-[30px] w-[30px] rounded-[8px] border border-line-2 bg-paper text-[15px] text-text hover:border-accent"
      >
        ›
      </button>
      <div className="font-display text-[15px] font-extrabold text-text">
        {label}
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => router.push(`/schedule?date=${e.target.value}`)}
        className="ml-auto rounded-[8px] border border-line-2 bg-paper px-3 py-[6px] text-[13px] text-text outline-none focus:border-accent"
      />
    </div>
  );
}
