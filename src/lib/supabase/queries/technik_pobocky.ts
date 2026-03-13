import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get all pobočky for a single technik.
 */
export async function getPobockyForTechnik(
  supabase: TypedSupabase,
  technikId: string,
) {
  return supabase
    .from("technik_pobocky")
    .select("pobocka")
    .eq("technik_id", technikId)
    .is("deleted_at", null)
    .order("pobocka");
}

/**
 * Get pobočky for multiple technici at once.
 * Returns a record keyed by technik_id.
 */
export async function getPobockyForTechnici(
  supabase: TypedSupabase,
  technikIds: string[],
): Promise<Record<string, string[]>> {
  if (technikIds.length === 0) return {};

  const { data, error } = await supabase
    .from("technik_pobocky")
    .select("technik_id, pobocka")
    .in("technik_id", technikIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const result: Record<string, string[]> = {};
  for (const row of data || []) {
    if (!result[row.technik_id]) result[row.technik_id] = [];
    result[row.technik_id].push(row.pobocka);
  }
  return result;
}

/**
 * Get all technici assigned to a given pobočka via junction table.
 * Returns full profile data for each technik.
 */
export async function getTechniciByPobockaMulti(
  supabase: TypedSupabase,
  pobocka: string,
) {
  // First get technik_ids from junction
  const { data: junctionRows, error: jErr } = await supabase
    .from("technik_pobocky")
    .select("technik_id")
    .eq("pobocka", pobocka)
    .is("deleted_at", null);

  if (jErr) throw new Error(jErr.message);
  if (!junctionRows || junctionRows.length === 0) {
    return { data: [], error: null };
  }

  const technikIds = [...new Set(junctionRows.map((r) => r.technik_id))];

  // Then fetch their profiles
  return supabase
    .from("profiles")
    .select(
      "id, jmeno, prijmeni, email, koeficient_rychlosti, role, pobocka, pozadovane_hodiny_tyden, pozadovane_dny_tyden",
    )
    .in("id", technikIds)
    .contains("role", ["technik"])
    .is("deleted_at", null)
    .order("prijmeni", { ascending: true });
}

/**
 * Set pobočky for a technik — replaces all existing assignments.
 * Soft-deletes removed ones, inserts new ones.
 */
export async function setPobockyForTechnik(
  supabase: TypedSupabase,
  technikId: string,
  pobocky: string[],
) {
  // 1. Get current active assignments
  const { data: current, error: fetchErr } = await supabase
    .from("technik_pobocky")
    .select("id, pobocka")
    .eq("technik_id", technikId)
    .is("deleted_at", null);

  if (fetchErr) throw new Error(fetchErr.message);

  const currentPobocky = (current || []).map((r) => r.pobocka);
  const toDelete = (current || []).filter((r) => !pobocky.includes(r.pobocka));
  const toInsert = pobocky.filter((p) => !currentPobocky.includes(p));

  // 2. Soft-delete removed
  for (const row of toDelete) {
    const { error } = await supabase
      .from("technik_pobocky")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }

  // 3. Insert new (or un-soft-delete)
  for (const pobocka of toInsert) {
    // Check if there's a soft-deleted record to restore
    const { data: deleted } = await supabase
      .from("technik_pobocky")
      .select("id")
      .eq("technik_id", technikId)
      .eq("pobocka", pobocka)
      .not("deleted_at", "is", null)
      .limit(1);

    if (deleted && deleted.length > 0) {
      await supabase
        .from("technik_pobocky")
        .update({ deleted_at: null })
        .eq("id", deleted[0].id);
    } else {
      const { error } = await supabase
        .from("technik_pobocky")
        .insert({ technik_id: technikId, pobocka });
      if (error) throw new Error(error.message);
    }
  }
}
