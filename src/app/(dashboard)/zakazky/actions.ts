"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  createZakazka,
  updateZakazka,
  softDeleteZakazka,
} from "@/lib/supabase/queries/zakazky";

type ZakazkaInsert = Database["public"]["Tables"]["zakazky"]["Insert"];

const REVALIDATE_PATH = "/zakazky";

export async function createZakazkaAction(
  data: Omit<ZakazkaInsert, "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();

  const { error } = await createZakazka(supabase, data);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function updateZakazkaAction(
  id: string,
  data: Partial<
    Omit<ZakazkaInsert, "id" | "created_at" | "updated_at" | "deleted_at">
  >,
) {
  const { supabase } = await requireAdmin();

  const { error } = await updateZakazka(supabase, id, data);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath(`${REVALIDATE_PATH}/${id}`);
}

export async function deleteZakazkaAction(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await softDeleteZakazka(supabase, id);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
}

/**
 * Fetch objekty for a given klient (used in create form).
 */
export async function getObjektyForKlientAction(klientId: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("objekty")
    .select("id, nazev, adresa, plocha_m2, typ_objektu")
    .eq("klient_id", klientId)
    .is("deleted_at", null)
    .order("nazev", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch all škůdci (used in create form).
 */
export async function getSkudciAction() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("skudci")
    .select("id, nazev, typ, doporucena_cetnost_dny, pocet_zasahu")
    .is("deleted_at", null)
    .order("typ", { ascending: true })
    .order("nazev", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch šablony bodů for auto-recommendation.
 */
export async function getSablonyBoduAction(
  typObjektu: Database["public"]["Enums"]["typ_objektu"],
  typZasahu: Database["public"]["Enums"]["typ_zasahu_kalkulacka"],
) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("sablony_bodu")
    .select("*")
    .eq("typ_objektu", typObjektu)
    .eq("typ_zasahu", typZasahu)
    .is("deleted_at", null)
    .order("rozsah_m2_od", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
