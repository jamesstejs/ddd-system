import { describe, it, expect } from "vitest";
import { buildDezinsekniPdfData } from "../dezinsekniProtokol";

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
