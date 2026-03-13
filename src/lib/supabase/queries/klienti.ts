import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

export async function getKlienti(supabase: TypedSupabase) {
  return supabase
    .from("klienti")
    .select("*")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

export async function getKlient(supabase: TypedSupabase, id: string) {
  return supabase
    .from("klienti")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

export async function softDeleteKlient(supabase: TypedSupabase, id: string) {
  return supabase
    .from("klienti")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .eq("id", id);
}

/**
 * Vyhledávání klientů dle textu (jméno, název, telefon, IČO).
 * Pro rychlý dispečink — typeahead search.
 */
export async function searchKlienti(supabase: TypedSupabase, query: string) {
  const q = `%${query}%`;
  return supabase
    .from("klienti")
    .select("id, nazev, jmeno, prijmeni, typ, telefon, email, adresa, ico")
    .is("deleted_at", null)
    .or(`nazev.ilike.${q},jmeno.ilike.${q},prijmeni.ilike.${q},telefon.ilike.${q},ico.ilike.${q}`)
    .order("nazev", { ascending: true })
    .limit(10);
}
