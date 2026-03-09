"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  updateCenikObecne,
  createCenikPostriky,
  updateCenikPostriky,
  deleteCenikPostriky,
  createCenikGely,
  updateCenikGely,
  deleteCenikGely,
  createCenikSpecialni,
  updateCenikSpecialni,
  deleteCenikSpecialni,
  createCenikDeratizace,
  updateCenikDeratizace,
  deleteCenikDeratizace,
  createCenikDezinfekce,
  updateCenikDezinfekce,
  deleteCenikDezinfekce,
} from "@/lib/supabase/queries/cenik";

const REVALIDATE_PATH = "/nastaveni/cenik";

// =====================================================
// cenik_obecne — only update (fixed rows)
// =====================================================

export async function updateObecneAction(
  id: string,
  data: Pick<Database["public"]["Tables"]["cenik_obecne"]["Update"], "hodnota" | "poznamka">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateCenikObecne(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// =====================================================
// cenik_postriky
// =====================================================

export async function createPostrikyAction(
  data: Omit<Database["public"]["Tables"]["cenik_postriky"]["Insert"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createCenikPostriky(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updatePostrikyAction(
  id: string,
  data: Omit<Database["public"]["Tables"]["cenik_postriky"]["Update"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateCenikPostriky(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deletePostrikyAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await deleteCenikPostriky(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// =====================================================
// cenik_gely
// =====================================================

export async function createGelyAction(
  data: Omit<Database["public"]["Tables"]["cenik_gely"]["Insert"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createCenikGely(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updateGelyAction(
  id: string,
  data: Omit<Database["public"]["Tables"]["cenik_gely"]["Update"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateCenikGely(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deleteGelyAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await deleteCenikGely(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// =====================================================
// cenik_specialni
// =====================================================

export async function createSpecialniAction(
  data: Omit<Database["public"]["Tables"]["cenik_specialni"]["Insert"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createCenikSpecialni(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updateSpecialniAction(
  id: string,
  data: Omit<Database["public"]["Tables"]["cenik_specialni"]["Update"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateCenikSpecialni(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deleteSpecialniAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await deleteCenikSpecialni(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// =====================================================
// cenik_deratizace
// =====================================================

export async function createDeratizaceAction(
  data: Omit<Database["public"]["Tables"]["cenik_deratizace"]["Insert"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createCenikDeratizace(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updateDeratizaceAction(
  id: string,
  data: Omit<Database["public"]["Tables"]["cenik_deratizace"]["Update"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateCenikDeratizace(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deleteDeratizaceAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await deleteCenikDeratizace(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

// =====================================================
// cenik_dezinfekce
// =====================================================

export async function createDezinfekceAction(
  data: Omit<Database["public"]["Tables"]["cenik_dezinfekce"]["Insert"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createCenikDezinfekce(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function updateDezinfekceAction(
  id: string,
  data: Omit<Database["public"]["Tables"]["cenik_dezinfekce"]["Update"], "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateCenikDezinfekce(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}

export async function deleteDezinfekceAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await deleteCenikDezinfekce(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(REVALIDATE_PATH);
}
