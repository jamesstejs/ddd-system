"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  createPripravek,
  updatePripravek,
  deletePripravek,
} from "@/lib/supabase/queries/pripravky";
import {
  createBezpecnostniList,
  deleteBezpecnostniList,
} from "@/lib/supabase/queries/bezpecnostni_listy";

const REVALIDATE_PATH = "/pripravky";

type PripravekInsert = Omit<
  Database["public"]["Tables"]["pripravky"]["Insert"],
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

type PripravekUpdate = Omit<
  Database["public"]["Tables"]["pripravky"]["Update"],
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

/**
 * Vytvoří nový přípravek (jen admin/super_admin).
 */
export async function createPripravekAction(data: PripravekInsert) {
  const { supabase } = await requireAdmin();

  if (!data.nazev || data.nazev.trim().length === 0) {
    throw new Error("Název přípravku je povinný");
  }

  const { error } = await createPripravek(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

/**
 * Aktualizuje přípravek (jen admin/super_admin).
 */
export async function updatePripravekAction(id: string, data: PripravekUpdate) {
  const { supabase } = await requireAdmin();

  if (!id) throw new Error("ID přípravku je povinné");

  const { error } = await updatePripravek(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

/**
 * Soft-delete přípravku (jen admin/super_admin).
 */
export async function deletePripravekAction(id: string) {
  const { supabase } = await requireAdmin();

  if (!id) throw new Error("ID přípravku je povinné");

  const { error } = await deletePripravek(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// --- Bezpečnostní listy ---

/**
 * Nahraje PDF bezpečnostní list ke přípravku (jen admin/super_admin).
 */
export async function uploadBezpecnostniListAction(
  pripravekId: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();

  const file = formData.get("file") as File;
  if (!file) throw new Error("Soubor nebyl vybrán");

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Soubor je příliš velký (max 10 MB)");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Povoleny jsou pouze PDF soubory");
  }

  // Upload to Storage
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${pripravekId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("bezpecnostni-listy")
    .upload(path, file, { upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("bezpecnostni-listy")
    .getPublicUrl(path);

  // Insert DB record
  const { error: dbError } = await createBezpecnostniList(supabase, {
    pripravek_id: pripravekId,
    soubor_url: urlData.publicUrl,
    nazev_souboru: file.name,
    velikost_bytes: file.size,
  });

  if (dbError) throw new Error(dbError.message);
  revalidatePath(REVALIDATE_PATH);
}

/**
 * Smaže bezpečnostní list (soft-delete DB + remove ze Storage).
 */
export async function deleteBezpecnostniListAction(blId: string, souborUrl: string) {
  const { supabase } = await requireAdmin();

  if (!blId) throw new Error("ID bezpečnostního listu je povinné");

  // Remove from Storage
  const storagePath = souborUrl.split("/bezpecnostni-listy/")[1];
  if (storagePath) {
    await supabase.storage.from("bezpecnostni-listy").remove([storagePath]);
  }

  // Soft-delete DB record
  const { error } = await deleteBezpecnostniList(supabase, blId);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}
