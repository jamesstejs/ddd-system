import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

export async function getSkudci(supabase: TypedSupabase) {
  return supabase
    .from("skudci")
    .select("*")
    .is("deleted_at", null)
    .order("typ", { ascending: true })
    .order("nazev", { ascending: true });
}

export async function getSkudce(supabase: TypedSupabase, id: string) {
  return supabase
    .from("skudci")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}
