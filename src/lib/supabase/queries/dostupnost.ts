import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Vrátí dostupnost technika v daném rozsahu datumů.
 */
export async function getDostupnostForTechnik(
  supabase: TypedSupabase,
  technikId: string,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("dostupnost")
    .select("*")
    .eq("technik_id", technikId)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

/**
 * Vrátí dostupnost technika pro konkrétní den.
 */
export async function getDostupnostForDatum(
  supabase: TypedSupabase,
  technikId: string,
  datum: string,
) {
  return supabase
    .from("dostupnost")
    .select("*")
    .eq("technik_id", technikId)
    .eq("datum", datum)
    .is("deleted_at", null)
    .order("cas_od", { ascending: true });
}

/**
 * Vrátí dostupnost všech techniků v rozsahu (pro admin).
 */
export async function getAllDostupnost(
  supabase: TypedSupabase,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("dostupnost")
    .select("*, profiles!dostupnost_technik_id_fkey(jmeno, prijmeni)")
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

/**
 * Vytvoří nový záznam dostupnosti.
 */
export async function createDostupnost(
  supabase: TypedSupabase,
  data: {
    technik_id: string;
    datum: string;
    cas_od: string;
    cas_do: string;
    poznamka?: string | null;
  },
) {
  return supabase.from("dostupnost").insert(data).select().single();
}

/**
 * Aktualizuje existující záznam dostupnosti.
 */
export async function updateDostupnost(
  supabase: TypedSupabase,
  id: string,
  data: {
    cas_od?: string;
    cas_do?: string;
    poznamka?: string | null;
  },
) {
  return supabase
    .from("dostupnost")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete záznamu dostupnosti.
 */
export async function softDeleteDostupnost(
  supabase: TypedSupabase,
  id: string,
) {
  return supabase
    .from("dostupnost")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

/**
 * Vrátí techniky, kteří NEMAJÍ žádnou dostupnost v daném rozsahu.
 * Pro admin widget "Technici bez směn".
 */
export async function getTechniciWithoutDostupnost(
  supabase: TypedSupabase,
  datumOd: string,
  datumDo: string,
) {
  // Nejdřív zjistíme kteří technici MAJÍ dostupnost
  const { data: dostupnost } = await supabase
    .from("dostupnost")
    .select("technik_id")
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null);

  const technikIdsWithDostupnost = [
    ...new Set((dostupnost ?? []).map((d) => d.technik_id)),
  ];

  // Získáme všechny techniky
  let query = supabase
    .from("profiles")
    .select("id, jmeno, prijmeni, email")
    .contains("role", ["technik"])
    .is("deleted_at", null)
    .order("prijmeni", { ascending: true });

  // Odfiltrujeme ty co dostupnost mají
  if (technikIdsWithDostupnost.length > 0) {
    // Supabase nemá "NOT IN" přímo, ale má .not().in()
    query = query.not(
      "id",
      "in",
      `(${technikIdsWithDostupnost.join(",")})`,
    );
  }

  return query;
}

/**
 * Spočítá kolik dní má technik vyplněnou dostupnost v rozsahu.
 * Vrací počet unikátních datumů.
 */
/**
 * Vrátí dostupnost VŠECH techniků pro konkrétní den.
 * Pro kapacitní pohled v rychlém dispečinku.
 */
export async function getAllDostupnostForDate(
  supabase: TypedSupabase,
  datum: string,
) {
  return supabase
    .from("dostupnost")
    .select("*, profiles!dostupnost_technik_id_fkey(id, jmeno, prijmeni)")
    .eq("datum", datum)
    .is("deleted_at", null)
    .order("cas_od", { ascending: true });
}

export async function countDaysWithDostupnost(
  supabase: TypedSupabase,
  technikId: string,
  datumOd: string,
  datumDo: string,
) {
  const { data } = await supabase
    .from("dostupnost")
    .select("datum")
    .eq("technik_id", technikId)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null);

  // Unikátní datumy
  const uniqueDays = new Set((data ?? []).map((d) => d.datum));
  return uniqueDays.size;
}
