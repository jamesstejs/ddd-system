import { callAnthropic } from "./client";

export interface PripravekForAi {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  typ: string;
  forma?: string | null;
  cilovy_skudce: unknown;
  omezeni_prostor: unknown;
}

export interface AiDoporuceni {
  pripravek_id: string;
  nazev: string;
  duvod: string;
  priorita: number;
}

interface GetAiDoporuceniParams {
  skudceNazev: string;
  typObjektu: string | null;
  dostupnePripravky: PripravekForAi[];
}

const SYSTEM_PROMPT = `Jsi expert na DDD (dezinfekce, dezinsekce, deratizace) v České republice.
Na základě cílového škůdce a typu prostoru doporuč nejvhodnější přípravky ze zadaného seznamu.
Řaď od nejvhodnějšího. Uveď stručný důvod u každého (1 věta česky).

ODPOVĚZ VÝHRADNĚ jako JSON pole (bez markdown, bez komentářů):
[{"pripravek_id": "uuid", "duvod": "důvod", "priorita": 1}, ...]

Pokud žádný přípravek není vhodný, vrať prázdné pole [].`;

/**
 * Získá AI doporučení přípravků pro daného škůdce a typ prostoru.
 * Vrací seřazený seznam s důvody.
 */
export async function getAiDoporuceniPripravku({
  skudceNazev,
  typObjektu,
  dostupnePripravky,
}: GetAiDoporuceniParams): Promise<AiDoporuceni[]> {
  if (dostupnePripravky.length === 0) {
    return [];
  }

  const pripravkyList = dostupnePripravky.map((p) => ({
    id: p.id,
    nazev: p.nazev,
    ucinna_latka: p.ucinna_latka,
    typ: p.typ,
    forma: p.forma ?? null,
  }));

  const userPrompt = `Škůdce: ${skudceNazev}
Typ prostoru: ${typObjektu || "nespecifikováno"}

Dostupné přípravky:
${JSON.stringify(pripravkyList, null, 2)}

Doporuč nejvhodnější přípravky (max 5) seřazené dle priority.`;

  const response = await callAnthropic(SYSTEM_PROMPT, userPrompt);

  // Parse JSON z odpovědi (model může obalit do markdown code block)
  const jsonStr = extractJson(response);
  const parsed = JSON.parse(jsonStr);

  if (!Array.isArray(parsed)) {
    throw new Error("AI: odpověď není pole");
  }

  // Validace: filtr jen existující IDs + doplnění názvu
  const validIds = new Set(dostupnePripravky.map((p) => p.id));
  const pripravkyMap = new Map(dostupnePripravky.map((p) => [p.id, p.nazev]));

  return parsed
    .filter(
      (item: Record<string, unknown>) =>
        typeof item.pripravek_id === "string" &&
        validIds.has(item.pripravek_id),
    )
    .map(
      (item: { pripravek_id: string; duvod?: string; priorita?: number }) => ({
        pripravek_id: item.pripravek_id,
        nazev: pripravkyMap.get(item.pripravek_id) || "",
        duvod: typeof item.duvod === "string" ? item.duvod : "",
        priorita: typeof item.priorita === "number" ? item.priorita : 99,
      }),
    )
    .sort(
      (a: AiDoporuceni, b: AiDoporuceni) => a.priorita - b.priorita,
    )
    .slice(0, 5);
}

/**
 * Extrahuje JSON z odpovědi — odstraní markdown code block pokud je přítomen.
 */
function extractJson(text: string): string {
  // Zkusit najít JSON v code blocku
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Zkusit najít JSON pole přímo
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  return text.trim();
}
