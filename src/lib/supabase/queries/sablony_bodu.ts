import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

export async function getSablonyBodu(supabase: TypedSupabase) {
  return supabase
    .from("sablony_bodu")
    .select("*")
    .is("deleted_at", null)
    .order("typ_objektu", { ascending: true })
    .order("typ_zasahu", { ascending: true })
    .order("rozsah_m2_od", { ascending: true });
}

export async function getSablonyBoduByTyp(
  supabase: TypedSupabase,
  typ_objektu: Database["public"]["Enums"]["typ_objektu"],
  typ_zasahu: Database["public"]["Enums"]["typ_zasahu_kalkulacka"],
) {
  return supabase
    .from("sablony_bodu")
    .select("*")
    .eq("typ_objektu", typ_objektu)
    .eq("typ_zasahu", typ_zasahu)
    .is("deleted_at", null)
    .order("rozsah_m2_od", { ascending: true });
}

export async function createSablonaBodu(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["sablony_bodu"]["Insert"],
) {
  return supabase.from("sablony_bodu").insert(data).select().single();
}

export async function updateSablonaBodu(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["sablony_bodu"]["Update"],
) {
  return supabase
    .from("sablony_bodu")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteSablonaBodu(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("sablony_bodu")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}
