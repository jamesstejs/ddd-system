import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Načte všechny šablony poučení s joinem na škůdce (nazev).
 */
export async function getSablonyPouceni(supabase: TypedSupabase) {
  return supabase
    .from("sablony_pouceni")
    .select("*, skudci(nazev)")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

/**
 * Načte jednu šablonu poučení dle ID.
 */
export async function getSablonaPouceni(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("sablony_pouceni")
    .select("*, skudci(nazev)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Vytvoří novou šablonu poučení.
 */
export async function createSablonaPouceni(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["sablony_pouceni"]["Insert"],
) {
  return supabase.from("sablony_pouceni").insert(data).select().single();
}

/**
 * Aktualizuje šablonu poučení.
 */
export async function updateSablonaPouceni(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["sablony_pouceni"]["Update"],
) {
  return supabase
    .from("sablony_pouceni")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete šablony poučení.
 */
export async function deleteSablonaPouceni(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("sablony_pouceni")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}
