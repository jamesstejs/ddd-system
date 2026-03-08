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
    .eq("id", id);
}
