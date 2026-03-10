import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Načte bezpečnostní listy pro konkrétní přípravek.
 */
export async function getBezpecnostniListy(
  supabase: TypedSupabase,
  pripravekId: string,
) {
  return supabase
    .from("bezpecnostni_listy")
    .select("*")
    .eq("pripravek_id", pripravekId)
    .is("deleted_at", null)
    .order("nahrano_datum", { ascending: false });
}

/**
 * Načte všechny bezpečnostní listy (pro batch loading na /pripravky).
 */
export async function getAllBezpecnostniListy(supabase: TypedSupabase) {
  return supabase
    .from("bezpecnostni_listy")
    .select("*")
    .is("deleted_at", null)
    .order("nahrano_datum", { ascending: false });
}

/**
 * Vytvoří záznam bezpečnostního listu v DB.
 */
export async function createBezpecnostniList(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["bezpecnostni_listy"]["Insert"],
) {
  return supabase.from("bezpecnostni_listy").insert(data).select().single();
}

/**
 * Soft-delete bezpečnostního listu.
 */
export async function deleteBezpecnostniList(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("bezpecnostni_listy")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}
