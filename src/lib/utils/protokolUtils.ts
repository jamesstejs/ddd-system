import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];

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

// ---------- Helpers ----------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
