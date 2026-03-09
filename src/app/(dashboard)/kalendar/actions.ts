"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import {
  getZasahy,
  createZasah,
  updateZasah,
  softDeleteZasah,
  getTechnici,
} from "@/lib/supabase/queries/zasahy";
import { getAllDostupnost } from "@/lib/supabase/queries/dostupnost";
import { getZakazky } from "@/lib/supabase/queries/zakazky";
import type { Database } from "@/lib/supabase/database.types";

const REVALIDATE_PATH = "/kalendar";

/**
 * Načte zásahy pro admin kalendář v daném rozsahu datumů.
 */
export async function getZasahyAction(datumOd: string, datumDo: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await getZasahy(supabase, datumOd, datumDo);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Načte dostupnost všech techniků v rozsahu.
 */
export async function getDostupnostAction(datumOd: string, datumDo: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await getAllDostupnost(supabase, datumOd, datumDo);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Načte všechny techniky.
 */
export async function getTechniciAction() {
  const { supabase } = await requireAdmin();

  const { data, error } = await getTechnici(supabase);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Načte aktivní zakázky (pro výběr v přiřazení zásahu).
 */
export async function getAktivniZakazkyAction() {
  const { supabase } = await requireAdmin();

  const { data, error } = await getZakazky(supabase, { status: "aktivni" });
  if (error) throw new Error(error.message);

  // Přidat i zakázky se statusem "nova"
  const { data: noveData, error: noveError } = await getZakazky(supabase, {
    status: "nova",
  });
  if (noveError) throw new Error(noveError.message);

  return [...(data || []), ...(noveData || [])];
}

/**
 * Vytvoří nový zásah (admin přiřadí zakázku technikovi).
 */
export async function createZasahAction(input: {
  zakazka_id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  poznamka?: string;
  odhadovana_delka_min?: number;
}) {
  const { supabase } = await requireAdmin();

  // Validace časů
  if (input.cas_od >= input.cas_do) {
    throw new Error("Čas od musí být menší než čas do");
  }

  const { data, error } = await createZasah(supabase, {
    zakazka_id: input.zakazka_id,
    technik_id: input.technik_id,
    datum: input.datum,
    cas_od: input.cas_od,
    cas_do: input.cas_do,
    poznamka: input.poznamka || null,
    odhadovana_delka_min: input.odhadovana_delka_min || null,
    status: "naplanovano",
  });

  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
  return data;
}

/**
 * Aktualizuje zásah (změna statusu, času, poznámky).
 */
export async function updateZasahAction(
  id: string,
  input: {
    datum?: string;
    cas_od?: string;
    cas_do?: string;
    status?: Database["public"]["Enums"]["status_zasahu"];
    poznamka?: string | null;
    technik_id?: string;
  },
) {
  const { supabase } = await requireAdmin();

  // Validace časů pokud přijdou oba
  if (input.cas_od && input.cas_do && input.cas_od >= input.cas_do) {
    throw new Error("Čas od musí být menší než čas do");
  }

  const { error } = await updateZasah(supabase, id, input);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}

/**
 * Soft-delete zásahu.
 */
export async function deleteZasahAction(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await softDeleteZasah(supabase, id);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}
