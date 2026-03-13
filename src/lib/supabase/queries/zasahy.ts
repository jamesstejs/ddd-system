import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get all zasahy in a date range, with joined zakazka → objekt → klient + technik profile.
 * Used for admin calendar view.
 */
export async function getZasahy(
  supabase: TypedSupabase,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      *,
      profiles!zasahy_technik_id_fkey (
        id,
        jmeno,
        prijmeni,
        email,
        koeficient_rychlosti
      ),
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        status,
        typy_zasahu,
        skudci,
        poznamka,
        objekty!inner (
          id,
          nazev,
          adresa,
          plocha_m2,
          typ_objektu,
          klient_id,
          lat,
          lng,
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
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

/**
 * Get zasahy for a specific technik in a date range.
 * Used for technik "Můj den" view.
 */
export async function getZasahyForTechnik(
  supabase: TypedSupabase,
  technikId: string,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      *,
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        status,
        typy_zasahu,
        skudci,
        cetnost_dny,
        platba_predem,
        objekty!inner (
          id,
          nazev,
          adresa,
          plocha_m2,
          typ_objektu,
          klient_id,
          lat,
          lng,
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
    .eq("technik_id", technikId)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

/**
 * Get a single zasah by ID with full joined data.
 */
export async function getZasah(supabase: TypedSupabase, id: string) {
  return supabase
    .from("zasahy")
    .select(
      `
      *,
      profiles!zasahy_technik_id_fkey (
        id,
        jmeno,
        prijmeni,
        email,
        koeficient_rychlosti
      ),
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        status,
        typy_zasahu,
        skudci,
        poznamka,
        objekty!inner (
          id,
          nazev,
          adresa,
          plocha_m2,
          typ_objektu,
          klient_id,
          lat,
          lng,
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
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Create a new zasah.
 */
export async function createZasah(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["zasahy"]["Insert"],
) {
  return supabase.from("zasahy").insert(data).select().single();
}

/**
 * Update an existing zasah.
 */
export async function updateZasah(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["zasahy"]["Update"],
) {
  return supabase
    .from("zasahy")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete a zasah.
 */
export async function softDeleteZasah(supabase: TypedSupabase, id: string) {
  return supabase
    .from("zasahy")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

/**
 * Get technici (profiles with role 'technik') for selection in admin forms.
 */
export async function getTechnici(supabase: TypedSupabase) {
  return supabase
    .from("profiles")
    .select("id, jmeno, prijmeni, email, koeficient_rychlosti, role")
    .contains("role", ["technik"])
    .is("deleted_at", null)
    .order("prijmeni", { ascending: true });
}

/**
 * Get overdue zasahy — past date, not completed (status != hotovo, zruseno).
 * Used for admin dashboard "Věci ve zpoždění" widget.
 */
/**
 * Get all zasahy for a specific date (all technicians).
 * Used for capacity calculation in dispatcher view.
 */
export async function getZasahyForDate(
  supabase: TypedSupabase,
  datum: string,
) {
  return supabase
    .from("zasahy")
    .select("id, technik_id, cas_od, cas_do, status")
    .eq("datum", datum)
    .is("deleted_at", null)
    .not("status", "eq", "zruseno")
    .order("cas_od", { ascending: true });
}

export async function getOverdueZasahy(
  supabase: TypedSupabase,
  beforeDate: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      id, datum, cas_od, status,
      profiles!zasahy_technik_id_fkey ( jmeno, prijmeni ),
      zakazky!zasahy_zakazka_id_fkey (
        objekty (
          nazev,
          klienti ( nazev, jmeno, prijmeni, typ )
        )
      )
    `,
    )
    .lt("datum", beforeDate)
    .not("status", "in", '("hotovo","zruseno")')
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .limit(20);
}
