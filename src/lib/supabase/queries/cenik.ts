import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

// =====================================================
// cenik_obecne — general pricing
// =====================================================

export async function getCenikObecne(supabase: TypedSupabase) {
  return supabase
    .from("cenik_obecne")
    .select("*")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

export async function updateCenikObecne(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["cenik_obecne"]["Update"],
) {
  return supabase
    .from("cenik_obecne")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

// =====================================================
// cenik_postriky — postřiky domácnosti
// =====================================================

export async function getCenikPostriky(supabase: TypedSupabase) {
  return supabase
    .from("cenik_postriky")
    .select("*")
    .is("deleted_at", null)
    .order("kategorie", { ascending: true })
    .order("plocha_od", { ascending: true });
}

export async function createCenikPostriky(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["cenik_postriky"]["Insert"],
) {
  return supabase.from("cenik_postriky").insert(data).select().single();
}

export async function updateCenikPostriky(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["cenik_postriky"]["Update"],
) {
  return supabase
    .from("cenik_postriky")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCenikPostriky(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("cenik_postriky")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

// =====================================================
// cenik_gely — gelové nástrahy domácnosti
// =====================================================

export async function getCenikGely(supabase: TypedSupabase) {
  return supabase
    .from("cenik_gely")
    .select("*")
    .is("deleted_at", null)
    .order("kategorie", { ascending: true })
    .order("bytu_od", { ascending: true });
}

export async function createCenikGely(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["cenik_gely"]["Insert"],
) {
  return supabase.from("cenik_gely").insert(data).select().single();
}

export async function updateCenikGely(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["cenik_gely"]["Update"],
) {
  return supabase
    .from("cenik_gely")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCenikGely(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("cenik_gely")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

// =====================================================
// cenik_specialni — speciální zásahy
// =====================================================

export async function getCenikSpecialni(supabase: TypedSupabase) {
  return supabase
    .from("cenik_specialni")
    .select("*")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

export async function createCenikSpecialni(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["cenik_specialni"]["Insert"],
) {
  return supabase.from("cenik_specialni").insert(data).select().single();
}

export async function updateCenikSpecialni(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["cenik_specialni"]["Update"],
) {
  return supabase
    .from("cenik_specialni")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCenikSpecialni(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("cenik_specialni")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

// =====================================================
// cenik_deratizace — smluvní monitoring
// =====================================================

export async function getCenikDeratizace(supabase: TypedSupabase) {
  return supabase
    .from("cenik_deratizace")
    .select("*")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

export async function createCenikDeratizace(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["cenik_deratizace"]["Insert"],
) {
  return supabase.from("cenik_deratizace").insert(data).select().single();
}

export async function updateCenikDeratizace(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["cenik_deratizace"]["Update"],
) {
  return supabase
    .from("cenik_deratizace")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCenikDeratizace(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("cenik_deratizace")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

// =====================================================
// cenik_dezinfekce — dezinfekce dle plochy
// =====================================================

export async function getCenikDezinfekce(supabase: TypedSupabase) {
  return supabase
    .from("cenik_dezinfekce")
    .select("*")
    .is("deleted_at", null)
    .order("typ", { ascending: true })
    .order("plocha_od", { ascending: true });
}

export async function createCenikDezinfekce(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["cenik_dezinfekce"]["Insert"],
) {
  return supabase.from("cenik_dezinfekce").insert(data).select().single();
}

export async function updateCenikDezinfekce(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["cenik_dezinfekce"]["Update"],
) {
  return supabase
    .from("cenik_dezinfekce")
    .update(data)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteCenikDezinfekce(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("cenik_dezinfekce")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}
