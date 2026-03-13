"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  getTechniciByPobocka,
  getZasahyForTechniciRange,
} from "@/lib/supabase/queries/zasahy";
import { getDostupnostForTechniciRange } from "@/lib/supabase/queries/dostupnost";
import { getPobockyForTechnici } from "@/lib/supabase/queries/technik_pobocky";
import {
  getCenikObecne,
  getCenikPostriky,
  getCenikGely,
  getCenikSpecialni,
  getCenikDeratizace,
  getCenikDezinfekce,
} from "@/lib/supabase/queries/cenik";
import { getSablonyBodu } from "@/lib/supabase/queries/sablony_bodu";
import {
  vypocetCeny,
  type VypocetCenyInput,
  type CenikData,
} from "@/lib/kalkulacka/vypocetCeny";
import {
  vypocetBodu,
  type SablonaBodu,
  type VysledekKalkulacky,
} from "@/lib/kalkulacka/vypocetBodu";
import type { Json } from "@/lib/supabase/database.types";
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

  const technikIds = (technici || []).map((t: { id: string }) => t.id);

  // 2. Načti dostupnost, zásahy a pobočky paralelně
  const [dostupnostRes, zasahyRes, pobockyMap] = await Promise.all([
    getDostupnostForTechniciRange(supabase, technikIds, datumOd, datumDo),
    getZasahyForTechniciRange(supabase, technikIds, datumOd, datumDo),
    getPobockyForTechnici(supabase, technikIds),
  ]);

  if (dostupnostRes.error) throw new Error(dostupnostRes.error.message);
  if (zasahyRes.error) throw new Error(zasahyRes.error.message);

  // Enrich technici with pobocky array and capacity fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enrichedTechnici: DispecinkTechnik[] = (technici || []).map((t: any) => ({
    id: t.id,
    jmeno: t.jmeno,
    prijmeni: t.prijmeni,
    email: t.email,
    koeficient_rychlosti: t.koeficient_rychlosti,
    pobocka: t.pobocka,
    pobocky: pobockyMap[t.id] || [],
    pozadovane_hodiny_tyden: (t as Record<string, unknown>).pozadovane_hodiny_tyden as number | null,
    pozadovane_dny_tyden: (t as Record<string, unknown>).pozadovane_dny_tyden as number | null,
  }));

  return {
    technici: enrichedTechnici,
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
  /** Typ objektu — potřeba pro automatický výpočet bodů z kalkulačky */
  typ_objektu?: string;
};

// ---------- Šablony parsing helper ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVzorec(json: Json | null): SablonaBodu["vzorec_nad_max"] {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json as any;
}

function mapSablony(data: Awaited<ReturnType<typeof getSablonyBodu>>["data"]): SablonaBodu[] {
  return (data || []).map((row) => ({
    typ_objektu: row.typ_objektu,
    typ_zasahu: row.typ_zasahu,
    rozsah_m2_od: row.rozsah_m2_od,
    rozsah_m2_do: row.rozsah_m2_do,
    bod_s_mys: row.bod_s_mys,
    bod_l_potkan: row.bod_l_potkan,
    zivolovna: row.zivolovna,
    letajici: row.letajici,
    lezouci: row.lezouci,
    vzorec_nad_max: parseVzorec(row.vzorec_nad_max),
  }));
}

/**
 * Vypočítá odhad ceny pro dispečerský pohled.
 * Načte ceník z DB a zavolá pure funkci vypocetCeny.
 *
 * Pokud jde o smluvní zakázku s deratizací a je zadán typ_objektu,
 * automaticky spočítá počty monitorovacích bodů z kalkulačky šablon.
 */
export async function getCenaOdhadAction(
  input: CenaOdhadInput,
): Promise<CenaOdhadResult> {
  const { supabase } = await requireAdmin();

  // Načti všech 6 ceníkových tabulek + šablony bodů paralelně
  const [obecne, postriky, gely, specialni, deratizace, dezinfekce, sablonyRes] =
    await Promise.all([
      getCenikObecne(supabase),
      getCenikPostriky(supabase),
      getCenikGely(supabase),
      getCenikSpecialni(supabase),
      getCenikDeratizace(supabase),
      getCenikDezinfekce(supabase),
      getSablonyBodu(supabase),
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

  // Automatický výpočet bodů z kalkulačky pro smluvní deratizaci
  let poctyBodu: Partial<VypocetCenyInput> = {};
  let bodyVypocet: Record<string, VysledekKalkulacky | null> = {};

  if (
    input.typ_zakazky === "smluvni" &&
    input.typ_objektu &&
    input.plocha_m2 > 0
  ) {
    const sablony = mapSablony(sablonyRes.data);
    const deratTypy = input.typy_zasahu.filter(
      (t) => t === "vnitrni_deratizace" || t === "vnejsi_deratizace",
    );

    // Počítej body pro každý deratizační typ a sečti
    let totalMys = 0;
    let totalPotkan = 0;
    let totalZivolovna = 0;

    for (const typ of deratTypy) {
      const result = vypocetBodu(sablony, input.typ_objektu, input.plocha_m2, typ);
      bodyVypocet[typ] = result;
      if (result) {
        totalMys += result.bod_s_mys;
        totalPotkan += result.bod_l_potkan;
        totalZivolovna += result.zivolovna;
      }
    }

    // Pouze pokud input nemá body ručně zadané, použij kalkulačku
    if (
      !input.pocet_bodu_mys &&
      !input.pocet_bodu_potkan &&
      !input.pocet_bodu_zivolovna_mys
    ) {
      poctyBodu = {
        pocet_bodu_mys: totalMys,
        pocet_bodu_potkan: totalPotkan,
        pocet_bodu_zivolovna_mys: totalZivolovna,
      };
    }
  }

  const fullInput: VypocetCenyInput = {
    ...input,
    ...poctyBodu,
    individualni_sleva_procent: input.individualni_sleva_procent ?? 0,
    dph_sazba: input.dph_sazba ?? 21,
  };

  const result = vypocetCeny(cenikData, fullInput);

  return {
    polozky: result.polozky.map((p) => ({
      nazev: p.nazev,
      pocet: p.pocet,
      cena_za_kus: p.cena_za_kus,
      cena: p.cena_celkem,
    })),
    cena_zaklad: result.cena_zaklad,
    cena_s_dph: result.cena_s_dph,
    dph_sazba: fullInput.dph_sazba,
    body_vypocet: bodyVypocet,
    pocty_bodu: {
      mys: fullInput.pocet_bodu_mys ?? 0,
      potkan: fullInput.pocet_bodu_potkan ?? 0,
      zivolovna_mys: fullInput.pocet_bodu_zivolovna_mys ?? 0,
      zivolovna_potkan: fullInput.pocet_bodu_zivolovna_potkan ?? 0,
    },
  };
}
