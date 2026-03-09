import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

export async function getOkruhy(supabase: TypedSupabase, objektId: string) {
  return supabase
    .from("okruhy")
    .select("*")
    .eq("objekt_id", objektId)
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

export async function softDeleteOkruh(supabase: TypedSupabase, id: string) {
  return supabase
    .from("okruhy")
    .update({ deleted_at: new Date().toISOString() })
    .is("deleted_at", null)
    .eq("id", id);
}
