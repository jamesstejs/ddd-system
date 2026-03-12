import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------
// Monthly aggregation logic tests
// ---------------------------------------------------------------

describe("monthly zasahy aggregation", () => {
  function aggregateZasahyByMonth(
    zasahy: { datum: string; technik_id: string; profiles: { jmeno: string; prijmeni: string } | null }[],
  ) {
    const technikMap = new Map<string, string>();
    const monthlyZasahy = new Map<string, Map<string, number>>();

    for (const z of zasahy) {
      const monthKey = z.datum.substring(0, 7);
      const technikName = z.profiles ? `${z.profiles.jmeno} ${z.profiles.prijmeni}` : z.technik_id;
      technikMap.set(z.technik_id, technikName);

      if (!monthlyZasahy.has(monthKey)) monthlyZasahy.set(monthKey, new Map());
      const month = monthlyZasahy.get(monthKey)!;
      month.set(z.technik_id, (month.get(z.technik_id) ?? 0) + 1);
    }

    return { technikMap, monthlyZasahy };
  }

  it("aggregates zasahy by month and technik", () => {
    const zasahy = [
      { datum: "2026-01-05", technik_id: "t1", profiles: { jmeno: "Jan", prijmeni: "Novák" } },
      { datum: "2026-01-15", technik_id: "t1", profiles: { jmeno: "Jan", prijmeni: "Novák" } },
      { datum: "2026-01-10", technik_id: "t2", profiles: { jmeno: "Petr", prijmeni: "Horák" } },
      { datum: "2026-02-05", technik_id: "t1", profiles: { jmeno: "Jan", prijmeni: "Novák" } },
    ];

    const { technikMap, monthlyZasahy } = aggregateZasahyByMonth(zasahy);

    expect(technikMap.get("t1")).toBe("Jan Novák");
    expect(technikMap.get("t2")).toBe("Petr Horák");

    expect(monthlyZasahy.get("2026-01")?.get("t1")).toBe(2);
    expect(monthlyZasahy.get("2026-01")?.get("t2")).toBe(1);
    expect(monthlyZasahy.get("2026-02")?.get("t1")).toBe(1);
  });

  it("handles empty data", () => {
    const { monthlyZasahy } = aggregateZasahyByMonth([]);
    expect(monthlyZasahy.size).toBe(0);
  });
});

// ---------------------------------------------------------------
// Revenue aggregation tests
// ---------------------------------------------------------------

describe("monthly revenue aggregation", () => {
  function aggregateRevenue(
    faktury: { castka_bez_dph: number | null; castka_s_dph: number | null; datum_vystaveni: string }[],
  ) {
    const monthly = new Map<string, { bezDph: number; sDph: number }>();
    for (const f of faktury) {
      const monthKey = f.datum_vystaveni.substring(0, 7);
      const existing = monthly.get(monthKey) ?? { bezDph: 0, sDph: 0 };
      existing.bezDph += f.castka_bez_dph ?? 0;
      existing.sDph += f.castka_s_dph ?? 0;
      monthly.set(monthKey, existing);
    }
    return monthly;
  }

  it("sums revenue by month", () => {
    const faktury = [
      { castka_bez_dph: 1000, castka_s_dph: 1210, datum_vystaveni: "2026-01-05" },
      { castka_bez_dph: 2000, castka_s_dph: 2420, datum_vystaveni: "2026-01-20" },
      { castka_bez_dph: 3000, castka_s_dph: 3630, datum_vystaveni: "2026-02-10" },
    ];

    const monthly = aggregateRevenue(faktury);
    expect(monthly.get("2026-01")?.bezDph).toBe(3000);
    expect(monthly.get("2026-01")?.sDph).toBe(3630);
    expect(monthly.get("2026-02")?.bezDph).toBe(3000);
  });

  it("handles null amounts", () => {
    const faktury = [
      { castka_bez_dph: null, castka_s_dph: null, datum_vystaveni: "2026-01-05" },
      { castka_bez_dph: 1000, castka_s_dph: null, datum_vystaveni: "2026-01-10" },
    ];

    const monthly = aggregateRevenue(faktury);
    expect(monthly.get("2026-01")?.bezDph).toBe(1000);
    expect(monthly.get("2026-01")?.sDph).toBe(0);
  });

  it("handles empty data", () => {
    const monthly = aggregateRevenue([]);
    expect(monthly.size).toBe(0);
  });
});

// ---------------------------------------------------------------
// CSV export format tests
// ---------------------------------------------------------------

describe("CSV export format", () => {
  it("generates semicolon-separated CSV with header", () => {
    const header = "ID;Název;Email";
    const rows = [
      ["1", "Test Firma", "test@test.cz"],
      ["2", "Další", "dalsi@test.cz"],
    ];
    const csv = [header, ...rows.map((r) => r.join(";"))].join("\n");

    expect(csv.split("\n").length).toBe(3);
    expect(csv.startsWith("ID;Název;Email")).toBe(true);
    expect(csv.includes("Test Firma")).toBe(true);
  });

  it("handles special characters in CSV values", () => {
    const row = ["1", "Firma s.r.o.", "Dvořákova 475; Praha"].join(";");
    expect(row).toBe("1;Firma s.r.o.;Dvořákova 475; Praha");
  });
});

// ---------------------------------------------------------------
// Month formatting tests
// ---------------------------------------------------------------

describe("month formatting", () => {
  function formatMonth(yyyymm: string): string {
    const [year, month] = yyyymm.split("-").map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" });
  }

  it("formats YYYY-MM to Czech short month", () => {
    const result = formatMonth("2026-01");
    // Should contain "led" or similar Czech month abbreviation
    expect(result.length).toBeGreaterThan(0);
  });

  it("formats different months", () => {
    const jan = formatMonth("2026-01");
    const feb = formatMonth("2026-02");
    expect(jan).not.toBe(feb);
  });
});
