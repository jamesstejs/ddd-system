/**
 * Statistiky queries — data for charts and reports.
 * Sprint 34: Statistiky + grafy
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get deratizacni body history for an objekt — for infestation trend chart.
 * Returns aggregated pozer data per protokol (date).
 */
export async function getPozerHistoryForObjekt(
  supabase: TypedSupabase,
  objektId: string,
) {
  return supabase
    .from("protokol_deratizacni_body")
    .select(
      `
      pozer_procent,
      protokoly!inner (
        id,
        created_at,
        zasahy!protokoly_zasah_id_fkey!inner (
          datum,
          zakazky!zasahy_zakazka_id_fkey!inner (
            objekt_id
          )
        )
      )
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: true, referencedTable: "protokoly" });
}

/**
 * Get zasahy count per technik per month — for productivity chart.
 */
export async function getZasahyCountByTechnik(
  supabase: TypedSupabase,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      id,
      datum,
      technik_id,
      status,
      profiles!zasahy_technik_id_fkey (
        jmeno,
        prijmeni
      )
    `,
    )
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .eq("status", "hotovo")
    .is("deleted_at", null)
    .order("datum", { ascending: true });
}

/**
 * Get faktury (revenue) per month — for revenue chart.
 */
export async function getFakturyByMonth(
  supabase: TypedSupabase,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("faktury")
    .select("id, castka_bez_dph, castka_s_dph, datum_vystaveni, stav")
    .gte("datum_vystaveni", datumOd)
    .lte("datum_vystaveni", datumDo)
    .is("deleted_at", null)
    .order("datum_vystaveni", { ascending: true });
}

/**
 * Get all objekty for a klient (for dropdown selection in stats).
 */
export async function getObjektyForStats(
  supabase: TypedSupabase,
) {
  return supabase
    .from("objekty")
    .select("id, nazev, adresa, klient_id, klienti!inner(nazev, jmeno, prijmeni, typ)")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

/**
 * Export data as arrays for CSV generation.
 */
export async function getKlientiForExport(supabase: TypedSupabase) {
  return supabase
    .from("klienti")
    .select("id, nazev, jmeno, prijmeni, typ, ico, dic, email, telefon, adresa, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

export async function getZakazkyForExport(supabase: TypedSupabase) {
  return supabase
    .from("zakazky")
    .select(`
      id, typ, status, typy_zasahu, cetnost_dny, cena_zaklad, cena_po_sleve, cena_s_dph, created_at,
      objekty!inner(nazev, klienti!inner(nazev, jmeno, prijmeni, typ))
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

export async function getFakturyForExport(supabase: TypedSupabase) {
  return supabase
    .from("faktury")
    .select("id, cislo, castka_bez_dph, castka_s_dph, dph_sazba, stav, datum_vystaveni, datum_splatnosti, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
}

export async function getZasahyForExport(supabase: TypedSupabase) {
  return supabase
    .from("zasahy")
    .select(`
      id, datum, cas_od, cas_do, status, created_at,
      profiles!zasahy_technik_id_fkey(jmeno, prijmeni),
      zakazky!zasahy_zakazka_id_fkey(
        typ, typy_zasahu,
        objekty!inner(nazev, adresa, klienti!inner(nazev, jmeno, prijmeni, typ))
      )
    `)
    .is("deleted_at", null)
    .order("datum", { ascending: true });
}
