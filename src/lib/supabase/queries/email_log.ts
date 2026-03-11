import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Vytvoří záznam v email_log.
 */
export async function createEmailLog(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["email_log"]["Insert"],
) {
  return supabase.from("email_log").insert(data).select().single();
}

/**
 * Načte email logy pro konkrétní protokol (nejnovější první).
 */
export async function getEmailLogByProtokol(
  supabase: TypedSupabase,
  protokolId: string,
) {
  return supabase
    .from("email_log")
    .select("*")
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Načte email logy pro konkrétní zásah (nejnovější první).
 */
export async function getEmailLogByZasah(
  supabase: TypedSupabase,
  zasahId: string,
) {
  return supabase
    .from("email_log")
    .select("*")
    .eq("zasah_id", zasahId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Aktualizuje stav email logu.
 */
export async function updateEmailLog(
  supabase: TypedSupabase,
  id: string,
  updates: Database["public"]["Tables"]["email_log"]["Update"],
) {
  return supabase
    .from("email_log")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null);
}
