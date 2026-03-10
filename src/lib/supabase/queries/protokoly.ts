import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

// ============================================================
// Protokoly — hlavní tabulka
// ============================================================

/**
 * Načte všechny protokoly (seřazené od nejnovějšího).
 * Join: zasah → zakazka → objekt → klient + technik profil.
 */
export async function getProtokoly(supabase: TypedSupabase) {
  return supabase
    .from("protokoly")
    .select(`
      *,
      profiles!protokoly_technik_id_fkey (
        id, jmeno, prijmeni
      ),
      zasahy!protokoly_zasah_id_fkey (
        id, datum, cas_od, cas_do, status,
        zakazky (
          id, typ, typy_zasahu,
          objekty (
            id, nazev, adresa,
            klienti (
              id, nazev, jmeno, prijmeni, kod
            )
          )
        )
      )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Načte protokoly dle statusu (ke_schvaleni, schvaleny, ...).
 */
export async function getProtokolyByStatus(
  supabase: TypedSupabase,
  status: Database["public"]["Enums"]["status_protokolu"],
) {
  return supabase
    .from("protokoly")
    .select(`
      *,
      profiles!protokoly_technik_id_fkey (
        id, jmeno, prijmeni
      ),
      zasahy!protokoly_zasah_id_fkey (
        id, datum, cas_od, cas_do,
        zakazky (
          id, typ, typy_zasahu,
          objekty (
            id, nazev, adresa,
            klienti (
              id, nazev, jmeno, prijmeni, kod
            )
          )
        )
      )
    `)
    .eq("status", status)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Načte protokol pro daný zásah (1 zásah = max 1 protokol).
 */
export async function getProtokolByZasah(
  supabase: TypedSupabase,
  zasahId: string,
) {
  return supabase
    .from("protokoly")
    .select("*")
    .eq("zasah_id", zasahId)
    .is("deleted_at", null)
    .single();
}

/**
 * Načte jeden protokol s plným detail (single).
 */
export async function getProtokol(supabase: TypedSupabase, id: string) {
  return supabase
    .from("protokoly")
    .select(`
      *,
      profiles!protokoly_technik_id_fkey (
        id, jmeno, prijmeni
      ),
      zasahy!protokoly_zasah_id_fkey (
        id, datum, cas_od, cas_do, status,
        zakazky (
          id, typ, typy_zasahu, skudci,
          objekty (
            id, nazev, adresa, typ_objektu, plocha_m2,
            klienti (
              id, nazev, jmeno, prijmeni, kod, email, telefon
            )
          )
        )
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Vytvoří nový protokol.
 */
export async function createProtokol(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["protokoly"]["Insert"],
) {
  return supabase.from("protokoly").insert(data).select().single();
}

/**
 * Aktualizuje protokol (status, komentář, poznámka...).
 */
export async function updateProtokol(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["protokoly"]["Update"],
) {
  return supabase
    .from("protokoly")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete protokolu.
 */
export async function deleteProtokol(supabase: TypedSupabase, id: string) {
  return supabase
    .from("protokoly")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

// ============================================================
// Deratizační body
// ============================================================

/**
 * Načte deratizační body pro protokol.
 */
export async function getProtokolDeratBody(
  supabase: TypedSupabase,
  protokolId: string,
) {
  return supabase
    .from("protokol_deratizacni_body")
    .select(`
      *,
      pripravky (id, nazev, ucinna_latka, protilatka),
      okruhy (id, nazev)
    `)
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .order("cislo_bodu", { ascending: true });
}

/**
 * Vytvoří deratizační bod.
 */
export async function createProtokolDeratBod(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["protokol_deratizacni_body"]["Insert"],
) {
  return supabase
    .from("protokol_deratizacni_body")
    .insert(data)
    .select()
    .single();
}

/**
 * Aktualizuje deratizační bod.
 */
export async function updateProtokolDeratBod(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["protokol_deratizacni_body"]["Update"],
) {
  return supabase
    .from("protokol_deratizacni_body")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete deratizačního bodu.
 */
export async function deleteProtokolDeratBod(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("protokol_deratizacni_body")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

// ============================================================
// Dezinsekční body
// ============================================================

/**
 * Načte dezinsekční body pro protokol.
 */
export async function getProtokolDezinsBody(
  supabase: TypedSupabase,
  protokolId: string,
) {
  return supabase
    .from("protokol_dezinsekci_body")
    .select(`
      *,
      okruhy (id, nazev)
    `)
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .order("cislo_bodu", { ascending: true });
}

/**
 * Vytvoří dezinsekční bod.
 */
export async function createProtokolDezinsBod(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["protokol_dezinsekci_body"]["Insert"],
) {
  return supabase
    .from("protokol_dezinsekci_body")
    .insert(data)
    .select()
    .single();
}

/**
 * Aktualizuje dezinsekční bod.
 */
export async function updateProtokolDezinsBod(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["protokol_dezinsekci_body"]["Update"],
) {
  return supabase
    .from("protokol_dezinsekci_body")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete dezinsekčního bodu.
 */
export async function deleteProtokolDezinsBod(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("protokol_dezinsekci_body")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

// ============================================================
// Postřik
// ============================================================

/**
 * Načte postřik pro protokol (včetně přípravků).
 */
export async function getProtokolPostrik(
  supabase: TypedSupabase,
  protokolId: string,
) {
  return supabase
    .from("protokol_postrik")
    .select(`
      *,
      protokol_postrik_pripravky (
        id, spotreba, koncentrace_procent,
        pripravky (id, nazev, ucinna_latka, protilatka)
      )
    `)
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

/**
 * Vytvoří záznam postřiku.
 */
export async function createProtokolPostrik(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["protokol_postrik"]["Insert"],
) {
  return supabase
    .from("protokol_postrik")
    .insert(data)
    .select()
    .single();
}

/**
 * Vytvoří přípravek k postřiku.
 */
export async function createProtokolPostrikPripravek(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["protokol_postrik_pripravky"]["Insert"],
) {
  return supabase
    .from("protokol_postrik_pripravky")
    .insert(data)
    .select()
    .single();
}

// ============================================================
// Fotky
// ============================================================

/**
 * Načte fotky pro protokol.
 */
export async function getProtokolFotky(
  supabase: TypedSupabase,
  protokolId: string,
) {
  return supabase
    .from("protokol_fotky")
    .select("*")
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

/**
 * Vytvoří záznam fotky.
 */
export async function createProtokolFotka(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["protokol_fotky"]["Insert"],
) {
  return supabase
    .from("protokol_fotky")
    .insert(data)
    .select()
    .single();
}

/**
 * Soft-delete fotky.
 */
export async function deleteProtokolFotka(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("protokol_fotky")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}
