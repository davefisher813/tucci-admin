"use server";

import { createClient } from "@/lib/supabase/server";

type AthleteInput = {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
};

type Result = { error: string | null; familyId?: string };

export async function createWaiverIntake(
  formData: FormData
): Promise<Result> {
  const supabase = await createClient();

  const file = formData.get("pdf");
  const familyName = String(formData.get("family_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const ecName = String(formData.get("ec_name") ?? "").trim();
  const ecPhone = String(formData.get("ec_phone") ?? "").trim();
  const signedDate = String(formData.get("signed_date") ?? "").trim();

  let athletes: AthleteInput[] = [];
  try {
    athletes = JSON.parse(String(formData.get("athletes") ?? "[]"));
  } catch {
    athletes = [];
  }
  athletes = athletes.filter(
    (a) => a.first_name?.trim() && a.last_name?.trim()
  );

  if (!(file instanceof File) || file.size === 0)
    return { error: "Attach the signed PDF." };
  if (!familyName) return { error: "Family name is required." };
  if (athletes.length === 0) return { error: "Add at least one athlete." };

  const { data: auth } = await supabase.auth.getUser();
  const createdBy = auth?.user?.id ?? null;

  // 1. Family
  const emergencyNote =
    ecName || ecPhone
      ? `Emergency contact: ${ecName}${ecPhone ? ` (${ecPhone})` : ""}`
      : null;
  const { data: fam, error: famErr } = await supabase
    .from("families")
    .insert({
      family_name: familyName,
      primary_email: email || null,
      primary_phone: phone || null,
      is_active: true,
      notes: emergencyNote,
    })
    .select("id")
    .single();
  if (famErr || !fam)
    return {
      error: `Could not create family: ${famErr?.message ?? "unknown error"}`,
    };
  const familyId = (fam as { id: string }).id;

  // 2. Athletes
  const { error: athErr } = await supabase.from("athletes").insert(
    athletes.map((a) => ({
      family_id: familyId,
      first_name: a.first_name.trim(),
      last_name: a.last_name.trim(),
      date_of_birth: a.date_of_birth || null,
      position: "unknown",
      is_active: true,
    }))
  );
  if (athErr) {
    await supabase
      .from("families")
      .update({ is_active: false })
      .eq("id", familyId);
    return { error: `Family created, but athletes failed: ${athErr.message}` };
  }

  // 3. Upload the PDF
  const safe = (file.name || "waiver.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${familyId}/${Date.now()}_${safe}`;
  const { error: upErr } = await supabase.storage
    .from("waivers")
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr)
    return {
      error: `Family + athletes saved, but the PDF upload failed: ${upErr.message}`,
    };

  // 4. Signature record
  const { error: sigErr } = await supabase
    .from("document_signatures")
    .insert({
      family_id: familyId,
      document_type: "waiver",
      signing_method: "upload",
      storage_path: path,
      file_name: file.name || "waiver.pdf",
      signed_date: signedDate || null,
      created_by: createdBy,
    });
  if (sigErr)
    return {
      error: `Saved, but the signature record failed: ${sigErr.message}`,
    };

  return { error: null, familyId };
}
