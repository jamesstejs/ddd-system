"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  getTechniciByPobocka,
  getZasahyForTechniciRange,
} from "@/lib/supabase/queries/zasahy";
import { getDostupnostForTechniciRange } from "@/lib/supabase/queries/dostupnost";
import {
  getCenikObecne,
  getCenikPostriky,
  getCenikGely,
  getCenikSpecialni,
  getCenikDeratizace,
  getCenikDezinfekce,
} from "@/lib/supabase/queries/cenik";
import {
  vypocetCeny,
  type VypocetCenyInput,
  type CenikData,
} from "@/lib/kalkulacka/vypocetCeny";
import type { Pobocka } from "@/types/pobocky";
import type {
  DispecinkTechnik,
  DispecinkDostupnost,
  DispecinkZasah,
  DispecinkData,
  CenaOdhadResult,
} from "./types";

// ---------------------------------------------------------------
// Dispečerská data pro týden
// ---------------------------------------------------------------

/**
 * Načte všechna data pro dispečerský pohled — techniky, dostupnost, zásahy
 * pro daný region a týden.
 */
export async function getDispecinkDataAction(
  pobocka: Pobocka,
  weekStartISO: string,
): Promise<DispecinkData> {
  const { supabase } = await requireAdmin();

  // Vypočti rozsah týdne (Po–Ne)
  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const datumOd = weekStartISO;
  const datumDo = end.toISOString().split("T")[0];

  // 1. Načti techniky dle pobočky
  const { data: technici, error: techniciError } = await getTechniciByPobocka(
    supabase,
    pobocka,
  );
  if (techniciError) throw new Error(techniciError.message);

  const technikIds = (technici || []).map((t) => t.id);

  // 2. Načti dostupnost a zásahy paralelně
  const [dostupnostRes, zasahyRes] = await Promise.all([
    getDostupnostForTechniciRange(supabase, technikIds, datumOd, datumDo),
    getZasahyForTechniciRange(supabase, technikIds, datumOd, datumDo),
  ]);

  if (dostupnostRes.error) throw new Error(dostupnostRes.error.message);
  if (zasahyRes.error) throw new Error(zasahyRes.error.message);

  return {
    technici: (technici || []) as DispecinkTechnik[],
    dostupnost: (dostupnostRes.data || []) as DispecinkDostupnost[],
    zasahy: (zasahyRes.data || []) as DispecinkZasah[],
    weekStart: datumOd,
    weekEnd: datumDo,
  };
}

// ---------------------------------------------------------------
// Cenový odhad
// ---------------------------------------------------------------

type CenaOdhadInput = Omit<
  VypocetCenyInput,
  "individualni_sleva_procent" | "dph_sazba"
> & {
  individualni_sleva_procent?: number;
  dph_sazba?: number;
};

/**
 * Vypočítá odhad ceny pro dispečerský pohled.
 * Načte ceník z DB a zavolá pure funkci vypocetCeny.
 */
export async function getCenaOdhadAction(
  input: CenaOdhadInput,
): Promise<CenaOdhadResult> {
  const { supabase } = await requireAdmin();

  // Načti všech 6 ceníkových tabulek paralelně
  const [obecne, postriky, gely, specialni, deratizace, dezinfekce] =
    await Promise.all([
      getCenikObecne(supabase),
      getCenikPostriky(supabase),
      getCenikGely(supabase),
      getCenikSpecialni(supabase),
      getCenikDeratizace(supabase),
      getCenikDezinfekce(supabase),
    ]);

  const cenikData: CenikData = {
    obecne: (obecne.data || []).map((r) => ({
      nazev: r.nazev,
      hodnota: r.hodnota,
      jednotka: r.jednotka,
    })),
    postriky: (postriky.data || []).map((r) => ({
      kategorie: r.kategorie,
      plocha_od: r.plocha_od,
      plocha_do: r.plocha_do,
      cena: r.cena,
    })),
    gely: (gely.data || []).map((r) => ({
      kategorie: r.kategorie,
      bytu_od: r.bytu_od,
      bytu_do: r.bytu_do,
      cena: r.cena,
    })),
    specialni: (specialni.data || []).map((r) => ({
      nazev: r.nazev,
      cena_od: r.cena_od,
      cena_do: r.cena_do,
    })),
    deratizace: (deratizace.data || []).map((r) => ({
      nazev: r.nazev,
      cena_za_kus: r.cena_za_kus,
    })),
    dezinfekce: (dezinfekce.data || []).map((r) => ({
      typ: r.typ,
      plocha_od: r.plocha_od,
      plocha_do: r.plocha_do,
      cena_za_m: r.cena_za_m,
    })),
  };

  const fullInput: VypocetCenyInput = {
    ...input,
    individualni_sleva_procent: input.individualni_sleva_procent ?? 0,
    dph_sazba: input.dph_sazba ?? 21,
  };

  const result = vypocetCeny(cenikData, fullInput);

  return {
    polozky: result.polozky.map((p) => ({
      nazev: p.nazev,
      cena: p.cena_celkem,
    })),
    cena_zaklad: result.cena_zaklad,
    cena_s_dph: result.cena_s_dph,
    dph_sazba: fullInput.dph_sazba,
  };
}
