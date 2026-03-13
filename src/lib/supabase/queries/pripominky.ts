import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Create a new pripominka (reminder for next appointment scheduling).
 */
export async function createPripominka(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["pripominky_terminu"]["Insert"],
) {
  return supabase.from("pripominky_terminu").insert(data).select().single();
}

/**
 * Get all active pripominky for admin dashboard.
 * Joins zasah → zakazka → objekt → klient + technik profile.
 */
export async function getAktivniPripominky(supabase: TypedSupabase) {
  return supabase
    .from("pripominky_terminu")
    .select(
      `
      *,
      profiles!pripominky_terminu_technik_id_fkey (
        id,
        jmeno,
        prijmeni
      ),
      zasahy!pripominky_terminu_zasah_id_fkey (
        id,
        datum,
        cas_od,
        cas_do
      ),
      zakazky!pripominky_terminu_zakazka_id_fkey (
        id,
        typ,
        objekty!inner (
          id,
          nazev,
          adresa,
          klienti!inner (
            id,
            nazev,
            jmeno,
            prijmeni,
            typ
          )
        )
      )
    `,
    )
    .eq("stav", "aktivni")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Get active pripominky for a specific technik.
 * Used in technik dashboard "Klienti k domluvení" widget.
 */
export async function getAktivniPripominkyTechnik(
  supabase: TypedSupabase,
  technikId: string,
) {
  return supabase
    .from("pripominky_terminu")
    .select(
      `
      *,
      zasahy!pripominky_terminu_zasah_id_fkey (
        id,
        datum,
        cas_od,
        cas_do
      ),
      zakazky!pripominky_terminu_zakazka_id_fkey (
        id,
        typ,
        objekty!inner (
          id,
          nazev,
          adresa,
          klienti!inner (
            id,
            nazev,
            jmeno,
            prijmeni,
            typ
          )
        )
      )
    `,
    )
    .eq("technik_id", technikId)
    .eq("stav", "aktivni")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Get active pripominky with technik pobočka + klient telefon for region filtering.
 * Used for admin "Přehled zásahů" page — K domluvení tab.
 */
export async function getAktivniPripominkyWithRegion(supabase: TypedSupabase) {
  return supabase
    .from("pripominky_terminu")
    .select(
      `
      *,
      profiles!pripominky_terminu_technik_id_fkey (
        id,
        jmeno,
        prijmeni,
        pobocka
      ),
      zasahy!pripominky_terminu_zasah_id_fkey (
        id,
        datum,
        cas_od,
        cas_do
      ),
      zakazky!pripominky_terminu_zakazka_id_fkey (
        id,
        typ,
        objekty!inner (
          id,
          nazev,
          adresa,
          klienti!inner (
            id,
            nazev,
            jmeno,
            prijmeni,
            typ,
            telefon,
            email
          )
        )
      )
    `,
    )
    .eq("stav", "aktivni")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Update a pripominka (e.g. stav → vyreseno).
 */
export async function updatePripominka(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["pripominky_terminu"]["Update"],
) {
  return supabase
    .from("pripominky_terminu")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}
