import { describe, it, expect } from "vitest";
import { buildDezinsekniPdfData } from "../dezinsekniProtokol";
import type { DezinsekniProtokolPdfData } from "../dezinsekniProtokol";

const BASE_PARAMS = {
  protokol: {
    cislo_protokolu: "P-TST001-001",
    poznamka: "Testovací poznámka",
    veta_ucinnosti: "Účinnost zásahu byla vyhodnocena jako dostatečná.",
    zodpovedny_technik: "Pavel Horák",
  },
  zasah: {
    datum: "2026-03-15",
  },
  klient: {
    nazev: "Alfa s.r.o.",
    jmeno: null,
    prijmeni: null,
    ico: "12345678",
    dic: "CZ12345678",
    adresa: "Praha 1, Hlavní 1",
    email: "alfa@test.cz",
    telefon: "777111222",
  },
  objekt: {
    nazev: "Provozovna Praha",
    adresa: "Hlavní 1, Praha",
  },
  postriky: [
    {
      skudce: "Šváb obecný",
      plocha_m2: 120,
      typ_zakroku: "postrik",
      poznamka: "Kuchyně + sklad",
      pripravky: [
        {
          nazev: "Cyperkill 25 EC",
          ucinna_latka: "cypermethrin",
          protilatka: "Atropin",
          spotreba: "2 litry",
          koncentrace_procent: 0.05,
        },
      ],
    },
  ],
  bezpecnostniListy: ["Bezpečnostní list: Cyperkill 25 EC"],
  dalsiZasah: { od: "15. 4. 2026", do: "30. 4. 2026" },
};

// ============================================================
// buildDezinsekniPdfData — basic mapping
// ============================================================

describe("buildDezinsekniPdfData", () => {
  it("builds correct PDF data from params", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);

    expect(result.cislo_protokolu).toBe("P-TST001-001");
    expect(result.zodpovedny_technik).toBe("Pavel Horák");
    expect(result.klient.nazev).toBe("Alfa s.r.o.");
    expect(result.klient.ico).toBe("12345678");
    expect(result.klient.dic).toBe("CZ12345678");
    expect(result.objekt.nazev).toBe("Provozovna Praha");
    expect(result.poznamka).toBe("Testovací poznámka");
    expect(result.veta_ucinnosti).toBe(
      "Účinnost zásahu byla vyhodnocena jako dostatečná.",
    );
  });

  it("formats date in Czech locale", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    // Should contain "15" and "2026" and a Czech month name
    expect(result.datum_provedeni).toContain("15");
    expect(result.datum_provedeni).toContain("2026");
  });

  it("uses klient.nazev for firma", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    expect(result.klient.nazev).toBe("Alfa s.r.o.");
  });

  it("falls back to prijmeni+jmeno for fyzická osoba", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        ...BASE_PARAMS.klient,
        nazev: null,
        jmeno: "Jan",
        prijmeni: "Novák",
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.klient.nazev).toBe("Novák Jan");
  });

  it("uses DRAFT when no cislo_protokolu", () => {
    const params = {
      ...BASE_PARAMS,
      protokol: { ...BASE_PARAMS.protokol, cislo_protokolu: null },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.cislo_protokolu).toBe("DRAFT");
  });

  it("defaults zodpovedny_technik to Pavel Horák", () => {
    const params = {
      ...BASE_PARAMS,
      protokol: { ...BASE_PARAMS.protokol, zodpovedny_technik: null },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.zodpovedny_technik).toBe("Pavel Horák");
  });

  it("maps postrik data correctly", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);

    expect(result.postriky).toHaveLength(1);
    expect(result.postriky[0].skudce).toBe("Šváb obecný");
    expect(result.postriky[0].plocha_m2).toBe(120);
    expect(result.postriky[0].typ_zakroku).toBe("postrik");
    expect(result.postriky[0].pripravky).toHaveLength(1);
    expect(result.postriky[0].pripravky[0].nazev).toBe("Cyperkill 25 EC");
    expect(result.postriky[0].pripravky[0].ucinna_latka).toBe("cypermethrin");
    expect(result.postriky[0].pripravky[0].protilatka).toBe("Atropin");
    expect(result.postriky[0].pripravky[0].spotreba).toBe("2 litry");
    expect(result.postriky[0].pripravky[0].koncentrace_procent).toBe(0.05);
  });

  it("maps dalsi zasah dates", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    expect(result.dalsi_zasah_od).toBe("15. 4. 2026");
    expect(result.dalsi_zasah_do).toBe("30. 4. 2026");
  });

  it("handles null dalsi zasah", () => {
    const params = { ...BASE_PARAMS, dalsiZasah: null };
    const result = buildDezinsekniPdfData(params);
    expect(result.dalsi_zasah_od).toBeNull();
    expect(result.dalsi_zasah_do).toBeNull();
  });

  it("maps bezpecnostni listy", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    expect(result.bezpecnostni_listy).toEqual([
      "Bezpečnostní list: Cyperkill 25 EC",
    ]);
  });

  it("handles multiple postriky", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [
        ...BASE_PARAMS.postriky,
        {
          skudce: "Rus domácí",
          plocha_m2: 80,
          typ_zakroku: "gelova_nastraha",
          poznamka: null,
          pripravky: [
            {
              nazev: "Goliath Gel",
              ucinna_latka: "fipronil",
              protilatka: null,
              spotreba: "1 tuba",
              koncentrace_procent: null,
            },
          ],
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.postriky).toHaveLength(2);
    expect(result.postriky[1].skudce).toBe("Rus domácí");
    expect(result.postriky[1].typ_zakroku).toBe("gelova_nastraha");
  });

  it("handles empty postriky", () => {
    const params = { ...BASE_PARAMS, postriky: [] };
    const result = buildDezinsekniPdfData(params);
    expect(result.postriky).toEqual([]);
  });

  it("handles missing datum", () => {
    const params = {
      ...BASE_PARAMS,
      zasah: { datum: null },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.datum_provedeni).toBe("—");
  });

  // ---------- Deratizační body ----------

  it("maps deratBody correctly", () => {
    const params = {
      ...BASE_PARAMS,
      deratBody: [
        {
          cislo_bodu: "L1",
          typ_stanicky: "mys",
          pozer_procent: 25,
          stav_stanicky: "ok",
          pripravek_nazev: "Brodifacoum",
          okruh_nazev: "Kuchyně",
        },
        {
          cislo_bodu: "L2",
          typ_stanicky: "potkan",
          pozer_procent: 0,
          stav_stanicky: "zavedena",
          pripravek_nazev: null,
          okruh_nazev: null,
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.deratBody).toHaveLength(2);
    expect(result.deratBody[0].cislo_bodu).toBe("L1");
    expect(result.deratBody[0].typ_stanicky).toBe("mys");
    expect(result.deratBody[0].pozer_procent).toBe(25);
    expect(result.deratBody[0].stav_stanicky).toBe("ok");
    expect(result.deratBody[0].pripravek_nazev).toBe("Brodifacoum");
    expect(result.deratBody[0].okruh_nazev).toBe("Kuchyně");
    expect(result.deratBody[1].pripravek_nazev).toBeNull();
    expect(result.deratBody[1].okruh_nazev).toBeNull();
  });

  it("defaults deratBody to empty array when undefined", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    expect(result.deratBody).toEqual([]);
  });

  it("handles empty deratBody array", () => {
    const params = { ...BASE_PARAMS, deratBody: [] };
    const result = buildDezinsekniPdfData(params);
    expect(result.deratBody).toEqual([]);
  });

  it("maps deratBody with all požer values", () => {
    const params = {
      ...BASE_PARAMS,
      deratBody: [0, 25, 50, 75, 100].map((pozer, i) => ({
        cislo_bodu: `B${i + 1}`,
        typ_stanicky: "mys",
        pozer_procent: pozer,
        stav_stanicky: "ok",
        pripravek_nazev: null,
        okruh_nazev: null,
      })),
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.deratBody).toHaveLength(5);
    expect(result.deratBody.map((b) => b.pozer_procent)).toEqual([
      0, 25, 50, 75, 100,
    ]);
  });

  it("maps deratBody with all typ_stanicky values", () => {
    const typy = [
      "mys",
      "potkan",
      "zivolovna",
      "sklopna_mys",
      "sklopna_potkan",
    ];
    const params = {
      ...BASE_PARAMS,
      deratBody: typy.map((typ, i) => ({
        cislo_bodu: `T${i + 1}`,
        typ_stanicky: typ,
        pozer_procent: 0,
        stav_stanicky: "ok",
        pripravek_nazev: null,
        okruh_nazev: null,
      })),
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.deratBody).toHaveLength(5);
    expect(result.deratBody.map((b) => b.typ_stanicky)).toEqual(typy);
  });

  it("maps deratBody with all stav_stanicky values", () => {
    const stavy = [
      "ok",
      "zavedena",
      "odcizena",
      "znovu_zavedena",
      "poskozena",
    ];
    const params = {
      ...BASE_PARAMS,
      deratBody: stavy.map((stav, i) => ({
        cislo_bodu: `S${i + 1}`,
        typ_stanicky: "mys",
        pozer_procent: 0,
        stav_stanicky: stav,
        pripravek_nazev: null,
        okruh_nazev: null,
      })),
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.deratBody).toHaveLength(5);
    expect(result.deratBody.map((b) => b.stav_stanicky)).toEqual(stavy);
  });

  // ---------- Dezinsekční body ----------

  it("maps dezinsBody correctly", () => {
    const params = {
      ...BASE_PARAMS,
      dezinsBody: [
        {
          cislo_bodu: "D1",
          typ_lapace: "lezouci_hmyz",
          druh_hmyzu: "Šváb obecný",
          pocet: 3,
          okruh_nazev: "Kuchyně",
        },
        {
          cislo_bodu: "D2",
          typ_lapace: "letajici_hmyz",
          druh_hmyzu: null,
          pocet: 1,
          okruh_nazev: null,
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.dezinsBody).toHaveLength(2);
    expect(result.dezinsBody[0].cislo_bodu).toBe("D1");
    expect(result.dezinsBody[0].typ_lapace).toBe("lezouci_hmyz");
    expect(result.dezinsBody[0].druh_hmyzu).toBe("Šváb obecný");
    expect(result.dezinsBody[0].pocet).toBe(3);
    expect(result.dezinsBody[0].okruh_nazev).toBe("Kuchyně");
    expect(result.dezinsBody[1].druh_hmyzu).toBeNull();
    expect(result.dezinsBody[1].okruh_nazev).toBeNull();
  });

  it("defaults dezinsBody to empty array when undefined", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    expect(result.dezinsBody).toEqual([]);
  });

  it("handles empty dezinsBody array", () => {
    const params = { ...BASE_PARAMS, dezinsBody: [] };
    const result = buildDezinsekniPdfData(params);
    expect(result.dezinsBody).toEqual([]);
  });

  it("maps dezinsBody with all typ_lapace values", () => {
    const typy = ["lezouci_hmyz", "letajici_hmyz", "lepova", "elektronicka"];
    const params = {
      ...BASE_PARAMS,
      dezinsBody: typy.map((typ, i) => ({
        cislo_bodu: `D${i + 1}`,
        typ_lapace: typ,
        druh_hmyzu: null,
        pocet: i + 1,
        okruh_nazev: null,
      })),
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.dezinsBody).toHaveLength(4);
    expect(result.dezinsBody.map((b) => b.typ_lapace)).toEqual(typy);
  });

  // ---------- Protocol composition (title logic) ----------

  it("derat-only: deratBody set, postriky+dezinsBody empty", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [],
      deratBody: [
        {
          cislo_bodu: "L1",
          typ_stanicky: "mys",
          pozer_procent: 25,
          stav_stanicky: "ok",
          pripravek_nazev: "Brodifacoum",
          okruh_nazev: null,
        },
      ],
      dezinsBody: [],
    };
    const result = buildDezinsekniPdfData(params);

    // Title should be DERATIZAČNÍ
    expect(result.deratBody.length).toBeGreaterThan(0);
    expect(result.postriky).toHaveLength(0);
    expect(result.dezinsBody).toHaveLength(0);
  });

  it("postrik-only: postriky set, deratBody+dezinsBody empty", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);
    // BASE_PARAMS has postriky but no deratBody/dezinsBody
    expect(result.postriky.length).toBeGreaterThan(0);
    expect(result.deratBody).toHaveLength(0);
    expect(result.dezinsBody).toHaveLength(0);
  });

  it("dezins-only: dezinsBody set, postriky+deratBody empty", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [],
      dezinsBody: [
        {
          cislo_bodu: "D1",
          typ_lapace: "lezouci_hmyz",
          druh_hmyzu: "Šváb obecný",
          pocet: 3,
          okruh_nazev: null,
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.postriky).toHaveLength(0);
    expect(result.deratBody).toHaveLength(0);
    expect(result.dezinsBody.length).toBeGreaterThan(0);
  });

  it("combined: all three types populated", () => {
    const params = {
      ...BASE_PARAMS,
      deratBody: [
        {
          cislo_bodu: "L1",
          typ_stanicky: "mys",
          pozer_procent: 0,
          stav_stanicky: "ok",
          pripravek_nazev: null,
          okruh_nazev: null,
        },
      ],
      dezinsBody: [
        {
          cislo_bodu: "D1",
          typ_lapace: "lepova",
          druh_hmyzu: null,
          pocet: 2,
          okruh_nazev: null,
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);

    expect(result.postriky.length).toBeGreaterThan(0);
    expect(result.deratBody.length).toBeGreaterThan(0);
    expect(result.dezinsBody.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Edge cases — klient name fallback
// ============================================================

describe("buildDezinsekniPdfData — klient name edge cases", () => {
  it("falls back to '—' when nazev, jmeno, prijmeni are all null", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        ...BASE_PARAMS.klient,
        nazev: null,
        jmeno: null,
        prijmeni: null,
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.klient.nazev).toBe("—");
  });

  it("uses only prijmeni when jmeno is null", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        ...BASE_PARAMS.klient,
        nazev: null,
        jmeno: null,
        prijmeni: "Dvořák",
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.klient.nazev).toBe("Dvořák");
  });

  it("uses only jmeno when prijmeni is null", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        ...BASE_PARAMS.klient,
        nazev: null,
        jmeno: "Marie",
        prijmeni: null,
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.klient.nazev).toBe("Marie");
  });

  it("prefers nazev over jmeno+prijmeni", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        ...BASE_PARAMS.klient,
        nazev: "Firma XYZ",
        jmeno: "Jan",
        prijmeni: "Novák",
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.klient.nazev).toBe("Firma XYZ");
  });

  it("handles empty string nazev — falls back to jmeno+prijmeni", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        ...BASE_PARAMS.klient,
        nazev: "",
        jmeno: "Petr",
        prijmeni: "Černý",
      },
    };
    const result = buildDezinsekniPdfData(params);
    // Empty string is falsy, should fall back
    expect(result.klient.nazev).toBe("Černý Petr");
  });
});

// ============================================================
// Edge cases — null/optional fields
// ============================================================

describe("buildDezinsekniPdfData — null field handling", () => {
  it("passes through null klient fields", () => {
    const params = {
      ...BASE_PARAMS,
      klient: {
        nazev: "Test",
        jmeno: null,
        prijmeni: null,
        ico: null,
        dic: null,
        adresa: null,
        email: null,
        telefon: null,
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.klient.ico).toBeNull();
    expect(result.klient.dic).toBeNull();
    expect(result.klient.adresa).toBeNull();
    expect(result.klient.email).toBeNull();
    expect(result.klient.telefon).toBeNull();
  });

  it("handles null objekt fields", () => {
    const params = {
      ...BASE_PARAMS,
      objekt: { nazev: null, adresa: null },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.objekt.nazev).toBe("");
    expect(result.objekt.adresa).toBeNull();
  });

  it("handles null poznamka and veta_ucinnosti", () => {
    const params = {
      ...BASE_PARAMS,
      protokol: {
        ...BASE_PARAMS.protokol,
        poznamka: null,
        veta_ucinnosti: null,
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.poznamka).toBeNull();
    expect(result.veta_ucinnosti).toBeNull();
  });

  it("handles empty bezpecnostniListy array", () => {
    const params = { ...BASE_PARAMS, bezpecnostniListy: [] };
    const result = buildDezinsekniPdfData(params);
    expect(result.bezpecnostni_listy).toEqual([]);
  });

  it("handles dalsiZasah with only od", () => {
    const params = {
      ...BASE_PARAMS,
      dalsiZasah: { od: "1. 5. 2026", do: null },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.dalsi_zasah_od).toBe("1. 5. 2026");
    expect(result.dalsi_zasah_do).toBeNull();
  });

  it("handles dalsiZasah with only do", () => {
    const params = {
      ...BASE_PARAMS,
      dalsiZasah: { od: null, do: "15. 5. 2026" },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.dalsi_zasah_od).toBeNull();
    expect(result.dalsi_zasah_do).toBe("15. 5. 2026");
  });
});

// ============================================================
// Edge cases — postrik pripravky
// ============================================================

describe("buildDezinsekniPdfData — postrik edge cases", () => {
  it("handles postrik with no pripravky", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [
        {
          skudce: "Štěnice",
          plocha_m2: 50,
          typ_zakroku: "postrik",
          poznamka: null,
          pripravky: [],
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.postriky[0].pripravky).toEqual([]);
  });

  it("handles postrik with multiple pripravky", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [
        {
          skudce: "Šváb",
          plocha_m2: 100,
          typ_zakroku: "postrik",
          poznamka: null,
          pripravky: [
            {
              nazev: "Přípravek A",
              ucinna_latka: "Látka A",
              protilatka: null,
              spotreba: "1 l",
              koncentrace_procent: 5,
            },
            {
              nazev: "Přípravek B",
              ucinna_latka: null,
              protilatka: "Protilátka B",
              spotreba: null,
              koncentrace_procent: null,
            },
          ],
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.postriky[0].pripravky).toHaveLength(2);
    expect(result.postriky[0].pripravky[0].nazev).toBe("Přípravek A");
    expect(result.postriky[0].pripravky[1].nazev).toBe("Přípravek B");
    expect(result.postriky[0].pripravky[1].ucinna_latka).toBeNull();
    expect(result.postriky[0].pripravky[1].spotreba).toBeNull();
    expect(result.postriky[0].pripravky[1].koncentrace_procent).toBeNull();
  });

  it("handles postrik with null skudce and plocha", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [
        {
          skudce: null,
          plocha_m2: null,
          typ_zakroku: null,
          poznamka: null,
          pripravky: [],
        },
      ],
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.postriky[0].skudce).toBeNull();
    expect(result.postriky[0].plocha_m2).toBeNull();
    expect(result.postriky[0].typ_zakroku).toBeNull();
  });

  it("handles postrik with all typ_zakroku variants", () => {
    const zakroky = ["postrik", "ulv", "poprash", "gelova_nastraha"];
    const params = {
      ...BASE_PARAMS,
      postriky: zakroky.map((z) => ({
        skudce: "Test",
        plocha_m2: 10,
        typ_zakroku: z,
        poznamka: null,
        pripravky: [],
      })),
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.postriky).toHaveLength(4);
    expect(result.postriky.map((p) => p.typ_zakroku)).toEqual(zakroky);
  });
});

// ============================================================
// Edge cases — large data sets
// ============================================================

describe("buildDezinsekniPdfData — large data sets", () => {
  it("handles 120 deratBody items (full grid)", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [],
      deratBody: Array.from({ length: 120 }, (_, i) => ({
        cislo_bodu: `B${i + 1}`,
        typ_stanicky: i % 2 === 0 ? "mys" : "potkan",
        pozer_procent: (i * 25) % 125, // cycles through 0, 25, 50, 75, 100
        stav_stanicky: "ok",
        pripravek_nazev: i < 60 ? "Brodifacoum" : null,
        okruh_nazev: `Okruh ${Math.floor(i / 20) + 1}`,
      })),
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.deratBody).toHaveLength(120);
    expect(result.deratBody[0].cislo_bodu).toBe("B1");
    expect(result.deratBody[119].cislo_bodu).toBe("B120");
  });

  it("handles many dezinsBody items", () => {
    const params = {
      ...BASE_PARAMS,
      postriky: [],
      dezinsBody: Array.from({ length: 50 }, (_, i) => ({
        cislo_bodu: `D${i + 1}`,
        typ_lapace: ["lezouci_hmyz", "letajici_hmyz", "lepova", "elektronicka"][i % 4],
        druh_hmyzu: i % 3 === 0 ? "Šváb obecný" : null,
        pocet: i + 1,
        okruh_nazev: null,
      })),
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.dezinsBody).toHaveLength(50);
  });

  it("handles many bezpecnostniListy", () => {
    const bls = Array.from({ length: 10 }, (_, i) => `BL: Přípravek ${i + 1}`);
    const params = { ...BASE_PARAMS, bezpecnostniListy: bls };
    const result = buildDezinsekniPdfData(params);
    expect(result.bezpecnostni_listy).toHaveLength(10);
  });
});

// ============================================================
// Edge cases — special characters (Czech diacritics)
// ============================================================

describe("buildDezinsekniPdfData — Czech diacritics", () => {
  it("preserves háčky and čárky in all text fields", () => {
    const params = {
      ...BASE_PARAMS,
      protokol: {
        cislo_protokolu: "P-ŘÍŽ001-001",
        poznamka: "Zvýšený výskyt škůdců — ploštice, švábi, řízky",
        veta_ucinnosti: "Účinnost žádoucí, průběžně sledováno",
        zodpovedny_technik: "Jiří Průšvihlář",
      },
      klient: {
        nazev: "Dvořákův štukatérský ústav s.r.o.",
        jmeno: null,
        prijmeni: null,
        ico: "99999999",
        dic: "CZ99999999",
        adresa: "Říčanská 42, Žďár nad Sázavou",
        email: "info@štukatér.cz",
        telefon: "777000111",
      },
    };
    const result = buildDezinsekniPdfData(params);
    expect(result.cislo_protokolu).toBe("P-ŘÍŽ001-001");
    expect(result.poznamka).toContain("škůdců");
    expect(result.klient.nazev).toContain("Dvořákův");
    expect(result.klient.adresa).toContain("Žďár");
    expect(result.zodpovedny_technik).toContain("Průšvihlář");
  });
});

// ============================================================
// Output shape — DezinsekniProtokolPdfData interface conformance
// ============================================================

describe("buildDezinsekniPdfData — output shape", () => {
  it("returns all required fields of DezinsekniProtokolPdfData", () => {
    const result = buildDezinsekniPdfData(BASE_PARAMS);

    // Check every field exists with correct type
    expect(typeof result.cislo_protokolu).toBe("string");
    expect(typeof result.datum_provedeni).toBe("string");
    expect(typeof result.zodpovedny_technik).toBe("string");

    // Klient
    expect(typeof result.klient.nazev).toBe("string");
    expect(result.klient).toHaveProperty("ico");
    expect(result.klient).toHaveProperty("dic");
    expect(result.klient).toHaveProperty("adresa");
    expect(result.klient).toHaveProperty("email");
    expect(result.klient).toHaveProperty("telefon");

    // Objekt
    expect(typeof result.objekt.nazev).toBe("string");
    expect(result.objekt).toHaveProperty("adresa");

    // Arrays
    expect(Array.isArray(result.postriky)).toBe(true);
    expect(Array.isArray(result.deratBody)).toBe(true);
    expect(Array.isArray(result.dezinsBody)).toBe(true);
    expect(Array.isArray(result.bezpecnostni_listy)).toBe(true);

    // Nullable fields
    expect(result).toHaveProperty("poznamka");
    expect(result).toHaveProperty("veta_ucinnosti");
    expect(result).toHaveProperty("dalsi_zasah_od");
    expect(result).toHaveProperty("dalsi_zasah_do");
  });

  it("satisfies DezinsekniProtokolPdfData type", () => {
    const result: DezinsekniProtokolPdfData = buildDezinsekniPdfData(BASE_PARAMS);
    // If this compiles, the type is correct
    expect(result).toBeDefined();
  });
});

// ============================================================
// Protocol composition — all 8 combinations for title logic
// ============================================================

describe("buildDezinsekniPdfData — all 8 composition combos", () => {
  const makeDeratBody = () => [{
    cislo_bodu: "L1", typ_stanicky: "mys", pozer_procent: 0,
    stav_stanicky: "ok", pripravek_nazev: null, okruh_nazev: null,
  }];
  const makeDezinsBody = () => [{
    cislo_bodu: "D1", typ_lapace: "lepova",
    druh_hmyzu: null, pocet: 1, okruh_nazev: null,
  }];
  const makePostrik = () => [{
    skudce: "Test", plocha_m2: 10, typ_zakroku: "postrik",
    poznamka: null, pripravky: [],
  }];

  // combo: [hasPostrik, hasDeratBody, hasDezinsBody]
  const combos: [boolean, boolean, boolean, string][] = [
    [false, false, false, "all-empty"],
    [true, false, false, "postrik-only"],
    [false, true, false, "derat-only"],
    [false, false, true, "dezins-only"],
    [true, true, false, "postrik+derat"],
    [true, false, true, "postrik+dezins"],
    [false, true, true, "derat+dezins"],
    [true, true, true, "all-three"],
  ];

  combos.forEach(([hasP, hasD, hasDz, label]) => {
    it(`combo: ${label}`, () => {
      const params = {
        ...BASE_PARAMS,
        postriky: hasP ? makePostrik() : [],
        deratBody: hasD ? makeDeratBody() : undefined,
        dezinsBody: hasDz ? makeDezinsBody() : undefined,
      };
      const result = buildDezinsekniPdfData(params);

      expect(result.postriky.length > 0).toBe(hasP);
      expect(result.deratBody.length > 0).toBe(hasD);
      expect(result.dezinsBody.length > 0).toBe(hasDz);
    });
  });
});
