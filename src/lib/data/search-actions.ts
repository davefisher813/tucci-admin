"use server";

import { requireRole } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  kind: "athlete" | "client" | "booking";
  id: string;
  title: string;
  detail: string;
  href: string;
};

export type SearchResults = {
  athletes: SearchHit[];
  clients: SearchHit[];
  bookings: SearchHit[];
  error: string | null;
};

const EMPTY: SearchResults = {
  athletes: [],
  clients: [],
  bookings: [],
  error: null,
};

export async function globalSearch(term: string): Promise<SearchResults> {
  await requireRole();
  const q = term.trim();
  if (q.length < 2) return EMPTY;

  const supabase = await createClient();
  const like = `%${q}%`;

  // Athletes: match on first or last name.
  const athletesP = supabase
    .from("athletes")
    .select("id, first_name, last_name, family_id, is_active")
    .or(`first_name.ilike.${like},last_name.ilike.${like}`)
    .limit(8);

  // Clients (families): match on family name, email, or phone.
  const clientsP = supabase
    .from("families")
    .select("id, family_name, primary_email, primary_phone")
    .or(
      `family_name.ilike.${like},primary_email.ilike.${like},primary_phone.ilike.${like}`
    )
    .limit(8);

  // Bookings: match on the joined family name or notes. Recent first.
  const bookingsP = supabase
    .from("bookings")
    .select(
      `id, start_time, notes, status,
       assets ( name ),
       families ( family_name )`
    )
    .or(`notes.ilike.${like}`)
    .order("start_time", { ascending: false })
    .limit(8);

  const [aRes, cRes, bRes] = await Promise.all([
    athletesP,
    clientsP,
    bookingsP,
  ]);

  const athletes: SearchHit[] = (aRes.data ?? []).map((a) => ({
    kind: "athlete",
    id: a.id,
    title: `${a.first_name} ${a.last_name}`.trim(),
    detail: a.is_active ? "Athlete" : "Athlete (inactive)",
    href: `/athletes?focus=${a.id}`,
  }));

  const clients: SearchHit[] = (cRes.data ?? []).map((c) => {
    const bits = [c.primary_email, c.primary_phone].filter(Boolean);
    return {
      kind: "client",
      id: c.id,
      title: c.family_name,
      detail: bits.length ? bits.join(" \u00b7 ") : "Client",
      href: `/clients?focus=${c.id}`,
    };
  });

  type BookingRow = {
    id: string;
    start_time: string;
    notes: string | null;
    status: string;
    assets: { name: string } | null;
    families: { family_name: string } | null;
  };

  const bookings: SearchHit[] = ((bRes.data as BookingRow[] | null) ?? []).map(
    (b) => {
      const when = new Date(b.start_time).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const space = b.assets?.name ?? "";
      const who = b.families?.family_name ?? "Booking";
      return {
        kind: "booking",
        id: b.id,
        title: who,
        detail: [when, space].filter(Boolean).join(" \u00b7 "),
        href: `/bookings?focus=${b.id}`,
      };
    }
  );

  return { athletes, clients, bookings, error: null };
}
