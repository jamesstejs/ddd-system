/**
 * Pure utility functions pro zásahy — odhad délky, formátování.
 * Žádné DB volání.
 */

/**
 * Typy zásahů používané v zakázce (typy_zasahu JSONB).
 */
export type TypZasahu =
  | "vnitrni_deratizace"
  | "vnejsi_deratizace"
  | "vnitrni_dezinsekce"
  | "postrik";

/**
 * Základní časy (minuty) na typ zásahu.
 * Realistické odhady pro DDD firmu:
 * - Monitoring (deratizace): základ 30 min + per bod
 * - Postřik: základ 20 min + per m²
 * - Dezinsekce: základ 25 min + per bod
 */
const BASE_MINUTES: Record<TypZasahu, number> = {
  vnitrni_deratizace: 30,
  vnejsi_deratizace: 25,
  vnitrni_dezinsekce: 25,
  postrik: 20,
};

/**
 * Minuty per monitorovací bod dle typu zásahu.
 */
const MINUTES_PER_BOD: Record<TypZasahu, number> = {
  vnitrni_deratizace: 3,
  vnejsi_deratizace: 4,
  vnitrni_dezinsekce: 3,
  postrik: 0, // postřik se počítá per m², ne per bod
};

/**
 * Minuty per m² pro postřik (velmi malé číslo — realisticky 0.05 min/m²).
 */
const MINUTES_PER_M2_POSTRIK = 0.05;

/**
 * Odhadne délku zásahu v minutách.
 *
 * @param typyZasahu - Pole typů zásahů na zakázce
 * @param pocetBodu - Počet monitorovacích bodů
 * @param plochaM2 - Plocha objektu v m² (pro postřik)
 * @param koeficientRychlosti - Individuální koeficient technika (default 1.0)
 * @returns Odhadovaná délka v minutách (zaokrouhleno na 5 min nahoru)
 */
export function odhadDelkyZasahu(
  typyZasahu: string[],
  pocetBodu: number = 0,
  plochaM2: number = 0,
  koeficientRychlosti: number = 1.0,
): number {
  if (typyZasahu.length === 0) return 30; // minimum 30 min

  let totalMinutes = 0;

  for (const typ of typyZasahu) {
    const validTyp = typ as TypZasahu;
    const base = BASE_MINUTES[validTyp] ?? 30;
    const perBod = MINUTES_PER_BOD[validTyp] ?? 0;

    let zasahMinutes = base + perBod * pocetBodu;

    // Postřik — přidat čas per m²
    if (validTyp === "postrik" && plochaM2 > 0) {
      zasahMinutes += MINUTES_PER_M2_POSTRIK * plochaM2;
    }

    totalMinutes += zasahMinutes;
  }

  // Aplikovat koeficient rychlosti technika (vyšší = pomalejší)
  totalMinutes *= koeficientRychlosti;

  // Minimum 15 minut
  totalMinutes = Math.max(15, totalMinutes);

  // Zaokrouhlit na 5 minut nahoru
  return Math.ceil(totalMinutes / 5) * 5;
}

/**
 * Formátuje délku v minutách: "1h 30min" nebo "45min"
 */
export function formatDelka(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins} min`;
}

/**
 * Status zásahu — čeština + barva.
 */
export const STATUS_ZASAHU_LABELS: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  naplanovano: {
    label: "Naplánováno",
    color: "text-blue-800",
    bgColor: "bg-blue-100",
  },
  potvrzeny: {
    label: "Potvrzený",
    color: "text-green-800",
    bgColor: "bg-green-100",
  },
  probiha: {
    label: "Probíhá",
    color: "text-orange-800",
    bgColor: "bg-orange-100",
  },
  hotovo: {
    label: "Hotovo",
    color: "text-emerald-800",
    bgColor: "bg-emerald-100",
  },
  zruseno: {
    label: "Zrušeno",
    color: "text-red-800",
    bgColor: "bg-red-100",
  },
};

/**
 * Barvy pro techniky v kalendáři (cyklické přiřazení).
 */
export const TECHNIK_COLORS = [
  { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-800", dot: "bg-blue-500" },
  { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-800", dot: "bg-emerald-500" },
  { bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-800", dot: "bg-violet-500" },
  { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-800", dot: "bg-amber-500" },
  { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-800", dot: "bg-rose-500" },
  { bg: "bg-cyan-100", border: "border-cyan-400", text: "text-cyan-800", dot: "bg-cyan-500" },
  { bg: "bg-pink-100", border: "border-pink-400", text: "text-pink-800", dot: "bg-pink-500" },
  { bg: "bg-lime-100", border: "border-lime-400", text: "text-lime-800", dot: "bg-lime-500" },
];

/**
 * Přiřadí barvu technikovi dle indexu.
 */
export function getTechnikColor(index: number) {
  return TECHNIK_COLORS[index % TECHNIK_COLORS.length];
}
