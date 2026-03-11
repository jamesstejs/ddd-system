import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];
type TypLapace = Database["public"]["Enums"]["typ_lapace"];
type TypZakroku = Database["public"]["Enums"]["typ_zakroku"];
type TypPripravku = Database["public"]["Enums"]["typ_pripravku"];

export type DeratBodInput = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: TypStanicky;
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: StavStanicky;
};

export type PreviousDeratBod = {
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: TypStanicky;
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: StavStanicky;
};

export type DezinsBodInput = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_lapace: TypLapace;
  druh_hmyzu: string | null;
  pocet: number;
};

export type PreviousDezinsBod = {
  cislo_bodu: string;
  okruh_id: string | null;
  typ_lapace: TypLapace;
  druh_hmyzu: string | null;
  pocet: number;
};

export type PripravekForFilter = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
  typ: TypPripravku;
  cilovy_skudce: unknown;
  omezeni_prostor: unknown;
};

// ---------- Labels ----------

export const TYP_STANICKY_LABELS: Record<TypStanicky, string> = {
  zivolovna: "Živolovná",
  mys: "Myš",
  potkan: "Potkan",
  sklopna_mys: "Sklopná myš",
  sklopna_potkan: "Sklopná potkan",
};

export const STAV_STANICKY_LABELS: Record<StavStanicky, string> = {
  zavedena: "Zavedená",
  odcizena: "Odcizená",
  znovu_zavedena: "Znovu zavedená",
  poskozena: "Poškozená",
  ok: "OK",
};

export const TYP_LAPACE_LABELS: Record<TypLapace, string> = {
  lezouci_hmyz: "Lezoucí hmyz",
  letajici_hmyz: "Létající hmyz",
  lepova: "Lepová",
  elektronicka: "Elektronická",
};

export const TYP_ZAKROKU_LABELS: Record<TypZakroku, string> = {
  postrik: "Postřik",
  ulv: "ULV",
  poprash: "Popraš",
  gelova_nastraha: "Gelová nástraha",
};

export const POZER_OPTIONS = [0, 25, 50, 75, 100] as const;

export const POZER_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: "bg-emerald-100", text: "text-emerald-800" },
  25: { bg: "bg-yellow-100", text: "text-yellow-800" },
  50: { bg: "bg-orange-100", text: "text-orange-800" },
  75: { bg: "bg-red-100", text: "text-red-800" },
  100: { bg: "bg-red-200", text: "text-red-900" },
};

// ---------- Functions ----------

/**
 * Vypočítá průměrný požer z pole bodů (zaokrouhlení na 1 desetinné místo).
 * Prázdné pole → 0.
 */
export function prumernyPozer(
  body: { pozer_procent: number }[],
): number {
  if (body.length === 0) return 0;
  const sum = body.reduce((acc, b) => acc + b.pozer_procent, 0);
  return Math.round((sum / body.length) * 10) / 10;
}

/**
 * Předvyplní body z předchozího protokolu.
 * Kopíruje: cislo_bodu, okruh_id, typ_stanicky, pripravek_id
 * Resetuje: pozer_procent=0, stav_stanicky='ok'
 */
export function prefillBodyFromPrevious(
  prevBody: PreviousDeratBod[],
): DeratBodInput[] {
  return prevBody.map((b) => ({
    cislo_bodu: b.cislo_bodu,
    okruh_id: b.okruh_id,
    typ_stanicky: b.typ_stanicky,
    pripravek_id: b.pripravek_id,
    pozer_procent: 0,
    stav_stanicky: "ok" as StavStanicky,
  }));
}

/**
 * Generuje další číslo bodu.
 * Prefix "L" + ["L1","L2","L3"] → "L4"
 * Bez prefixu + ["1","2"] → "3"
 * Gap-safe: ["L1","L3"] → "L4" (bere max, ne count)
 */
export function getNextCisloBodu(
  existingBods: { cislo_bodu: string }[],
  prefix: string = "",
): string {
  if (existingBods.length === 0) {
    return prefix ? `${prefix}1` : "1";
  }

  // Extrahuj čísla z existujících bodů
  const numbers = existingBods
    .map((b) => {
      if (prefix) {
        const match = b.cislo_bodu.match(
          new RegExp(`^${escapeRegex(prefix)}(\\d+)$`),
        );
        return match ? parseInt(match[1], 10) : null;
      }
      const match = b.cislo_bodu.match(/^(\d+)$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null);

  const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
  return prefix ? `${prefix}${maxNum + 1}` : `${maxNum + 1}`;
}

/**
 * Validuje deratizační bod.
 */
export function validateBod(
  bod: Partial<DeratBodInput>,
  allBods: { cislo_bodu: string; id?: string }[] = [],
  currentIndex?: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bod.cislo_bodu || bod.cislo_bodu.trim() === "") {
    errors.push("Číslo bodu je povinné");
  }

  if (!bod.typ_stanicky) {
    errors.push("Typ staničky je povinný");
  }

  // Kontrola unikátnosti čísla bodu
  if (bod.cislo_bodu) {
    const duplicate = allBods.find(
      (b, idx) =>
        b.cislo_bodu === bod.cislo_bodu && idx !== currentIndex,
    );
    if (duplicate) {
      errors.push(`Číslo bodu "${bod.cislo_bodu}" již existuje`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Předvyplní dezinsekční body z předchozího protokolu.
 * Kopíruje: cislo_bodu, okruh_id, typ_lapace, druh_hmyzu
 * Resetuje: pocet=0
 */
export function prefillDezinsBodyFromPrevious(
  prevBody: PreviousDezinsBod[],
): DezinsBodInput[] {
  return prevBody.map((b) => ({
    cislo_bodu: b.cislo_bodu,
    okruh_id: b.okruh_id,
    typ_lapace: b.typ_lapace,
    druh_hmyzu: b.druh_hmyzu,
    pocet: 0,
  }));
}

/**
 * Mapuje typ_objektu na typ_prostoru pro filtrování přípravků.
 * gastro, sklad_zivocisna → potravinarsky
 * domacnost, ubytovna → domacnost
 * ostatní → prumysl
 */
export function mapObjektTypToTypProstoru(
  typObjektu: string | null | undefined,
): string | null {
  if (!typObjektu) return null;
  switch (typObjektu) {
    case "gastro":
    case "sklad_zivocisna":
      return "potravinarsky";
    case "domacnost":
    case "ubytovna":
      return "domacnost";
    case "sklad_nevyzivocisna":
    case "kancelar":
    case "skola":
    case "hotel":
    case "nemocnice":
    case "vyrobni_hala":
    case "jiny":
      return "prumysl";
    default:
      return null;
  }
}

/**
 * Filtruje přípravky pro postřik.
 * 1. Jen insekticid nebo biocid
 * 2. Pokud skudceNazev: filtruje na cilovy_skudce obsahující tento název
 * 3. Pokud typObjektu: mapuje na typ_prostoru a filtruje omezeni_prostor
 */
export function filterPripravkyForPostrik(
  pripravky: PripravekForFilter[],
  skudceNazev?: string | null,
  typObjektu?: string | null,
): PripravekForFilter[] {
  let filtered = pripravky.filter(
    (p) => p.typ === "insekticid" || p.typ === "biocid",
  );

  if (skudceNazev) {
    filtered = filtered.filter((p) => {
      if (!p.cilovy_skudce) return true; // žádné omezení = pro všechny
      if (Array.isArray(p.cilovy_skudce)) {
        return p.cilovy_skudce.includes(skudceNazev);
      }
      return true;
    });
  }

  const typProstoru = mapObjektTypToTypProstoru(typObjektu);
  if (typProstoru) {
    filtered = filtered.filter((p) => {
      if (!p.omezeni_prostor) return true; // žádné omezení = pro všechny prostory
      if (Array.isArray(p.omezeni_prostor)) {
        return p.omezeni_prostor.includes(typProstoru);
      }
      return true;
    });
  }

  return filtered;
}

// ---------- Statistics types ----------

export type TrendDirection = "klesajici" | "stoupajici" | "stabilni";

export type DeratStatistiky = {
  currentAvgPozer: number;
  previousAvgPozer: number | null;
  trend: TrendDirection | null;
  currentBodyCount: number;
  previousBodyCount: number | null;
};

export type DezinsStatistiky = {
  currentTotalPocet: number;
  previousTotalPocet: number | null;
  trend: TrendDirection | null;
  currentBodyCount: number;
  previousBodyCount: number | null;
};

// ---------- Statistics labels ----------

export const TREND_LABELS: Record<TrendDirection, string> = {
  klesajici: "Klesající",
  stoupajici: "Stoupající",
  stabilni: "Stabilní",
};

export const TREND_ICONS: Record<TrendDirection, string> = {
  klesajici: "↓",
  stoupajici: "↑",
  stabilni: "→",
};

export const TREND_COLORS: Record<TrendDirection, { bg: string; text: string }> = {
  klesajici: { bg: "bg-emerald-100", text: "text-emerald-800" },
  stoupajici: { bg: "bg-red-100", text: "text-red-800" },
  stabilni: { bg: "bg-gray-100", text: "text-gray-800" },
};

// ---------- Statistics functions ----------

/**
 * Určí směr trendu ze dvou hodnot.
 * Tolerance: rozdíl ≤ 5% z předchozí hodnoty → stabilní.
 */
export function determineTrend(
  current: number,
  previous: number,
): TrendDirection {
  if (previous === 0 && current === 0) return "stabilni";
  if (previous === 0) return "stoupajici"; // z nuly na něco
  const diff = current - previous;
  const threshold = previous * 0.05; // 5% tolerance
  if (Math.abs(diff) <= threshold) return "stabilni";
  return diff > 0 ? "stoupajici" : "klesajici";
}

/**
 * Vypočítá deratizační statistiky porovnáním aktuálních bodů
 * s body předchozího protokolu.
 */
export function computeDeratStatistiky(
  currentBody: { pozer_procent: number }[],
  previousBody: { pozer_procent: number }[] | null,
): DeratStatistiky {
  const currentAvg = prumernyPozer(currentBody);
  if (!previousBody || previousBody.length === 0) {
    return {
      currentAvgPozer: currentAvg,
      previousAvgPozer: null,
      trend: null,
      currentBodyCount: currentBody.length,
      previousBodyCount: null,
    };
  }
  const previousAvg = prumernyPozer(previousBody);
  return {
    currentAvgPozer: currentAvg,
    previousAvgPozer: previousAvg,
    trend: determineTrend(currentAvg, previousAvg),
    currentBodyCount: currentBody.length,
    previousBodyCount: previousBody.length,
  };
}

/**
 * Vypočítá dezinsekční statistiky porovnáním celkového počtu hmyzu.
 */
export function computeDezinsStatistiky(
  currentBody: { pocet: number }[],
  previousBody: { pocet: number }[] | null,
): DezinsStatistiky {
  const currentTotal = currentBody.reduce((sum, b) => sum + b.pocet, 0);
  if (!previousBody || previousBody.length === 0) {
    return {
      currentTotalPocet: currentTotal,
      previousTotalPocet: null,
      trend: null,
      currentBodyCount: currentBody.length,
      previousBodyCount: null,
    };
  }
  const previousTotal = previousBody.reduce((sum, b) => sum + b.pocet, 0);
  return {
    currentTotalPocet: currentTotal,
    previousTotalPocet: previousTotal,
    trend: determineTrend(currentTotal, previousTotal),
    currentBodyCount: currentBody.length,
    previousBodyCount: previousBody.length,
  };
}

// ---------- Helpers ----------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
