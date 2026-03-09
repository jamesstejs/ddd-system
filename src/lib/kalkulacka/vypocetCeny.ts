/**
 * Kalkulačka ceny zakázky — pure function.
 *
 * Přijímá ceníková data (z DB) a parametry zakázky,
 * vrací rozpis položek, příplatky, slevy, DPH a celkovou cenu.
 */

// ---------- Interfaces ----------

export interface CenikObecneRow {
  nazev: string;
  hodnota: number;
  jednotka: string;
}

export interface CenikPostrikyRow {
  kategorie: string;
  plocha_od: number;
  plocha_do: number | null;
  cena: number;
}

export interface CenikGelyRow {
  kategorie: string;
  bytu_od: number;
  bytu_do: number | null;
  cena: number;
}

export interface CenikSpecialniRow {
  nazev: string;
  cena_od: number;
  cena_do: number | null;
}

export interface CenikDeratizaceRow {
  nazev: string;
  cena_za_kus: number;
}

export interface CenikDezinfekceRow {
  typ: string;
  plocha_od: number;
  plocha_do: number | null;
  cena_za_m: number;
}

export interface CenikData {
  obecne: CenikObecneRow[];
  postriky: CenikPostrikyRow[];
  gely: CenikGelyRow[];
  specialni: CenikSpecialniRow[];
  deratizace: CenikDeratizaceRow[];
  dezinfekce: CenikDezinfekceRow[];
}

export interface VypocetCenyInput {
  typ_zakazky: "jednorazova" | "smluvni";
  typy_zasahu: string[];
  skudci: string[];
  plocha_m2: number;
  pocet_bytu?: number;
  doprava_km: number;
  je_prvni_navsteva: boolean;
  je_vikend: boolean;
  je_nocni: boolean;
  // Monitorovací body (pro smluvní)
  pocet_bodu_mys?: number;
  pocet_bodu_potkan?: number;
  pocet_bodu_zivolovna_mys?: number;
  pocet_bodu_zivolovna_potkan?: number;
  pocet_bodu_sklopna_mys?: number;
  pocet_bodu_sklopna_potkan?: number;
  // Sleva
  sleva_typ?: "procenta" | "castka" | null;
  sleva_hodnota?: number;
  // Klient
  individualni_sleva_procent: number;
  dph_sazba: number;
}

export interface Polozka {
  nazev: string;
  pocet: number;
  cena_za_kus: number;
  cena_celkem: number;
}

export interface VysledekCeny {
  polozky: Polozka[];
  mezisouce: number;
  priplatek_vikend: number;
  priplatek_nocni: number;
  zaklad_pred_slevou: number;
  sleva_klient: number;
  sleva_rucni: number;
  cena_po_sleve: number;
  minimum_aplikovano: boolean;
  cena_zaklad: number;
  dph_castka: number;
  dph_sazba: number;
  cena_s_dph: number;
}

// ---------- Helpers ----------

/** Look up obecné sazby value by nazev */
function getObecnaHodnota(obecne: CenikObecneRow[], nazev: string): number {
  const row = obecne.find((r) => r.nazev === nazev);
  return row?.hodnota ?? 0;
}

/** Look up postřiky cena by kategorie + plocha */
function lookupPostriky(
  postriky: CenikPostrikyRow[],
  kategorie: string,
  plocha: number,
): number | null {
  const match = postriky.find(
    (r) =>
      r.kategorie === kategorie &&
      plocha >= r.plocha_od &&
      (r.plocha_do === null || plocha <= r.plocha_do),
  );
  return match?.cena ?? null;
}

/** Look up gely cena by kategorie + pocet_bytu */
function lookupGely(
  gely: CenikGelyRow[],
  kategorie: string,
  pocetBytu: number,
): number | null {
  const match = gely.find(
    (r) =>
      r.kategorie === kategorie &&
      pocetBytu >= r.bytu_od &&
      (r.bytu_do === null || pocetBytu <= r.bytu_do),
  );
  return match?.cena ?? null;
}

/** Look up deratizace cena_za_kus by nazev (partial match) */
function lookupDeratizace(
  deratizace: CenikDeratizaceRow[],
  nazevContains: string,
): number | null {
  const match = deratizace.find((r) =>
    r.nazev.toLowerCase().includes(nazevContains.toLowerCase()),
  );
  return match?.cena_za_kus ?? null;
}

/** Look up dezinfekce cena_za_m by typ + plocha */
function lookupDezinfekce(
  dezinfekce: CenikDezinfekceRow[],
  typ: string,
  plocha: number,
): number | null {
  const match = dezinfekce.find(
    (r) =>
      r.typ === typ &&
      plocha >= r.plocha_od &&
      (r.plocha_do === null || plocha <= r.plocha_do),
  );
  return match?.cena_za_m ?? null;
}

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Map škůdci names to ceník kategorie for postřiky
const SKUDCI_TO_POSTRIK_KATEGORIE: Record<string, string> = {
  "Štěnice obecná": "stenice_blechy",
  "Blecha obecná": "stenice_blechy",
  "Mol šatní": "moli_rybenky",
  "Rybenka domácí": "moli_rybenky",
  "Pisivka domácí": "moli_rybenky",
};

// Map škůdci names to ceník kategorie for gely
const SKUDCI_TO_GEL_KATEGORIE: Record<string, string> = {
  "Rus domácí": "rusi_svabi_1",
  "Šváb obecný": "rusi_svabi_1",
  "Mravenec faraón": "mravenci_1",
};

// Map škůdci names for speciální zásahy
const SKUDCI_SPECIALNI: Record<string, string> = {
  "Vosa obecná": "Vosy a sršni",
  "Sršeň asijský": "Vosy a sršni",
};

// ---------- Main function ----------

/**
 * Vypočítá cenu zakázky.
 *
 * @param cenik  Ceníková data z DB (6 tabulek)
 * @param input  Parametry zakázky
 * @returns Výsledek kalkulace
 */
export function vypocetCeny(
  cenik: CenikData,
  input: VypocetCenyInput,
): VysledekCeny {
  const polozky: Polozka[] = [];

  // --- Obecné sazby ---
  const vyjezd = getObecnaHodnota(cenik.obecne, "vyjezd");
  const dopravaSazba = getObecnaHodnota(cenik.obecne, "doprava_km");
  const vikendPriplatekProcent = getObecnaHodnota(
    cenik.obecne,
    "vikend_priplatek",
  );
  const nocniPriplatekProcent = getObecnaHodnota(
    cenik.obecne,
    "nocni_priplatek",
  );
  const minimalniCena = getObecnaHodnota(cenik.obecne, "minimalni_cena");

  // --- 1. Výjezd ---
  polozky.push({
    nazev: "Výjezd",
    pocet: 1,
    cena_za_kus: vyjezd,
    cena_celkem: vyjezd,
  });

  // --- 2. Doprava ---
  if (input.doprava_km > 0) {
    const dopravaCelkem = round2(input.doprava_km * dopravaSazba);
    polozky.push({
      nazev: `Doprava (${input.doprava_km} km)`,
      pocet: input.doprava_km,
      cena_za_kus: dopravaSazba,
      cena_celkem: dopravaCelkem,
    });
  }

  // --- 3. Položky dle typu zakázky ---
  if (input.typ_zakazky === "jednorazova") {
    buildJednorazovaPolozky(cenik, input, polozky);
  } else {
    buildSmluvniPolozky(cenik, input, polozky);
  }

  // --- Mezisoučet ---
  const mezisouce = round2(
    polozky.reduce((sum, p) => sum + p.cena_celkem, 0),
  );

  // --- Příplatky ---
  const priplatek_vikend = input.je_vikend
    ? round2((mezisouce * vikendPriplatekProcent) / 100)
    : 0;
  const priplatek_nocni = input.je_nocni
    ? round2((mezisouce * nocniPriplatekProcent) / 100)
    : 0;

  const zaklad_pred_slevou = round2(
    mezisouce + priplatek_vikend + priplatek_nocni,
  );

  // --- Slevy ---
  // 1. Individuální sleva klienta
  const sleva_klient =
    input.individualni_sleva_procent > 0
      ? round2((zaklad_pred_slevou * input.individualni_sleva_procent) / 100)
      : 0;

  const cenaPoklientSleve = round2(zaklad_pred_slevou - sleva_klient);

  // 2. Ruční sleva
  let sleva_rucni = 0;
  if (input.sleva_typ === "procenta" && (input.sleva_hodnota ?? 0) > 0) {
    sleva_rucni = round2(
      (cenaPoklientSleve * (input.sleva_hodnota ?? 0)) / 100,
    );
  } else if (input.sleva_typ === "castka" && (input.sleva_hodnota ?? 0) > 0) {
    sleva_rucni = round2(input.sleva_hodnota ?? 0);
  }

  let cena_po_sleve = round2(cenaPoklientSleve - sleva_rucni);

  // --- Minimum ---
  let minimum_aplikovano = false;
  if (cena_po_sleve < minimalniCena) {
    cena_po_sleve = minimalniCena;
    minimum_aplikovano = true;
  }

  const cena_zaklad = cena_po_sleve;

  // --- DPH ---
  const dph_castka = round2((cena_zaklad * input.dph_sazba) / 100);
  const cena_s_dph = round2(cena_zaklad + dph_castka);

  return {
    polozky,
    mezisouce,
    priplatek_vikend,
    priplatek_nocni,
    zaklad_pred_slevou,
    sleva_klient,
    sleva_rucni,
    cena_po_sleve: cena_zaklad,
    minimum_aplikovano,
    cena_zaklad,
    dph_castka,
    dph_sazba: input.dph_sazba,
    cena_s_dph,
  };
}

// ---------- Jednorázová items ----------

function buildJednorazovaPolozky(
  cenik: CenikData,
  input: VypocetCenyInput,
  polozky: Polozka[],
): void {
  const hasPostrik = input.typy_zasahu.includes("postrik");
  const hasDezinsekce = input.typy_zasahu.includes("vnitrni_dezinsekce");

  for (const skudce of input.skudci) {
    // Postřiky
    if (hasPostrik) {
      const kategorie = SKUDCI_TO_POSTRIK_KATEGORIE[skudce];
      if (kategorie) {
        const cena = lookupPostriky(
          cenik.postriky,
          kategorie,
          input.plocha_m2,
        );
        if (cena !== null) {
          polozky.push({
            nazev: `Postřik — ${skudce}`,
            pocet: 1,
            cena_za_kus: cena,
            cena_celkem: cena,
          });
        }
      }

      // Speciální zásahy (vosy, sršni)
      const specialniNazev = SKUDCI_SPECIALNI[skudce];
      if (specialniNazev) {
        const match = cenik.specialni.find((s) => s.nazev === specialniNazev);
        if (match) {
          // Use cena_od as default
          polozky.push({
            nazev: match.nazev,
            pocet: 1,
            cena_za_kus: match.cena_od,
            cena_celkem: match.cena_od,
          });
        }
      }
    }

    // Gely (dezinsekce)
    if (hasDezinsekce) {
      const gelKategorie = SKUDCI_TO_GEL_KATEGORIE[skudce];
      if (gelKategorie && input.pocet_bytu && input.pocet_bytu > 0) {
        const cena = lookupGely(cenik.gely, gelKategorie, input.pocet_bytu);
        if (cena !== null) {
          polozky.push({
            nazev: `Gel — ${skudce} (${input.pocet_bytu} bytů)`,
            pocet: input.pocet_bytu,
            cena_za_kus: cena,
            cena_celkem: round2(cena * input.pocet_bytu),
          });
        }
      }
    }
  }

  // Dezinfekce (postřik/aerosol based on plocha)
  if (input.typy_zasahu.includes("postrik") && input.skudci.length === 0) {
    // Generic dezinfekce postřik without specific škůdce
    const cenaZaM = lookupDezinfekce(
      cenik.dezinfekce,
      "postrik",
      input.plocha_m2,
    );
    if (cenaZaM !== null) {
      polozky.push({
        nazev: "Dezinfekce — postřik",
        pocet: input.plocha_m2,
        cena_za_kus: cenaZaM,
        cena_celkem: round2(cenaZaM * input.plocha_m2),
      });
    }
  }
}

// ---------- Smluvní items ----------

function buildSmluvniPolozky(
  cenik: CenikData,
  input: VypocetCenyInput,
  polozky: Polozka[],
): void {
  // Práce technika
  const praceTechnika =
    lookupDeratizace(cenik.deratizace, "Práce technika — firmy hlavní") ?? 0;
  if (praceTechnika > 0) {
    polozky.push({
      nazev: "Práce technika",
      pocet: 1,
      cena_za_kus: praceTechnika,
      cena_celkem: praceTechnika,
    });
  }

  if (input.je_prvni_navsteva) {
    // Zavedení bodů — staničky dle typu
    addBodyZavedeni(cenik, input, polozky);
  } else {
    // Follow-up — kontrola bodů (náplň)
    addBodyKontrola(cenik, input, polozky);
  }
}

function addBodyZavedeni(
  cenik: CenikData,
  input: VypocetCenyInput,
  polozky: Polozka[],
): void {
  const bodyMap: { label: string; searchKey: string; pocet: number }[] = [
    {
      label: "Plastová stanička MYŠ",
      searchKey: "Plastová stanička MYŠ",
      pocet: input.pocet_bodu_mys ?? 0,
    },
    {
      label: "Plastová stanice POTKAN",
      searchKey: "Plastová stanice POTKAN",
      pocet: input.pocet_bodu_potkan ?? 0,
    },
    {
      label: "Živolovka MYŠ",
      searchKey: "Živolovka MYŠ",
      pocet: input.pocet_bodu_zivolovna_mys ?? 0,
    },
    {
      label: "Živolovka POTKAN",
      searchKey: "Živolovka POTKAN",
      pocet: input.pocet_bodu_zivolovna_potkan ?? 0,
    },
    {
      label: "Sklapovací pastička MYŠ",
      searchKey: "Sklapovací pastička",
      pocet: input.pocet_bodu_sklopna_mys ?? 0,
    },
  ];

  for (const bod of bodyMap) {
    if (bod.pocet > 0) {
      const cena = lookupDeratizace(cenik.deratizace, bod.searchKey);
      if (cena !== null) {
        polozky.push({
          nazev: bod.label,
          pocet: bod.pocet,
          cena_za_kus: cena,
          cena_celkem: round2(cena * bod.pocet),
        });
      }
    }
  }
}

function addBodyKontrola(
  cenik: CenikData,
  input: VypocetCenyInput,
  polozky: Polozka[],
): void {
  const celkovyPocetBodu =
    (input.pocet_bodu_mys ?? 0) +
    (input.pocet_bodu_potkan ?? 0) +
    (input.pocet_bodu_zivolovna_mys ?? 0) +
    (input.pocet_bodu_zivolovna_potkan ?? 0) +
    (input.pocet_bodu_sklopna_mys ?? 0) +
    (input.pocet_bodu_sklopna_potkan ?? 0);

  if (celkovyPocetBodu > 0) {
    const cenaNapln =
      lookupDeratizace(cenik.deratizace, "Náplň do stanic") ?? 0;
    if (cenaNapln > 0) {
      polozky.push({
        nazev: "Kontrola bodů — náplň",
        pocet: celkovyPocetBodu,
        cena_za_kus: cenaNapln,
        cena_celkem: round2(cenaNapln * celkovyPocetBodu),
      });
    }
  }
}
