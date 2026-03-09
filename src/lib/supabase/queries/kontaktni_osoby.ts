import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

export async function getKontaktniOsoby(
  supabase: TypedSupabase,
  klientId: string
) {
  return supabase
    .from("kontaktni_osoby")
    .select("*")
    .eq("klient_id", klientId)
    .is("deleted_at", null)
    .order("je_primarni", { ascending: false });
}

/**
 * Batch query: get kontaktni osoby for multiple klient IDs at once.
 * Used by technik "Můj den" to avoid N+1 queries.
 */
export async function getKontaktniOsobyByKlientIds(
  supabase: TypedSupabase,
  klientIds: string[]
) {
  return supabase
    .from("kontaktni_osoby")
    .select("*")
    .in("klient_id", klientIds)
    .is("deleted_at", null)
    .order("je_primarni", { ascending: false });
}

export async function softDeleteKontaktniOsoba(
  supabase: TypedSupabase,
  id: string
) {
  return supabase
    .from("kontaktni_osoby")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .eq("id", id);
}
