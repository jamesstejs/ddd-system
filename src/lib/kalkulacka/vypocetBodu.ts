/**
 * Kalkulačka monitorovacích bodů — pure function.
 *
 * Přijímá pole šablon (z DB) a vrací doporučený počet bodů
 * dle typu objektu, plochy (m²) a typu zásahu.
 */

// ---------- Interfaces ----------

export interface VzorecPole {
  zaklad: number;
  prirustek: number;
  za_m2: number;
}

export interface VzorecNadMax {
  zaklad_m2: number;
  bod_s_mys?: VzorecPole;
  bod_l_potkan?: VzorecPole;
  zivolovna?: VzorecPole;
  letajici?: VzorecPole;
  lezouci?: VzorecPole;
}

export interface SablonaBodu {
  typ_objektu: string;
  typ_zasahu: string;
  rozsah_m2_od: number;
  rozsah_m2_do: number | null;
  bod_s_mys: number;
  bod_l_potkan: number;
  zivolovna: number;
  letajici: number;
  lezouci: number;
  vzorec_nad_max: VzorecNadMax | null;
}

export interface VysledekKalkulacky {
  bod_s_mys: number;
  bod_l_potkan: number;
  zivolovna: number;
  letajici: number;
  lezouci: number;
  pouzit_vzorec: boolean;
}

// ---------- Helper ----------

function spocitejPodleVzorce(
  vzorec: VzorecPole | undefined,
  zakladHodnota: number,
  plocha: number,
  zakladM2: number,
): number {
  if (!vzorec) return zakladHodnota;
  const presah = plocha - zakladM2;
  if (presah <= 0) return vzorec.zaklad;
  return vzorec.zaklad + Math.ceil(presah / vzorec.za_m2) * vzorec.prirustek;
}

// ---------- Main function ----------

/**
 * Vypočítá doporučený počet monitorovacích bodů.
 *
 * @param sablony  Pole šablon z DB tabulky `sablony_bodu`
 * @param typ_objektu  Typ objektu (gastro, domacnost, ...)
 * @param plocha_m2  Plocha v m²
 * @param typ_zasahu  Typ zásahu (vnitrni_deratizace, ...)
 * @returns Výsledek kalkulačky nebo null pokud šablona neexistuje
 */
export function vypocetBodu(
  sablony: SablonaBodu[],
  typ_objektu: string,
  plocha_m2: number,
  typ_zasahu: string,
): VysledekKalkulacky | null {
  // Validate input
  if (!plocha_m2 || plocha_m2 <= 0) return null;
  if (!typ_objektu || !typ_zasahu) return null;

  // Filter templates for matching typ_objektu + typ_zasahu
  const relevantni = sablony.filter(
    (s) => s.typ_objektu === typ_objektu && s.typ_zasahu === typ_zasahu,
  );

  if (relevantni.length === 0) return null;

  // Sort by rozsah_m2_od ascending
  const sorted = [...relevantni].sort(
    (a, b) => a.rozsah_m2_od - b.rozsah_m2_od,
  );

  // Find matching range
  const match = sorted.find(
    (s) =>
      plocha_m2 >= s.rozsah_m2_od &&
      (s.rozsah_m2_do === null || plocha_m2 <= s.rozsah_m2_do),
  );

  if (!match) return null;

  // If vzorec_nad_max is set, use formula
  if (match.vzorec_nad_max) {
    const vzorec = match.vzorec_nad_max;
    return {
      bod_s_mys: spocitejPodleVzorce(
        vzorec.bod_s_mys,
        match.bod_s_mys,
        plocha_m2,
        vzorec.zaklad_m2,
      ),
      bod_l_potkan: spocitejPodleVzorce(
        vzorec.bod_l_potkan,
        match.bod_l_potkan,
        plocha_m2,
        vzorec.zaklad_m2,
      ),
      zivolovna: spocitejPodleVzorce(
        vzorec.zivolovna,
        match.zivolovna,
        plocha_m2,
        vzorec.zaklad_m2,
      ),
      letajici: spocitejPodleVzorce(
        vzorec.letajici,
        match.letajici,
        plocha_m2,
        vzorec.zaklad_m2,
      ),
      lezouci: spocitejPodleVzorce(
        vzorec.lezouci,
        match.lezouci,
        plocha_m2,
        vzorec.zaklad_m2,
      ),
      pouzit_vzorec: true,
    };
  }

  // Direct lookup — return values from the matching row
  return {
    bod_s_mys: match.bod_s_mys,
    bod_l_potkan: match.bod_l_potkan,
    zivolovna: match.zivolovna,
    letajici: match.letajici,
    lezouci: match.lezouci,
    pouzit_vzorec: false,
  };
}
