import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get all položky for a zakázka, ordered by poradi.
 */
export async function getPolozkyForZakazka(
  supabase: TypedSupabase,
  zakazkaId: string,
) {
  return supabase
    .from("zakazka_polozky")
    .select("*")
    .eq("zakazka_id", zakazkaId)
    .is("deleted_at", null)
    .order("poradi", { ascending: true });
}

/**
 * Replace all položky for a zakázka:
 * 1. Soft-delete existing
 * 2. Insert new
 */
export async function replacePolozky(
  supabase: TypedSupabase,
  zakazkaId: string,
  polozky: {
    nazev: string;
    pocet: number;
    cena_za_kus: number;
    cena_celkem: number;
    poradi: number;
  }[],
) {
  // Soft-delete existing
  await supabase
    .from("zakazka_polozky")
    .update({ deleted_at: new Date().toISOString() })
    .eq("zakazka_id", zakazkaId)
    .is("deleted_at", null);

  // Insert new
  if (polozky.length === 0) return { data: [], error: null };

  return supabase
    .from("zakazka_polozky")
    .insert(
      polozky.map((p) => ({
        zakazka_id: zakazkaId,
        nazev: p.nazev,
        pocet: p.pocet,
        cena_za_kus: p.cena_za_kus,
        cena_celkem: p.cena_celkem,
        poradi: p.poradi,
      })),
    )
    .select();
}
