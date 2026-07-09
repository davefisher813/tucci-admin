"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { globalSearch, type SearchHit } from "@/lib/data/search-actions";

const INITIALS = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Group({
  label,
  hits,
}: {
  label: string;
  hits: SearchHit[];
}) {
  if (hits.length === 0) return null;
  return (
    <div>
      <div className="px-4 pb-1 pt-3 font-display text-[11px] font-extrabold uppercase tracking-[.05em] text-muted">
        {label}
      </div>
      {hits.map((h) => (
        <Link
          key={h.id}
          href={h.href}
          className="flex items-center gap-3 border-t border-line px-4 py-3 hover:bg-bg/60"
        >
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] bg-sky/[.16] font-display text-[12px] font-extrabold text-accent">
            {INITIALS(h.title)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[14px] font-bold text-text">
              {h.title}
            </div>
            <div className="truncate text-[12px] text-muted">{h.detail}</div>
          </div>
          <span className="ml-auto shrink-0 text-line-2">&rsaquo;</span>
        </Link>
      ))}
    </div>
  );
}

export default function SearchView() {
  const [term, setTerm] = useState("");
  const [athletes, setAthletes] = useState<SearchHit[]>([]);
  const [clients, setClients] = useState<SearchHit[]>([]);
  const [bookings, setBookings] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    setTerm(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setAthletes([]);
      setClients([]);
      setBookings([]);
      setSearched(false);
      return;
    }
    // Debounce so we don't fire on every keystroke.
    timer.current = setTimeout(async () => {
      setBusy(true);
      const res = await globalSearch(value);
      setBusy(false);
      setSearched(true);
      setAthletes(res.athletes);
      setClients(res.clients);
      setBookings(res.bookings);
    }, 250);
  }

  const total = athletes.length + clients.length + bookings.length;

  return (
    <div>
      <div className="mb-1 font-display text-[22px] font-extrabold tracking-[-.01em] text-text">
        Search
      </div>
      <div className="mb-4 text-[13px] text-muted">
        Athletes, clients, and bookings in one place.
      </div>

      <input
        autoFocus
        value={term}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search a name, phone, email, or note..."
        className="mb-4 w-full rounded-[11px] border border-line-2 bg-paper px-4 py-[11px] text-[15px] text-text outline-none focus:border-accent"
      />

      <div className="overflow-hidden rounded-[16px] border border-line bg-paper">
        {term.trim().length < 2 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            Type at least 2 characters to search.
          </div>
        ) : busy && !searched ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            Searching...
          </div>
        ) : searched && total === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-muted">
            No matches for &ldquo;{term}&rdquo;.
          </div>
        ) : (
          <div className="pb-2">
            <Group label="Athletes" hits={athletes} />
            <Group label="Clients" hits={clients} />
            <Group label="Bookings" hits={bookings} />
          </div>
        )}
      </div>
    </div>
  );
}
