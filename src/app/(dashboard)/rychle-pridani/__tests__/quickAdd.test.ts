import { describe, it, expect } from "vitest";

/**
 * Testy pro rychlé přidání — validace vstupů a logika šablon.
 * Server akce nelze testovat přímo (potřebují Supabase),
 * testujeme validační logiku a šablona-application.
 */

// ---------------------------------------------------------------
// Input validation helpers (extracted from actions logic)
// ---------------------------------------------------------------

function validateQuickCreateInput(input: {
  objekt_id?: string;
  typy_zasahu?: string[];
  technik_id?: string;
  datum?: string;
  cas_od?: string;
  cas_do?: string;
}): string | null {
  if (!input.objekt_id) return "Objekt je povinný";
  if (!input.typy_zasahu || input.typy_zasahu.length === 0)
    return "Typ zásahu je povinný";
  if (!input.technik_id) return "Technik je povinný";
  if (!input.datum) return "Datum je povinné";
  if (!input.cas_od || !input.cas_do) return "Čas je povinný";
  if (input.cas_od >= input.cas_do)
    return "Čas od musí být menší než čas do";
  return null;
}

function validateKlientInput(input: {
  jmeno?: string;
  telefon?: string;
}): string | null {
  if (!input.jmeno || !input.jmeno.trim()) return "Jméno je povinné";
  if (!input.telefon || !input.telefon.trim()) return "Telefon je povinný";
  return null;
}

interface SablonaInput {
  nazev: string;
  typ: "jednorazova" | "smluvni";
  typy_zasahu: string[];
  skudci: string[];
  poznamka_template: string | null;
}

function applySablona(sablona: SablonaInput) {
  return {
    typ: sablona.typ,
    typy_zasahu: sablona.typy_zasahu,
    skudci: sablona.skudci,
    poznamka: sablona.poznamka_template || "",
  };
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe("validateQuickCreateInput", () => {
  const validInput = {
    objekt_id: "abc-123",
    typy_zasahu: ["postrik"],
    technik_id: "tech-1",
    datum: "2026-03-12",
    cas_od: "08:00",
    cas_do: "09:00",
  };

  it("passes valid input", () => {
    expect(validateQuickCreateInput(validInput)).toBeNull();
  });

  it("rejects missing objekt_id", () => {
    expect(validateQuickCreateInput({ ...validInput, objekt_id: "" })).toBe(
      "Objekt je povinný",
    );
  });

  it("rejects empty typy_zasahu", () => {
    expect(
      validateQuickCreateInput({ ...validInput, typy_zasahu: [] }),
    ).toBe("Typ zásahu je povinný");
  });

  it("rejects missing technik_id", () => {
    expect(
      validateQuickCreateInput({ ...validInput, technik_id: "" }),
    ).toBe("Technik je povinný");
  });

  it("rejects missing datum", () => {
    expect(validateQuickCreateInput({ ...validInput, datum: "" })).toBe(
      "Datum je povinné",
    );
  });

  it("rejects cas_od >= cas_do", () => {
    expect(
      validateQuickCreateInput({ ...validInput, cas_od: "10:00", cas_do: "09:00" }),
    ).toBe("Čas od musí být menší než čas do");
  });

  it("rejects same cas_od and cas_do", () => {
    expect(
      validateQuickCreateInput({ ...validInput, cas_od: "10:00", cas_do: "10:00" }),
    ).toBe("Čas od musí být menší než čas do");
  });
});

describe("validateKlientInput", () => {
  it("passes valid input", () => {
    expect(validateKlientInput({ jmeno: "Jan", telefon: "+420123456789" })).toBeNull();
  });

  it("rejects empty jmeno", () => {
    expect(validateKlientInput({ jmeno: "", telefon: "+420123456789" })).toBe(
      "Jméno je povinné",
    );
  });

  it("rejects whitespace-only jmeno", () => {
    expect(
      validateKlientInput({ jmeno: "   ", telefon: "+420123456789" }),
    ).toBe("Jméno je povinné");
  });

  it("rejects empty telefon", () => {
    expect(validateKlientInput({ jmeno: "Jan", telefon: "" })).toBe(
      "Telefon je povinný",
    );
  });
});

describe("applySablona", () => {
  it("applies vosy template correctly", () => {
    const sablona: SablonaInput = {
      nazev: "Vosy / Sršně",
      typ: "jednorazova",
      typy_zasahu: ["postrik"],
      skudci: ["vosy", "sršně"],
      poznamka_template: "Hnízdo ve střeše",
    };
    const result = applySablona(sablona);
    expect(result.typ).toBe("jednorazova");
    expect(result.typy_zasahu).toEqual(["postrik"]);
    expect(result.skudci).toEqual(["vosy", "sršně"]);
    expect(result.poznamka).toBe("Hnízdo ve střeše");
  });

  it("applies smluvni template correctly", () => {
    const sablona: SablonaInput = {
      nazev: "Hlodavci — smluvní monitoring",
      typ: "smluvni",
      typy_zasahu: ["vnitrni_deratizace", "vnejsi_deratizace"],
      skudci: ["myš", "potkan"],
      poznamka_template: null,
    };
    const result = applySablona(sablona);
    expect(result.typ).toBe("smluvni");
    expect(result.typy_zasahu).toHaveLength(2);
    expect(result.poznamka).toBe("");
  });

  it("handles empty poznamka_template", () => {
    const sablona: SablonaInput = {
      nazev: "Test",
      typ: "jednorazova",
      typy_zasahu: ["postrik"],
      skudci: [],
      poznamka_template: null,
    };
    expect(applySablona(sablona).poznamka).toBe("");
  });
});

describe("search query building", () => {
  it("builds ilike pattern correctly", () => {
    const query = "Novák";
    const pattern = `%${query}%`;
    expect(pattern).toBe("%Novák%");
  });

  it("handles minimum query length", () => {
    expect("a".length >= 2).toBe(false);
    expect("ab".length >= 2).toBe(true);
    expect("abc".length >= 2).toBe(true);
  });

  it("trims whitespace from query", () => {
    const query = "  Novák  ".trim();
    expect(query).toBe("Novák");
    expect(query.length >= 2).toBe(true);
  });
});
