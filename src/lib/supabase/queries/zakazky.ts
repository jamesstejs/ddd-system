import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get all zakázky with joined objekt + klient data.
 * Optionally filter by status.
 */
export async function getZakazky(
  supabase: TypedSupabase,
  filters?: {
    status?: Database["public"]["Enums"]["status_zakazky"];
  },
) {
  let query = supabase
    .from("zakazky")
    .select(
      `
      *,
      objekty!inner (
        id,
        nazev,
        adresa,
        plocha_m2,
        typ_objektu,
        klient_id,
        klienti!inner (
          id,
          nazev,
          jmeno,
          prijmeni,
          typ,
          ico
        )
      )
    `,
    )
    .is("deleted_at", null);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  return query.order("created_at", { ascending: false });
}

/**
 * Get a single zakázka by ID with related objekt + klient.
 */
export async function getZakazka(supabase: TypedSupabase, id: string) {
  return supabase
    .from("zakazky")
    .select(
      `
      *,
      objekty!inner (
        id,
        nazev,
        adresa,
        plocha_m2,
        typ_objektu,
        klient_id,
        klienti!inner (
          id,
          nazev,
          jmeno,
          prijmeni,
          typ,
          ico,
          email,
          telefon,
          adresa,
          dph_sazba,
          individualni_sleva_procent,
          platba_predem
        )
      )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Create a new zakázka.
 */
export async function createZakazka(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["zakazky"]["Insert"],
) {
  return supabase.from("zakazky").insert(data).select().single();
}

/**
 * Update an existing zakázka.
 */
export async function updateZakazka(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["zakazky"]["Update"],
) {
  return supabase.from("zakazky").update(data).eq("id", id).is("deleted_at", null).select().single();
}

/**
 * Soft-delete a zakázka.
 */
export async function softDeleteZakazka(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("zakazky")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}
