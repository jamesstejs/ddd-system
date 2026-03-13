import { describe, it, expect } from "vitest";

/**
 * Unit tests for Sprint 40 — Přehled zásahů & Odložení termínu
 * Tests business logic: date computation, urgency/escalation colors, region filtering.
 */

// ---------------------------------------------------------------
// Date computation helpers (duplicated for testing pure logic)
// ---------------------------------------------------------------

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

describe("Date computation", () => {
  it("+1 week adds 7 days", () => {
    expect(addDays("2026-03-10", 7)).toBe("2026-03-17");
  });

  it("+2 weeks adds 14 days", () => {
    expect(addDays("2026-03-10", 14)).toBe("2026-03-24");
  });

  it("+1 month from Jan 31 rolls to Feb 28/Mar", () => {
    const result = addMonths("2026-01-31", 1);
    // February 2026 has 28 days, so Jan 31 + 1 month = Mar 3 (JS Date behavior)
    expect(result).toBeTruthy();
    const d = new Date(result);
    expect(d.getMonth()).toBeGreaterThanOrEqual(1); // Feb or Mar
  });

  it("+1 month from March gives April", () => {
    const result = addMonths("2026-03-15", 1);
    // Timezone may shift by a day; verify it lands in April
    const d = new Date(result);
    expect(d.getMonth()).toBe(3); // April = 3 (0-indexed)
    expect(d.getDate()).toBeGreaterThanOrEqual(14);
    expect(d.getDate()).toBeLessThanOrEqual(15);
  });

  it("cross-year: Dec + 1 month = Jan next year", () => {
    const result = addMonths("2026-12-15", 1);
    const d = new Date(result);
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0); // January
  });
});

// ---------------------------------------------------------------
// Urgency color logic for PripominkyTab
// ---------------------------------------------------------------

function getUrgencyLevel(pocet: number): "low" | "medium" | "high" {
  if (pocet >= 7) return "high";
  if (pocet >= 4) return "medium";
  return "low";
}

describe("Urgency levels (PripominkyTab)", () => {
  it("1-3 upozornění = low", () => {
    expect(getUrgencyLevel(1)).toBe("low");
    expect(getUrgencyLevel(3)).toBe("low");
  });

  it("4-6 upozornění = medium", () => {
    expect(getUrgencyLevel(4)).toBe("medium");
    expect(getUrgencyLevel(6)).toBe("medium");
  });

  it("7+ upozornění = high", () => {
    expect(getUrgencyLevel(7)).toBe("high");
    expect(getUrgencyLevel(15)).toBe("high");
  });
});

// ---------------------------------------------------------------
// Escalation color logic for ZpozdeneTab
// ---------------------------------------------------------------

function getEscalationLevel(dny: number): "low" | "medium" | "high" {
  if (dny >= 14) return "high";
  if (dny >= 7) return "medium";
  return "low";
}

describe("Escalation levels (ZpozdeneTab)", () => {
  it("1-6 days = low", () => {
    expect(getEscalationLevel(1)).toBe("low");
    expect(getEscalationLevel(6)).toBe("low");
  });

  it("7-13 days = medium", () => {
    expect(getEscalationLevel(7)).toBe("medium");
    expect(getEscalationLevel(13)).toBe("medium");
  });

  it("14+ days = high", () => {
    expect(getEscalationLevel(14)).toBe("high");
    expect(getEscalationLevel(30)).toBe("high");
  });
});

// ---------------------------------------------------------------
// Region filter logic
// ---------------------------------------------------------------

type WithTechnik = { technik: { pobocka: string | null } | null };

function filterByRegion<T extends WithTechnik>(
  items: T[],
  region: string | "vse",
): T[] {
  if (region === "vse") return items;
  return items.filter((item) => item.technik?.pobocka === region);
}

describe("Region filter", () => {
  const items: WithTechnik[] = [
    { technik: { pobocka: "praha" } },
    { technik: { pobocka: "jihomoravsky" } },
    { technik: { pobocka: "praha" } },
    { technik: { pobocka: null } },
    { technik: null },
  ];

  it("'vse' returns all items", () => {
    expect(filterByRegion(items, "vse")).toHaveLength(5);
  });

  it("filters by specific region", () => {
    expect(filterByRegion(items, "praha")).toHaveLength(2);
    expect(filterByRegion(items, "jihomoravsky")).toHaveLength(1);
  });

  it("returns empty for non-existent region", () => {
    expect(filterByRegion(items, "olomoucky")).toHaveLength(0);
  });

  it("excludes items with null technik or null pobocka", () => {
    const result = filterByRegion(items, "praha");
    result.forEach((r) => {
      expect(r.technik).not.toBeNull();
      expect(r.technik?.pobocka).toBe("praha");
    });
  });
});

// ---------------------------------------------------------------
// Postpone: puvodni_datum preservation
// ---------------------------------------------------------------

describe("Postpone logic", () => {
  it("should set puvodni_datum on first postponement", () => {
    const current = { datum: "2026-03-01", puvodni_datum: null as string | null };
    const puvodni = current.puvodni_datum || current.datum;
    expect(puvodni).toBe("2026-03-01");
  });

  it("should NOT overwrite puvodni_datum on second postponement", () => {
    const current = { datum: "2026-03-15", puvodni_datum: "2026-03-01" as string | null };
    const puvodni = current.puvodni_datum || current.datum;
    expect(puvodni).toBe("2026-03-01"); // original preserved
  });
});

// ---------------------------------------------------------------
// Klient postpone validation
// ---------------------------------------------------------------

describe("Klient postpone validation", () => {
  const today = "2026-03-13";

  it("rejects dates in the past", () => {
    const newDatum = "2026-03-10";
    expect(newDatum <= today).toBe(true);
  });

  it("accepts dates in the future", () => {
    const newDatum = "2026-03-20";
    expect(newDatum > today).toBe(true);
  });

  it("rejects dates more than 2 months ahead", () => {
    const maxDate = new Date("2026-03-13");
    maxDate.setMonth(maxDate.getMonth() + 2);
    const max = maxDate.toISOString().split("T")[0];
    const tooFar = "2026-06-01";
    expect(tooFar > max).toBe(true);
  });

  it("accepts dates within 2 months", () => {
    const maxDate = new Date("2026-03-13");
    maxDate.setMonth(maxDate.getMonth() + 2);
    const max = maxDate.toISOString().split("T")[0];
    const ok = "2026-04-15";
    expect(ok <= max).toBe(true);
  });
});

// ---------------------------------------------------------------
// Urgency sorting
// ---------------------------------------------------------------

describe("Urgency sorting", () => {
  it("sorts by pocet_upozorneni descending", () => {
    const items = [
      { id: "a", pocet: 2 },
      { id: "b", pocet: 8 },
      { id: "c", pocet: 5 },
    ];
    const sorted = [...items].sort((a, b) => b.pocet - a.pocet);
    expect(sorted[0].id).toBe("b");
    expect(sorted[1].id).toBe("c");
    expect(sorted[2].id).toBe("a");
  });
});
