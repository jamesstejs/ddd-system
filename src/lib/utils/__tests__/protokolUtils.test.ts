import { describe, it, expect } from "vitest";
import {
  prumernyPozer,
  prefillBodyFromPrevious,
  prefillDezinsBodyFromPrevious,
  getNextCisloBodu,
  validateBod,
  filterPripravkyForPostrik,
  mapObjektTypToTypProstoru,
  determineTrend,
  computeDeratStatistiky,
  computeDezinsStatistiky,
  TYP_STANICKY_LABELS,
  STAV_STANICKY_LABELS,
  TYP_LAPACE_LABELS,
  TYP_ZAKROKU_LABELS,
  POZER_OPTIONS,
  POZER_COLORS,
  TREND_LABELS,
  TREND_ICONS,
  TREND_COLORS,
} from "../protokolUtils";
import type { PripravekForFilter } from "../protokolUtils";

// ---------- prumernyPozer ----------

describe("prumernyPozer", () => {
  it("vrátí 0 pro prázdné pole", () => {
    expect(prumernyPozer([])).toBe(0);
  });

  it("vrátí 0 pro jeden bod s 0%", () => {
    expect(prumernyPozer([{ pozer_procent: 0 }])).toBe(0);
  });

  it("vrátí 100 pro jeden bod se 100%", () => {
    expect(prumernyPozer([{ pozer_procent: 100 }])).toBe(100);
  });

  it("vrátí 50 pro dva body s 50%", () => {
    expect(prumernyPozer([{ pozer_procent: 50 }, { pozer_procent: 50 }])).toBe(
      50,
    );
  });

  it("vrátí 87.5 pro 7×100% + 1×0%", () => {
    const body = [
      { pozer_procent: 100 },
      { pozer_procent: 100 },
      { pozer_procent: 100 },
      { pozer_procent: 100 },
      { pozer_procent: 100 },
      { pozer_procent: 100 },
      { pozer_procent: 100 },
      { pozer_procent: 0 },
    ];
    expect(prumernyPozer(body)).toBe(87.5);
  });

  it("správně zaokrouhlí na 1 desetinné místo", () => {
    // 3 body: 25 + 50 + 75 = 150 / 3 = 50.0
    const body = [
      { pozer_procent: 25 },
      { pozer_procent: 50 },
      { pozer_procent: 75 },
    ];
    expect(prumernyPozer(body)).toBe(50);
  });

  it("zaokrouhlí třetiny správně", () => {
    // 100/3 = 33.333... → 33.3
    const body = [
      { pozer_procent: 100 },
      { pozer_procent: 0 },
      { pozer_procent: 0 },
    ];
    expect(prumernyPozer(body)).toBe(33.3);
  });
});

// ---------- prefillBodyFromPrevious ----------

describe("prefillBodyFromPrevious", () => {
  it("vrátí prázdné pole pro prázdný vstup", () => {
    expect(prefillBodyFromPrevious([])).toEqual([]);
  });

  it("kopíruje cislo_bodu, typ_stanicky, okruh_id, pripravek_id", () => {
    const prev = [
      {
        cislo_bodu: "L1",
        okruh_id: "okruh-1",
        typ_stanicky: "mys" as const,
        pripravek_id: "prip-1",
        pozer_procent: 75,
        stav_stanicky: "poskozena" as const,
      },
    ];
    const result = prefillBodyFromPrevious(prev);
    expect(result).toHaveLength(1);
    expect(result[0].cislo_bodu).toBe("L1");
    expect(result[0].okruh_id).toBe("okruh-1");
    expect(result[0].typ_stanicky).toBe("mys");
    expect(result[0].pripravek_id).toBe("prip-1");
  });

  it("resetuje pozer_procent na 0", () => {
    const prev = [
      {
        cislo_bodu: "L1",
        okruh_id: null,
        typ_stanicky: "potkan" as const,
        pripravek_id: null,
        pozer_procent: 100,
        stav_stanicky: "odcizena" as const,
      },
    ];
    const result = prefillBodyFromPrevious(prev);
    expect(result[0].pozer_procent).toBe(0);
  });

  it("resetuje stav_stanicky na 'ok'", () => {
    const prev = [
      {
        cislo_bodu: "H3",
        okruh_id: null,
        typ_stanicky: "zivolovna" as const,
        pripravek_id: null,
        pozer_procent: 50,
        stav_stanicky: "poskozena" as const,
      },
    ];
    const result = prefillBodyFromPrevious(prev);
    expect(result[0].stav_stanicky).toBe("ok");
  });

  it("zachovává pořadí", () => {
    const prev = [
      {
        cislo_bodu: "L1",
        okruh_id: null,
        typ_stanicky: "mys" as const,
        pripravek_id: null,
        pozer_procent: 0,
        stav_stanicky: "ok" as const,
      },
      {
        cislo_bodu: "L2",
        okruh_id: null,
        typ_stanicky: "potkan" as const,
        pripravek_id: null,
        pozer_procent: 50,
        stav_stanicky: "ok" as const,
      },
      {
        cislo_bodu: "H1",
        okruh_id: "okruh-2",
        typ_stanicky: "zivolovna" as const,
        pripravek_id: "prip-x",
        pozer_procent: 25,
        stav_stanicky: "zavedena" as const,
      },
    ];
    const result = prefillBodyFromPrevious(prev);
    expect(result.map((b) => b.cislo_bodu)).toEqual(["L1", "L2", "H1"]);
    expect(result.map((b) => b.typ_stanicky)).toEqual([
      "mys",
      "potkan",
      "zivolovna",
    ]);
  });

  it("nemá id na výstupu (nové body)", () => {
    const prev = [
      {
        cislo_bodu: "L1",
        okruh_id: null,
        typ_stanicky: "mys" as const,
        pripravek_id: null,
        pozer_procent: 0,
        stav_stanicky: "ok" as const,
      },
    ];
    const result = prefillBodyFromPrevious(prev);
    expect(result[0]).not.toHaveProperty("id");
  });
});

// ---------- getNextCisloBodu ----------

describe("getNextCisloBodu", () => {
  it('vrátí "L1" pro prázdné pole s prefixem "L"', () => {
    expect(getNextCisloBodu([], "L")).toBe("L1");
  });

  it('vrátí "1" pro prázdné pole bez prefixu', () => {
    expect(getNextCisloBodu([])).toBe("1");
  });

  it('vrátí "L4" pro ["L1","L2","L3"] s prefixem "L"', () => {
    const bods = [
      { cislo_bodu: "L1" },
      { cislo_bodu: "L2" },
      { cislo_bodu: "L3" },
    ];
    expect(getNextCisloBodu(bods, "L")).toBe("L4");
  });

  it('vrátí "3" pro ["1","2"] bez prefixu', () => {
    const bods = [{ cislo_bodu: "1" }, { cislo_bodu: "2" }];
    expect(getNextCisloBodu(bods)).toBe("3");
  });

  it('je gap-safe: ["L1","L3"] → "L4"', () => {
    const bods = [{ cislo_bodu: "L1" }, { cislo_bodu: "L3" }];
    expect(getNextCisloBodu(bods, "L")).toBe("L4");
  });

  it("ignoruje body s jiným prefixem", () => {
    const bods = [
      { cislo_bodu: "L1" },
      { cislo_bodu: "H1" },
      { cislo_bodu: "L2" },
    ];
    expect(getNextCisloBodu(bods, "L")).toBe("L3");
  });

  it("ignoruje body bez čísla", () => {
    const bods = [{ cislo_bodu: "L1" }, { cislo_bodu: "X" }];
    expect(getNextCisloBodu(bods, "L")).toBe("L2");
  });
});

// ---------- validateBod ----------

describe("validateBod", () => {
  it("vrátí errors pro prázdný bod", () => {
    const result = validateBod({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Číslo bodu je povinné");
    expect(result.errors).toContain("Typ staničky je povinný");
  });

  it("vrátí valid pro kompletní bod", () => {
    const result = validateBod({
      cislo_bodu: "L1",
      typ_stanicky: "mys",
      pozer_procent: 0,
      stav_stanicky: "ok",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("vrátí error pro prázdné cislo_bodu", () => {
    const result = validateBod({
      cislo_bodu: "",
      typ_stanicky: "mys",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Číslo bodu je povinné");
  });

  it("vrátí error pro chybějící typ_stanicky", () => {
    const result = validateBod({
      cislo_bodu: "L1",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Typ staničky je povinný");
  });

  it("vrátí error pro duplicitní cislo_bodu", () => {
    const allBods = [
      { cislo_bodu: "L1" },
      { cislo_bodu: "L2" },
      { cislo_bodu: "L3" },
    ];
    const result = validateBod(
      { cislo_bodu: "L2", typ_stanicky: "mys" },
      allBods,
      0, // editing index 0 (L1)
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Číslo bodu "L2" již existuje');
  });

  it("nehlásí duplicitu pro vlastní index", () => {
    const allBods = [{ cislo_bodu: "L1" }, { cislo_bodu: "L2" }];
    const result = validateBod(
      { cislo_bodu: "L1", typ_stanicky: "mys" },
      allBods,
      0, // editing index 0 — same as self
    );
    expect(result.valid).toBe(true);
  });
});

// ---------- Labels & Constants ----------

describe("TYP_STANICKY_LABELS", () => {
  it("obsahuje všech 5 typů", () => {
    expect(Object.keys(TYP_STANICKY_LABELS)).toHaveLength(5);
    expect(TYP_STANICKY_LABELS.mys).toBe("Myš");
    expect(TYP_STANICKY_LABELS.potkan).toBe("Potkan");
    expect(TYP_STANICKY_LABELS.zivolovna).toBe("Živolovná");
    expect(TYP_STANICKY_LABELS.sklopna_mys).toBe("Sklopná myš");
    expect(TYP_STANICKY_LABELS.sklopna_potkan).toBe("Sklopná potkan");
  });
});

describe("STAV_STANICKY_LABELS", () => {
  it("obsahuje všech 5 stavů", () => {
    expect(Object.keys(STAV_STANICKY_LABELS)).toHaveLength(5);
    expect(STAV_STANICKY_LABELS.ok).toBe("OK");
    expect(STAV_STANICKY_LABELS.odcizena).toBe("Odcizená");
  });
});

describe("POZER_OPTIONS", () => {
  it("obsahuje [0, 25, 50, 75, 100]", () => {
    expect([...POZER_OPTIONS]).toEqual([0, 25, 50, 75, 100]);
  });
});

describe("POZER_COLORS", () => {
  it("má barvy pro všech 5 hodnot", () => {
    for (const opt of POZER_OPTIONS) {
      expect(POZER_COLORS[opt]).toBeDefined();
      expect(POZER_COLORS[opt].bg).toBeTruthy();
      expect(POZER_COLORS[opt].text).toBeTruthy();
    }
  });
});

// ---------- TYP_LAPACE_LABELS ----------

describe("TYP_LAPACE_LABELS", () => {
  it("obsahuje všechny 4 typy", () => {
    expect(Object.keys(TYP_LAPACE_LABELS)).toHaveLength(4);
    expect(TYP_LAPACE_LABELS.lezouci_hmyz).toBe("Lezoucí hmyz");
    expect(TYP_LAPACE_LABELS.letajici_hmyz).toBe("Létající hmyz");
    expect(TYP_LAPACE_LABELS.lepova).toBe("Lepová");
    expect(TYP_LAPACE_LABELS.elektronicka).toBe("Elektronická");
  });
});

// ---------- TYP_ZAKROKU_LABELS ----------

describe("TYP_ZAKROKU_LABELS", () => {
  it("obsahuje všechny 4 typy", () => {
    expect(Object.keys(TYP_ZAKROKU_LABELS)).toHaveLength(4);
    expect(TYP_ZAKROKU_LABELS.postrik).toBe("Postřik");
    expect(TYP_ZAKROKU_LABELS.ulv).toBe("ULV");
    expect(TYP_ZAKROKU_LABELS.poprash).toBe("Popraš");
    expect(TYP_ZAKROKU_LABELS.gelova_nastraha).toBe("Gelová nástraha");
  });
});

// ---------- prefillDezinsBodyFromPrevious ----------

describe("prefillDezinsBodyFromPrevious", () => {
  it("vrátí prázdné pole pro prázdný vstup", () => {
    expect(prefillDezinsBodyFromPrevious([])).toEqual([]);
  });

  it("kopíruje cislo_bodu, okruh_id, typ_lapace, druh_hmyzu", () => {
    const prev = [
      {
        cislo_bodu: "D1",
        okruh_id: "okr-1",
        typ_lapace: "lezouci_hmyz" as const,
        druh_hmyzu: "Rus domácí",
        pocet: 5,
      },
    ];
    const result = prefillDezinsBodyFromPrevious(prev);
    expect(result).toHaveLength(1);
    expect(result[0].cislo_bodu).toBe("D1");
    expect(result[0].okruh_id).toBe("okr-1");
    expect(result[0].typ_lapace).toBe("lezouci_hmyz");
    expect(result[0].druh_hmyzu).toBe("Rus domácí");
  });

  it("resetuje pocet na 0", () => {
    const prev = [
      {
        cislo_bodu: "D1",
        okruh_id: null,
        typ_lapace: "letajici_hmyz" as const,
        druh_hmyzu: null,
        pocet: 12,
      },
    ];
    const result = prefillDezinsBodyFromPrevious(prev);
    expect(result[0].pocet).toBe(0);
  });

  it("nemá id na výstupu (nové body)", () => {
    const prev = [
      {
        cislo_bodu: "D1",
        okruh_id: null,
        typ_lapace: "lepova" as const,
        druh_hmyzu: null,
        pocet: 3,
      },
    ];
    const result = prefillDezinsBodyFromPrevious(prev);
    expect(result[0]).not.toHaveProperty("id");
  });
});

// ---------- mapObjektTypToTypProstoru ----------

describe("mapObjektTypToTypProstoru", () => {
  it("gastro → potravinarsky", () => {
    expect(mapObjektTypToTypProstoru("gastro")).toBe("potravinarsky");
  });

  it("sklad_zivocisna → potravinarsky", () => {
    expect(mapObjektTypToTypProstoru("sklad_zivocisna")).toBe("potravinarsky");
  });

  it("domacnost → domacnost", () => {
    expect(mapObjektTypToTypProstoru("domacnost")).toBe("domacnost");
  });

  it("ubytovna → domacnost", () => {
    expect(mapObjektTypToTypProstoru("ubytovna")).toBe("domacnost");
  });

  it("kancelar → prumysl", () => {
    expect(mapObjektTypToTypProstoru("kancelar")).toBe("prumysl");
  });

  it("vyrobni_hala → prumysl", () => {
    expect(mapObjektTypToTypProstoru("vyrobni_hala")).toBe("prumysl");
  });

  it("null → null", () => {
    expect(mapObjektTypToTypProstoru(null)).toBeNull();
  });

  it("undefined → null", () => {
    expect(mapObjektTypToTypProstoru(undefined)).toBeNull();
  });

  it("neznámý typ → null", () => {
    expect(mapObjektTypToTypProstoru("neexistujici")).toBeNull();
  });
});

// ---------- filterPripravkyForPostrik ----------

describe("filterPripravkyForPostrik", () => {
  const basePripravky: PripravekForFilter[] = [
    {
      id: "1",
      nazev: "Demand CS",
      ucinna_latka: "lambda-cyhalothrin",
      protilatka: null,
      typ: "insekticid",
      cilovy_skudce: ["Rus domácí", "Šváb obecný"],
      omezeni_prostor: ["potravinarsky", "prumysl"],
    },
    {
      id: "2",
      nazev: "Brodifacoum",
      ucinna_latka: "brodifacoum",
      protilatka: "Vitamin K1",
      typ: "rodenticid",
      cilovy_skudce: null,
      omezeni_prostor: null,
    },
    {
      id: "3",
      nazev: "Biocid X",
      ucinna_latka: "aktivní chlor",
      protilatka: null,
      typ: "biocid",
      cilovy_skudce: null,
      omezeni_prostor: null,
    },
    {
      id: "4",
      nazev: "Insekticid domácí",
      ucinna_latka: "pyrethroid",
      protilatka: null,
      typ: "insekticid",
      cilovy_skudce: ["Moucha domácí"],
      omezeni_prostor: ["domacnost"],
    },
  ];

  it("filtruje jen insekticidy a biocidy", () => {
    const result = filterPripravkyForPostrik(basePripravky);
    expect(result.map((p) => p.id)).toEqual(["1", "3", "4"]);
  });

  it("filtruje dle škůdce", () => {
    const result = filterPripravkyForPostrik(basePripravky, "Rus domácí");
    // id=1: cilovy_skudce includes "Rus domácí" → YES
    // id=3: cilovy_skudce is null → YES (no restriction)
    // id=4: cilovy_skudce = ["Moucha domácí"] → NO
    expect(result.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("filtruje dle typu objektu", () => {
    const result = filterPripravkyForPostrik(
      basePripravky,
      null,
      "domacnost",
    );
    // id=1: omezeni_prostor = ["potravinarsky", "prumysl"] → NO
    // id=3: omezeni_prostor is null → YES (no restriction)
    // id=4: omezeni_prostor = ["domacnost"] → YES
    expect(result.map((p) => p.id)).toEqual(["3", "4"]);
  });

  it("filtruje dle škůdce i typu objektu", () => {
    const result = filterPripravkyForPostrik(
      basePripravky,
      "Rus domácí",
      "gastro",
    );
    // id=1: skudce OK + omezeni_prostor includes "potravinarsky" → YES
    // id=3: skudce null→OK + omezeni_prostor null→OK → YES
    // id=4: skudce "Moucha domácí"→NO
    expect(result.map((p) => p.id)).toEqual(["1", "3"]);
  });

  it("vrátí prázdné pole pokud žádný přípravek neprojde filtrem", () => {
    const result = filterPripravkyForPostrik(
      [basePripravky[1]], // only rodenticid
    );
    expect(result).toHaveLength(0);
  });
});

// ---------- determineTrend ----------

describe("determineTrend", () => {
  it("vrátí 'stabilni' když obě hodnoty jsou 0", () => {
    expect(determineTrend(0, 0)).toBe("stabilni");
  });

  it("vrátí 'stoupajici' z nuly na kladnou hodnotu", () => {
    expect(determineTrend(25, 0)).toBe("stoupajici");
  });

  it("vrátí 'klesajici' když aktuální < předchozí", () => {
    expect(determineTrend(20, 50)).toBe("klesajici");
  });

  it("vrátí 'stoupajici' když aktuální > předchozí nad tolerancí", () => {
    expect(determineTrend(60, 50)).toBe("stoupajici");
  });

  it("vrátí 'stabilni' v rámci 5% tolerance", () => {
    // 5% z 100 = 5, diff = 4 → stabilní
    expect(determineTrend(104, 100)).toBe("stabilni");
    expect(determineTrend(96, 100)).toBe("stabilni");
  });

  it("vrátí 'stoupajici' na hranici tolerance", () => {
    // 5% z 100 = 5, diff = 6 → stoupající
    expect(determineTrend(106, 100)).toBe("stoupajici");
  });

  it("vrátí 'klesajici' na hranici tolerance", () => {
    // 5% z 100 = 5, diff = -6 → klesající
    expect(determineTrend(94, 100)).toBe("klesajici");
  });
});

// ---------- computeDeratStatistiky ----------

describe("computeDeratStatistiky", () => {
  it("vrátí null trend bez předchozích dat", () => {
    const result = computeDeratStatistiky(
      [{ pozer_procent: 25 }, { pozer_procent: 50 }],
      null,
    );
    expect(result.currentAvgPozer).toBe(37.5);
    expect(result.previousAvgPozer).toBeNull();
    expect(result.trend).toBeNull();
    expect(result.currentBodyCount).toBe(2);
    expect(result.previousBodyCount).toBeNull();
  });

  it("vrátí null trend pro prázdné předchozí body", () => {
    const result = computeDeratStatistiky(
      [{ pozer_procent: 50 }],
      [],
    );
    expect(result.previousAvgPozer).toBeNull();
    expect(result.trend).toBeNull();
  });

  it("vypočítá správné průměry a klesající trend", () => {
    const result = computeDeratStatistiky(
      [{ pozer_procent: 0 }, { pozer_procent: 25 }],
      [{ pozer_procent: 50 }, { pozer_procent: 75 }],
    );
    expect(result.currentAvgPozer).toBe(12.5);
    expect(result.previousAvgPozer).toBe(62.5);
    expect(result.trend).toBe("klesajici");
    expect(result.currentBodyCount).toBe(2);
    expect(result.previousBodyCount).toBe(2);
  });

  it("vypočítá stoupající trend", () => {
    const result = computeDeratStatistiky(
      [{ pozer_procent: 75 }],
      [{ pozer_procent: 25 }],
    );
    expect(result.trend).toBe("stoupajici");
  });

  it("zvládne prázdné aktuální body", () => {
    const result = computeDeratStatistiky(
      [],
      [{ pozer_procent: 50 }],
    );
    expect(result.currentAvgPozer).toBe(0);
    expect(result.trend).toBe("klesajici");
  });
});

// ---------- computeDezinsStatistiky ----------

describe("computeDezinsStatistiky", () => {
  it("vrátí null trend bez předchozích dat", () => {
    const result = computeDezinsStatistiky(
      [{ pocet: 5 }, { pocet: 10 }],
      null,
    );
    expect(result.currentTotalPocet).toBe(15);
    expect(result.previousTotalPocet).toBeNull();
    expect(result.trend).toBeNull();
  });

  it("vypočítá klesající trend", () => {
    const result = computeDezinsStatistiky(
      [{ pocet: 2 }, { pocet: 3 }],
      [{ pocet: 10 }, { pocet: 15 }],
    );
    expect(result.currentTotalPocet).toBe(5);
    expect(result.previousTotalPocet).toBe(25);
    expect(result.trend).toBe("klesajici");
  });

  it("vypočítá stoupající trend", () => {
    const result = computeDezinsStatistiky(
      [{ pocet: 20 }],
      [{ pocet: 5 }],
    );
    expect(result.trend).toBe("stoupajici");
  });

  it("zvládne nulové počty na obou stranách", () => {
    const result = computeDezinsStatistiky(
      [{ pocet: 0 }],
      [{ pocet: 0 }],
    );
    expect(result.currentTotalPocet).toBe(0);
    expect(result.previousTotalPocet).toBe(0);
    expect(result.trend).toBe("stabilni");
  });
});

// ---------- TREND_LABELS, TREND_ICONS, TREND_COLORS ----------

describe("TREND constants", () => {
  it("TREND_LABELS má 3 směry", () => {
    expect(Object.keys(TREND_LABELS)).toHaveLength(3);
    expect(TREND_LABELS.klesajici).toBe("Klesající");
    expect(TREND_LABELS.stoupajici).toBe("Stoupající");
    expect(TREND_LABELS.stabilni).toBe("Stabilní");
  });

  it("TREND_ICONS má šipky pro každý směr", () => {
    expect(TREND_ICONS.klesajici).toBe("↓");
    expect(TREND_ICONS.stoupajici).toBe("↑");
    expect(TREND_ICONS.stabilni).toBe("→");
  });

  it("TREND_COLORS má barvy pro každý směr", () => {
    for (const key of Object.keys(TREND_COLORS)) {
      expect(TREND_COLORS[key as keyof typeof TREND_COLORS].bg).toBeTruthy();
      expect(TREND_COLORS[key as keyof typeof TREND_COLORS].text).toBeTruthy();
    }
  });
});
