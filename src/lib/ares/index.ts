export interface AresData {
  nazev: string;
  adresa: string;
  dic: string | null;
}

const ARES_BASE_URL =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

export async function fetchAres(ico: string): Promise<AresData | null> {
  const cleaned = ico.replace(/\s/g, "");
  if (!/^\d{8}$/.test(cleaned)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${ARES_BASE_URL}/${cleaned}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();

    const nazev: string = data.obchodniJmeno || "";
    const dic: string | null = data.dic || null;

    let adresa = "";
    if (data.sidlo?.textovaAdresa) {
      adresa = data.sidlo.textovaAdresa;
    } else if (data.sidlo) {
      const s = data.sidlo;
      const parts = [
        s.nazevUlice,
        s.cisloDomovni ? `${s.cisloDomovni}${s.cisloOrientacni ? "/" + s.cisloOrientacni : ""}` : null,
        s.psc,
        s.nazevObce,
      ].filter(Boolean);
      adresa = parts.join(", ");
    }

    return { nazev, adresa, dic };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
