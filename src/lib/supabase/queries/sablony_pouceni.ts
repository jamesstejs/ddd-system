import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Načte všechny šablony poučení s joinem na škůdce (nazev).
 */
export async function getSablonyPouceni(supabase: TypedSupabase) {
  return supabase
    .from("sablony_pouceni")
    .select("*, skudci(nazev)")
    .is("deleted_at", null)
    .order("nazev", { ascending: true });
}

/**
 * Načte jednu šablonu poučení dle ID.
 */
export async function getSablonaPouceni(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("sablony_pouceni")
    .select("*, skudci(nazev)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Vytvoří novou šablonu poučení.
 */
export async function createSablonaPouceni(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["sablony_pouceni"]["Insert"],
) {
  return supabase.from("sablony_pouceni").insert(data).select().single();
}

/**
 * Aktualizuje šablonu poučení.
 */
export async function updateSablonaPouceni(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["sablony_pouceni"]["Update"],
) {
  return supabase
    .from("sablony_pouceni")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete šablony poučení.
 */
export async function deleteSablonaPouceni(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("sablony_pouceni")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

/**
 * Načte relevantní šablony poučení pro dané škůdce a typy zásahů.
 * Hledá: 1) přesné shody (skudce + typ), 2) obecné dle typu, 3) obecné celkové.
 */
export async function getPouceniForZasah(
  supabase: TypedSupabase,
  skudciNames: string[],
  typyZasahu: string[],
) {
  const mappedTypes = mapTypyZasahuToSablona(typyZasahu);

  const { data, error } = await supabase
    .from("sablony_pouceni")
    .select("*, skudci(id, nazev)")
    .eq("aktivni", true)
    .is("deleted_at", null)
    .order("nazev", { ascending: true });

  if (error || !data) return { data: [], error };

  const relevant = data.filter((s) => {
    const skudceNazev = (s.skudci as { id: string; nazev: string } | null)
      ?.nazev;

    if (skudceNazev && s.typ_zasahu) {
      return (
        skudciNames.includes(skudceNazev) &&
        mappedTypes.includes(s.typ_zasahu)
      );
    }
    if (skudceNazev && !s.typ_zasahu) {
      return skudciNames.includes(skudceNazev);
    }
    if (!skudceNazev && s.typ_zasahu && s.typ_zasahu !== "obecne") {
      return mappedTypes.includes(s.typ_zasahu);
    }
    if (!skudceNazev && s.typ_zasahu === "obecne") {
      return true;
    }
    return false;
  });

  return { data: relevant, error: null };
}

/**
 * Mapuje typy zásahu ze zakázky na typy v šablonách poučení.
 */
export function mapTypyZasahuToSablona(typyZasahu: string[]): string[] {
  const mapped = new Set<string>();
  for (const typ of typyZasahu) {
    const lower = typ.toLowerCase();
    if (lower.includes("deratizace")) mapped.add("deratizace");
    if (lower.includes("dezinsekce")) mapped.add("dezinsekce");
    if (lower.includes("postřik") || lower.includes("postrik"))
      mapped.add("postrik");
    if (lower.includes("dezinfekce")) mapped.add("dezinfekce");
  }
  return Array.from(mapped);
}
