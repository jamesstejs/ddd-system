/**
 * Supabase queries pro bonusový systém (Sprint 30).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;
type TypBonusu = Database["public"]["Enums"]["typ_bonusu"];
type StavBonusu = Database["public"]["Enums"]["stav_bonusu"];

// ---------------------------------------------------------------
// Bonusy — CRUD
// ---------------------------------------------------------------

/**
 * Získá bonusy pro uživatele, volitelně za období.
 */
export async function getBonusyForUser(
  supabase: TypedSupabase,
  userId: string,
  mesicOd?: string,
  mesicDo?: string,
) {
  let query = supabase
    .from("bonusy")
    .select(
      `
      *,
      zakazky:zakazka_id (
        id,
        objekty:objekt_id (
          nazev,
          klienti:klient_id ( nazev, jmeno, prijmeni, typ )
        )
      )
    `,
    )
    .eq("uzivatel_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (mesicOd) query = query.gte("obdobi_mesic", mesicOd);
  if (mesicDo) query = query.lte("obdobi_mesic", mesicDo);

  return query;
}

/**
 * Sumář bonusů pro uživatele za daný měsíc.
 * Vrací { pending: number, proplaceno: number, celkem: number, pocet: number }
 */
export async function getBonusySummary(
  supabase: TypedSupabase,
  userId: string,
  mesic: string,
): Promise<{
  pending: number;
  proplaceno: number;
  celkem: number;
  pocet: number;
}> {
  const { data } = await supabase
    .from("bonusy")
    .select("castka, stav")
    .eq("uzivatel_id", userId)
    .eq("obdobi_mesic", mesic)
    .is("deleted_at", null);

  if (!data || data.length === 0) {
    return { pending: 0, proplaceno: 0, celkem: 0, pocet: 0 };
  }

  let pending = 0;
  let proplaceno = 0;
  for (const b of data) {
    const castka = Number(b.castka) || 0;
    if (b.stav === "pending") pending += castka;
    else proplaceno += castka;
  }

  return {
    pending,
    proplaceno,
    celkem: pending + proplaceno,
    pocet: data.length,
  };
}

/**
 * Přehled bonusů všech uživatelů za měsíc (super_admin).
 */
export async function getAllBonusy(
  supabase: TypedSupabase,
  mesic: string,
) {
  return supabase
    .from("bonusy")
    .select(
      `
      *,
      profiles:uzivatel_id ( jmeno, prijmeni, role ),
      zakazky:zakazka_id (
        id,
        objekty:objekt_id (
          nazev,
          klienti:klient_id ( nazev, jmeno, prijmeni, typ )
        )
      )
    `,
    )
    .eq("obdobi_mesic", mesic)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Vytvoření bonusu.
 */
export async function createBonus(
  supabase: TypedSupabase,
  data: {
    uzivatel_id: string;
    typ: TypBonusu;
    zakazka_id?: string | null;
    zasah_id?: string | null;
    castka: number;
    obdobi_mesic: string;
    poznamka?: string | null;
  },
) {
  return supabase.from("bonusy").insert({
    uzivatel_id: data.uzivatel_id,
    typ: data.typ,
    zakazka_id: data.zakazka_id ?? null,
    zasah_id: data.zasah_id ?? null,
    castka: data.castka,
    obdobi_mesic: data.obdobi_mesic,
    stav: "pending" as StavBonusu,
    poznamka: data.poznamka ?? null,
  });
}

/**
 * Batch označení bonusů jako proplaceno.
 */
export async function markBonusyProplaceno(
  supabase: TypedSupabase,
  bonusIds: string[],
) {
  return supabase
    .from("bonusy")
    .update({ stav: "proplaceno" as StavBonusu })
    .in("id", bonusIds)
    .is("deleted_at", null);
}

/**
 * Kontrola deduplikace: existuje bonus pro daný zásah a typ?
 */
export async function checkBonusExists(
  supabase: TypedSupabase,
  zasahId: string,
  typ: TypBonusu,
): Promise<boolean> {
  const { data } = await supabase
    .from("bonusy")
    .select("id")
    .eq("zasah_id", zasahId)
    .eq("typ", typ)
    .is("deleted_at", null)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Kontrola deduplikace fixního bonusu: per user + měsíc.
 */
export async function checkFixniBonusExists(
  supabase: TypedSupabase,
  userId: string,
  mesic: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("bonusy")
    .select("id")
    .eq("uzivatel_id", userId)
    .eq("typ", "fixni" as TypBonusu)
    .eq("obdobi_mesic", mesic)
    .is("deleted_at", null)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------
// Nastavení bonusů
// ---------------------------------------------------------------

export interface NastaveniBonusu {
  bonus_za_zakazku: number;
  bonus_za_opakovanou: number;
  fixni_odmena_admin: number;
}

/**
 * Načte všechna nastavení bonusů jako objekt.
 */
export async function getNastaveniBonusu(
  supabase: TypedSupabase,
): Promise<NastaveniBonusu> {
  const { data } = await supabase
    .from("nastaveni_bonusu")
    .select("klic, hodnota");

  const defaults: NastaveniBonusu = {
    bonus_za_zakazku: 100,
    bonus_za_opakovanou: 100,
    fixni_odmena_admin: 0,
  };

  if (!data) return defaults;

  for (const row of data) {
    if (row.klic in defaults) {
      (defaults as unknown as Record<string, number>)[row.klic] = Number(row.hodnota) || 0;
    }
  }

  return defaults;
}

/**
 * Načte jednu sazbu dle klíče.
 */
export async function getBonusSazba(
  supabase: TypedSupabase,
  klic: string,
): Promise<number> {
  const { data } = await supabase
    .from("nastaveni_bonusu")
    .select("hodnota")
    .eq("klic", klic)
    .single();

  return data ? Number(data.hodnota) : 0;
}

/**
 * Aktualizace sazby bonusu.
 */
export async function updateNastaveniBonusu(
  supabase: TypedSupabase,
  klic: string,
  hodnota: number,
) {
  return supabase
    .from("nastaveni_bonusu")
    .update({ hodnota })
    .eq("klic", klic);
}

// ---------------------------------------------------------------
// Helpers pro auto-bonus
// ---------------------------------------------------------------

/**
 * Vrací první den aktuálního měsíce jako YYYY-MM-DD.
 */
export function getCurrentMonthStart(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/**
 * Auto-vytvoření bonusu za dokončenou zakázku.
 * Deduplikace dle zasah_id + typ.
 */
export async function createBonusZaZakazku(
  supabase: TypedSupabase,
  userId: string,
  zakazkaId: string,
  zasahId: string,
): Promise<void> {
  // Deduplikace
  const exists = await checkBonusExists(supabase, zasahId, "zakazka");
  if (exists) return;

  // Sazba
  const castka = await getBonusSazba(supabase, "bonus_za_zakazku");
  if (castka <= 0) return;

  await createBonus(supabase, {
    uzivatel_id: userId,
    typ: "zakazka",
    zakazka_id: zakazkaId,
    zasah_id: zasahId,
    castka,
    obdobi_mesic: getCurrentMonthStart(),
    poznamka: null,
  });
}

/**
 * Auto-vytvoření bonusu za domluvenou opakovanou zakázku.
 * Deduplikace dle zasah_id (nového follow-up zásahu) + typ.
 */
export async function createBonusZaOpakovanou(
  supabase: TypedSupabase,
  userId: string,
  zakazkaId: string,
  zasahId: string,
): Promise<void> {
  // Deduplikace
  const exists = await checkBonusExists(supabase, zasahId, "opakovana_zakazka");
  if (exists) return;

  // Sazba
  const castka = await getBonusSazba(supabase, "bonus_za_opakovanou");
  if (castka <= 0) return;

  await createBonus(supabase, {
    uzivatel_id: userId,
    typ: "opakovana_zakazka",
    zakazka_id: zakazkaId,
    zasah_id: zasahId,
    castka,
    obdobi_mesic: getCurrentMonthStart(),
    poznamka: null,
  });
}
