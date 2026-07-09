"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { FamilyLite } from "@/lib/data/resources";

// A type-to-filter picker for clients (families). Start typing a name and
// matching clients appear; tap one to select. Falls back to a plain list when
// the box is focused but empty. Selection is by family id, same as the old
// dropdown, so it drops into existing forms without other changes.
export default function ClientAutocomplete({
  families,
  value,
  onChange,
  placeholder = "Type a client name...",
  allowNone = true,
}: {
  families: FamilyLite[];
  value: string; // selected family id, or "" for none
  onChange: (id: string) => void;
  placeholder?: string;
  allowNone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => families.find((f) => f.id === value) ?? null,
    [families, value]
  );

  // When a client is selected, show its name in the box (unless the user is
  // actively typing a new query).
  const displayValue = open ? query : selected?.family_name ?? "";

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return families.slice(0, 12);
    return families
      .filter((f) => {
        const hay = [
          f.family_name,
          f.point_of_contact ?? "",
          f.sport ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [families, query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        className="w-full rounded-[8px] border border-line-2 bg-paper px-[11px] py-[8px] text-[13px] text-text outline-none focus:border-accent"
      />

      {selected && !open && (
        <button
          type="button"
          onClick={() => pick("")}
          aria-label="Clear client"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[16px] leading-none text-muted hover:text-danger"
        >
          &times;
        </button>
      )}

      {open && (
        <div className="absolute z-30 mt-1 max-h-[240px] w-full overflow-y-auto rounded-[10px] border border-line-2 bg-paper shadow-lg">
          {allowNone && (
            <button
              type="button"
              onClick={() => pick("")}
              className="block w-full border-b border-line px-3 py-[9px] text-left text-[13px] text-muted hover:bg-bg/60"
            >
              None
            </button>
          )}
          {matches.length === 0 ? (
            <div className="px-3 py-3 text-center text-[12px] text-muted">
              No match. Use &ldquo;+ New Client&rdquo; below.
            </div>
          ) : (
            matches.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => pick(f.id)}
                className={`block w-full border-b border-line px-3 py-[9px] text-left last:border-b-0 hover:bg-bg/60 ${
                  f.id === value ? "bg-sky/[.10]" : ""
                }`}
              >
                <div className="font-display text-[13px] font-bold text-text">
                  {f.family_name}
                </div>
                {(f.point_of_contact || f.sport) && (
                  <div className="text-[11px] text-muted">
                    {[f.point_of_contact, f.sport]
                      .filter(Boolean)
                      .join(" \u00b7 ")}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
