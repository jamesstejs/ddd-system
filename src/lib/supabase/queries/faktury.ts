import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get all faktury, ordered by newest first.
 */
export async function getFaktury(supabase: TypedSupabase) {
  return supabase
    .from("faktury")
    .select(
      `
      *,
      zakazky:zakazka_id (
        id, typ,
        objekty:objekt_id (
          nazev,
          klienti:klient_id (
            id, nazev, jmeno, prijmeni, ico, typ
          )
        )
      ),
      protokoly:protokol_id (
        id, cislo_protokolu
      )
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Get a single faktura by ID.
 */
export async function getFaktura(supabase: TypedSupabase, id: string) {
  return supabase
    .from("faktury")
    .select(
      `
      *,
      zakazky:zakazka_id (
        id, typ, cena_zaklad, cena_po_sleve, cena_s_dph, dph_sazba_snapshot,
        sleva_typ, sleva_hodnota,
        objekty:objekt_id (
          nazev, adresa,
          klienti:klient_id (
            id, nazev, jmeno, prijmeni, ico, dic, email, typ, dph_sazba, fakturoid_subject_id
          )
        )
      ),
      protokoly:protokol_id (
        id, cislo_protokolu, datum:zasahy(datum)
      )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Get faktura by protokol_id (to check if invoice already exists).
 */
export async function getFakturaByProtokol(
  supabase: TypedSupabase,
  protokolId: string,
) {
  return supabase
    .from("faktury")
    .select("*")
    .eq("protokol_id", protokolId)
    .is("deleted_at", null)
    .maybeSingle();
}

/**
 * Create a new faktura.
 */
export async function createFaktura(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["faktury"]["Insert"],
) {
  return supabase.from("faktury").insert(data).select().single();
}

/**
 * Update a faktura.
 */
export async function updateFaktura(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["faktury"]["Update"],
) {
  return supabase.from("faktury").update(data).eq("id", id).select().single();
}

/**
 * Soft-delete a faktura.
 */
export async function deleteFaktura(supabase: TypedSupabase, id: string) {
  return supabase
    .from("faktury")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Update fakturoid_subject_id on klient.
 */
export async function updateKlientFakturoidId(
  supabase: TypedSupabase,
  klientId: string,
  fakturoidSubjectId: number,
) {
  return supabase
    .from("klienti")
    .update({ fakturoid_subject_id: fakturoidSubjectId })
    .eq("id", klientId);
}

/**
 * Count faktury by stav (for dashboard widget).
 */
export async function countFakturyByStav(
  supabase: TypedSupabase,
  stav: Database["public"]["Enums"]["stav_faktury"],
) {
  const { count } = await supabase
    .from("faktury")
    .select("id", { count: "exact", head: true })
    .eq("stav", stav)
    .is("deleted_at", null);
  return count ?? 0;
}

/**
 * Sum neuhrazené faktury (vytvorena + odeslana + po_splatnosti).
 */
export async function sumNeuhrazeneFaktury(supabase: TypedSupabase) {
  const { data } = await supabase
    .from("faktury")
    .select("castka_s_dph, stav")
    .in("stav", ["vytvorena", "odeslana", "po_splatnosti"])
    .is("deleted_at", null);

  if (!data) return { count: 0, suma: 0 };

  const suma = data.reduce((acc, f) => acc + (f.castka_s_dph ?? 0), 0);
  return { count: data.length, suma };
}
