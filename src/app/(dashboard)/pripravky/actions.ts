"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  createPripravek,
  updatePripravek,
  deletePripravek,
} from "@/lib/supabase/queries/pripravky";

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
