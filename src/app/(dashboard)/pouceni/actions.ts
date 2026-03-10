"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  createSablonaPouceni,
  updateSablonaPouceni,
  deleteSablonaPouceni,
} from "@/lib/supabase/queries/sablony_pouceni";

const REVALIDATE_PATH = "/pouceni";

type SablonaInsert = Omit<
  Database["public"]["Tables"]["sablony_pouceni"]["Insert"],
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

type SablonaUpdate = Omit<
  Database["public"]["Tables"]["sablony_pouceni"]["Update"],
  "id" | "created_at" | "updated_at" | "deleted_at"
>;

/**
 * Vytvoří novou šablonu poučení (jen admin/super_admin).
 */
export async function createSablonaAction(data: SablonaInsert) {
  const { supabase } = await requireAdmin();

  if (!data.nazev || data.nazev.trim().length === 0) {
    throw new Error("Název šablony je povinný");
  }

  const { error } = await createSablonaPouceni(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

/**
 * Aktualizuje šablonu poučení (jen admin/super_admin).
 */
export async function updateSablonaAction(id: string, data: SablonaUpdate) {
  const { supabase } = await requireAdmin();

  if (!id) throw new Error("ID šablony je povinné");

  const { error } = await updateSablonaPouceni(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

/**
 * Soft-delete šablony poučení (jen admin/super_admin).
 */
export async function deleteSablonaAction(id: string) {
  const { supabase } = await requireAdmin();

  if (!id) throw new Error("ID šablony je povinné");

  const { error } = await deleteSablonaPouceni(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}
