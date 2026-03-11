import { callAnthropic } from "./client";
import type {
  DeratStatistiky,
  DezinsStatistiky,
} from "@/lib/utils/protokolUtils";

export interface DeratBodForAi {
  cislo_bodu: string;
  pozer_procent: number;
  typ_stanicky: string | null;
}

export interface DezinsBodForAi {
  cislo_bodu: string;
  pocet: number;
  druh_hmyzu: string | null;
}

export interface GenerateAiHodnoceniParams {
  objektNazev: string;
  typObjektu: string | null;
  deratStatistiky: DeratStatistiky | null;
  dezinsStatistiky: DezinsStatistiky | null;
  currentDeratBody: DeratBodForAi[];
  currentDezinsBody: DezinsBodForAi[];
  previousDeratBody: { pozer_procent: number }[] | null;
  previousDezinsBody: { pocet: number }[] | null;
}

const SYSTEM_PROMPT = `Jsi provozní analytik DDD služeb (dezinfekce, dezinsekce, deratizace) v ČR.
Na základě dat z monitorovacích bodů vyhodnoť aktuální situaci na objektu.

Pravidla:
- Piš česky, 2–4 věty, věcně a profesionálně.
- Pokud nemáš historická data, hodnoť pouze aktuální stav.
- Zmíň konkrétní problematické body (požer ≥ 75 % nebo vysoký počet hmyzu).
- Pokud je trend klesající, uveď to pozitivně. Pokud stoupající, upozorni.
- Nepoužívej marketingový jazyk, pouze faktické hodnocení.`;

/**
 * Generuje AI hodnocení trendu situace na objektu.
 * Vrací plain text (2–4 věty česky).
 */
export async function generateAiHodnoceni(
  params: GenerateAiHodnoceniParams,
): Promise<string> {
  const parts: string[] = [];

  parts.push(`Objekt: ${params.objektNazev}`);
  parts.push(`Typ: ${params.typObjektu || "nespecifikováno"}`);

  // Deratizační data
  if (params.deratStatistiky) {
    const ds = params.deratStatistiky;
    parts.push("");
    parts.push("=== Deratizace ===");
    parts.push(`Průměrný požer: ${ds.currentAvgPozer.toFixed(1)} %`);
    parts.push(`Počet bodů: ${ds.currentBodyCount}`);
    if (ds.previousAvgPozer !== null) {
      parts.push(`Předchozí průměrný požer: ${ds.previousAvgPozer.toFixed(1)} %`);
      parts.push(`Trend: ${ds.trend || "neznámý"}`);
    } else {
      parts.push("Historická data: první protokol");
    }

    if (params.currentDeratBody.length > 0) {
      const problematic = params.currentDeratBody.filter(
        (b) => b.pozer_procent >= 75,
      );
      if (problematic.length > 0) {
        parts.push(
          `Problematické body (≥75%): ${problematic.map((b) => `${b.cislo_bodu} (${b.pozer_procent}%)`).join(", ")}`,
        );
      }
    }
  }

  // Dezinsekční data
  if (params.dezinsStatistiky) {
    const dz = params.dezinsStatistiky;
    parts.push("");
    parts.push("=== Dezinsekce ===");
    parts.push(`Celkový počet zachycených: ${dz.currentTotalPocet}`);
    parts.push(`Počet bodů: ${dz.currentBodyCount}`);
    if (dz.previousTotalPocet !== null) {
      parts.push(`Předchozí celkový počet: ${dz.previousTotalPocet}`);
      parts.push(`Trend: ${dz.trend || "neznámý"}`);
    } else {
      parts.push("Historická data: první protokol");
    }

    if (params.currentDezinsBody.length > 0) {
      const highCount = params.currentDezinsBody.filter((b) => b.pocet >= 10);
      if (highCount.length > 0) {
        parts.push(
          `Body s vysokým výskytem (≥10 ks): ${highCount.map((b) => `${b.cislo_bodu} (${b.pocet} ks${b.druh_hmyzu ? `, ${b.druh_hmyzu}` : ""})`).join(", ")}`,
        );
      }
    }
  }

  if (!params.deratStatistiky && !params.dezinsStatistiky) {
    parts.push("");
    parts.push("Žádná data monitorovacích bodů k dispozici.");
  }

  const userPrompt = parts.join("\n");
  return callAnthropic(SYSTEM_PROMPT, userPrompt, 0.4);
}
