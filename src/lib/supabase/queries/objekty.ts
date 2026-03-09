import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

export async function getObjekty(supabase: TypedSupabase, klientId: string) {
  return supabase
    .from("objekty")
    .select("*")
    .eq("klient_id", klientId)
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

export async function getObjekt(supabase: TypedSupabase, id: string) {
  return supabase
    .from("objekty")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

export async function softDeleteObjekt(supabase: TypedSupabase, id: string) {
  return supabase
    .from("objekty")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .eq("id", id);
}
