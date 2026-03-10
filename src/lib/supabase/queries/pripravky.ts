import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Načte všechny aktivní přípravky (seřazené dle typu a názvu).
 */
export async function getPripravky(supabase: TypedSupabase) {
  return supabase
    .from("pripravky")
    .select("*")
    .is("deleted_at", null)
    .order("typ", { ascending: true })
    .order("nazev", { ascending: true });
}

/**
 * Načte pouze aktivní přípravky (aktivni=true) — pro technika při výběru v protokolu.
 */
export async function getAktivniPripravky(supabase: TypedSupabase) {
  return supabase
    .from("pripravky")
    .select("*")
    .eq("aktivni", true)
    .is("deleted_at", null)
    .order("typ", { ascending: true })
    .order("nazev", { ascending: true });
}

/**
 * Načte jeden přípravek dle ID.
 */
export async function getPripravek(supabase: TypedSupabase, id: string) {
  return supabase
    .from("pripravky")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Vytvoří nový přípravek.
 */
export async function createPripravek(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["pripravky"]["Insert"],
) {
  return supabase.from("pripravky").insert(data).select().single();
}

/**
 * Aktualizuje přípravek.
 */
export async function updatePripravek(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["pripravky"]["Update"],
) {
  return supabase
    .from("pripravky")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete přípravku.
 */
export async function deletePripravek(supabase: TypedSupabase, id: string) {
  return supabase
    .from("pripravky")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}
