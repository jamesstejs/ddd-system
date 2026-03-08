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

export async function softDeleteKontaktniOsoba(
  supabase: TypedSupabase,
  id: string
) {
  return supabase
    .from("kontaktni_osoby")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}
