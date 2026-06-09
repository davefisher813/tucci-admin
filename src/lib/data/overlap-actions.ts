"use server";

import { createClient } from "@/lib/supabase/server";

type ActionResult = { error: string | null };

function mapErr(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("23p01") || m.includes("overlap") || m.includes("exclude")) {
    return "That change would double-book an existing reservation. Move or cancel the conflicting booking first, then try again.";
  }
  if (
    m.includes("does not exist") ||
    m.includes("could not find the function")
  ) {
    return "The setup functions aren't in the database yet. Run the latest migration, then retry.";
  }
  return message;
}

// Flip a space between whole-only and bookable-in-halves. Rebuilds the zone
// graph in the DB; if un-splitting collides with existing half bookings, the
// change is rejected and nothing is saved.
export async function setSplittable(
  assetId: string,
  value: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_space_splittable", {
    p_asset: assetId,
    p_value: value,
  });
  if (error) return { error: mapErr(error.message) };
  return { error: null };
}

// Set which cages a field/area covers. Empty array clears coverage. Rebuilds the
// zone graph atomically; a conflicting change rolls back fully.
export async function setCoverage(
  parentId: string,
  childIds: string[]
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_space_coverage", {
    p_parent: parentId,
    p_children: childIds,
  });
  if (error) return { error: mapErr(error.message) };
  return { error: null };
}
