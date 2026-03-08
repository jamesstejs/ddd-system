"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

type ObjektInsert = Database["public"]["Tables"]["objekty"]["Insert"];
type OkruhInsert = Database["public"]["Tables"]["okruhy"]["Insert"];

// --- Objekty CRUD ---

export async function createObjektAction(
  data: Omit<ObjektInsert, "id" | "created_at" | "updated_at" | "deleted_at">
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("objekty").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath(`/klienti/${data.klient_id}`);
}

export async function updateObjektAction(
  id: string,
  klientId: string,
  data: Partial<Omit<ObjektInsert, "id" | "klient_id" | "created_at" | "updated_at" | "deleted_at">>
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("objekty")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/klienti/${klientId}`);
  revalidatePath(`/klienti/${klientId}/objekty/${id}`);
}

export async function deleteObjektAction(id: string, klientId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("objekty")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/klienti/${klientId}`);
}

// --- Plánek upload ---

export async function uploadPlanekAction(objektId: string, klientId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const file = formData.get("file") as File;
  if (!file) throw new Error("Soubor nebyl vybrán");

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Soubor je příliš velký (max 5 MB)");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Povoleny jsou pouze obrázky");
  }

  // Delete old file if exists
  const { data: objekt } = await supabase
    .from("objekty")
    .select("planek_url")
    .eq("id", objektId)
    .single();

  if (objekt?.planek_url) {
    const oldPath = objekt.planek_url.split("/planky/")[1];
    if (oldPath) {
      await supabase.storage.from("planky").remove([oldPath]);
    }
  }

  // Upload new file
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${objektId}/planek.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("planky")
    .upload(path, file, { upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("planky")
    .getPublicUrl(path);

  // Update objekt with planek_url
  const { error: updateError } = await supabase
    .from("objekty")
    .update({ planek_url: urlData.publicUrl })
    .eq("id", objektId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/klienti/${klientId}/objekty/${objektId}`);
  revalidatePath(`/klienti/${klientId}`);

  return urlData.publicUrl;
}

export async function deletePlanekAction(objektId: string, klientId: string) {
  const { supabase } = await requireAdmin();

  const { data: objekt } = await supabase
    .from("objekty")
    .select("planek_url")
    .eq("id", objektId)
    .single();

  if (objekt?.planek_url) {
    const oldPath = objekt.planek_url.split("/planky/")[1];
    if (oldPath) {
      await supabase.storage.from("planky").remove([oldPath]);
    }
  }

  const { error } = await supabase
    .from("objekty")
    .update({ planek_url: null })
    .eq("id", objektId);

  if (error) throw new Error(error.message);

  revalidatePath(`/klienti/${klientId}/objekty/${objektId}`);
  revalidatePath(`/klienti/${klientId}`);
}

// --- Okruhy CRUD ---

export async function createOkruhAction(
  data: Omit<OkruhInsert, "id" | "created_at" | "updated_at" | "deleted_at">,
  klientId: string
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("okruhy").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath(`/klienti/${klientId}/objekty/${data.objekt_id}`);
}

export async function updateOkruhAction(
  id: string,
  objektId: string,
  klientId: string,
  data: Partial<Omit<OkruhInsert, "id" | "objekt_id" | "created_at" | "updated_at" | "deleted_at">>
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("okruhy")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/klienti/${klientId}/objekty/${objektId}`);
}

export async function deleteOkruhAction(id: string, objektId: string, klientId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("okruhy")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/klienti/${klientId}/objekty/${objektId}`);
}
