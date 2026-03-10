import { describe, it, expect } from "vitest";
import {
  prumernyPozer,
  prefillBodyFromPrevious,
  getNextCisloBodu,
  validateBod,
  TYP_STANICKY_LABELS,
  STAV_STANICKY_LABELS,
  POZER_OPTIONS,
  POZER_COLORS,
} from "../protokolUtils";

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
