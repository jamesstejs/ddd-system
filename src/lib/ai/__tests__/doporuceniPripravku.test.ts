import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PripravekForAi } from "../doporuceniPripravku";

// Mock callAnthropic
const { mockCallAnthropic } = vi.hoisted(() => {
  const mockCallAnthropic = vi.fn();
  return { mockCallAnthropic };
});

vi.mock("../client", () => ({
  callAnthropic: mockCallAnthropic,
}));

import { getAiDoporuceniPripravku } from "../doporuceniPripravku";

const makePripravek = (
  id: string,
  nazev: string,
  typ: string = "insekticid",
): PripravekForAi => ({
  id,
  nazev,
  ucinna_latka: "testová látka",
  typ,
  forma: "postřik",
  cilovy_skudce: null,
  omezeni_prostor: null,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAiDoporuceniPripravku", () => {
  it("returns empty array when no preparations available", async () => {
    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Šváb obecný",
      typObjektu: "gastro",
      dostupnePripravky: [],
    });

    expect(result).toEqual([]);
    expect(mockCallAnthropic).not.toHaveBeenCalled();
  });

  it("parses JSON array response correctly", async () => {
    const p1 = makePripravek("id-1", "Přípravek A");
    const p2 = makePripravek("id-2", "Přípravek B");

    mockCallAnthropic.mockResolvedValueOnce(
      JSON.stringify([
        { pripravek_id: "id-1", duvod: "Nejlepší volba", priorita: 1 },
        { pripravek_id: "id-2", duvod: "Záložní", priorita: 2 },
      ]),
    );

    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Šváb obecný",
      typObjektu: "gastro",
      dostupnePripravky: [p1, p2],
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      pripravek_id: "id-1",
      nazev: "Přípravek A",
      duvod: "Nejlepší volba",
      priorita: 1,
    });
    expect(result[1]).toEqual({
      pripravek_id: "id-2",
      nazev: "Přípravek B",
      duvod: "Záložní",
      priorita: 2,
    });
  });

  it("handles markdown code block wrapper", async () => {
    const p1 = makePripravek("id-1", "Přípravek A");

    mockCallAnthropic.mockResolvedValueOnce(
      '```json\n[{"pripravek_id": "id-1", "duvod": "OK", "priorita": 1}]\n```',
    );

    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Rus domácí",
      typObjektu: "domacnost",
      dostupnePripravky: [p1],
    });

    expect(result).toHaveLength(1);
    expect(result[0].pripravek_id).toBe("id-1");
  });

  it("filters out invalid/unknown IDs", async () => {
    const p1 = makePripravek("id-1", "Přípravek A");

    mockCallAnthropic.mockResolvedValueOnce(
      JSON.stringify([
        { pripravek_id: "id-1", duvod: "OK", priorita: 1 },
        { pripravek_id: "nonexistent-id", duvod: "Bad", priorita: 2 },
      ]),
    );

    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Šváb",
      typObjektu: null,
      dostupnePripravky: [p1],
    });

    expect(result).toHaveLength(1);
    expect(result[0].pripravek_id).toBe("id-1");
  });

  it("sorts by priority", async () => {
    const p1 = makePripravek("id-1", "A");
    const p2 = makePripravek("id-2", "B");
    const p3 = makePripravek("id-3", "C");

    mockCallAnthropic.mockResolvedValueOnce(
      JSON.stringify([
        { pripravek_id: "id-3", duvod: "3rd choice", priorita: 3 },
        { pripravek_id: "id-1", duvod: "Best", priorita: 1 },
        { pripravek_id: "id-2", duvod: "2nd", priorita: 2 },
      ]),
    );

    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Mravenec",
      typObjektu: "gastro",
      dostupnePripravky: [p1, p2, p3],
    });

    expect(result[0].priorita).toBe(1);
    expect(result[1].priorita).toBe(2);
    expect(result[2].priorita).toBe(3);
  });

  it("limits to max 5 results", async () => {
    const preps = Array.from({ length: 7 }, (_, i) =>
      makePripravek(`id-${i}`, `P${i}`),
    );

    mockCallAnthropic.mockResolvedValueOnce(
      JSON.stringify(
        preps.map((p, i) => ({
          pripravek_id: p.id,
          duvod: `Důvod ${i}`,
          priorita: i + 1,
        })),
      ),
    );

    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Potkan",
      typObjektu: "sklad_zivocisna",
      dostupnePripravky: preps,
    });

    expect(result).toHaveLength(5);
  });

  it("throws on non-array response", async () => {
    const p1 = makePripravek("id-1", "A");

    mockCallAnthropic.mockResolvedValueOnce('{"error": "bad"}');

    await expect(
      getAiDoporuceniPripravku({
        skudceNazev: "X",
        typObjektu: null,
        dostupnePripravky: [p1],
      }),
    ).rejects.toThrow("AI: odpověď není pole");
  });

  it("handles missing duvod and priorita gracefully", async () => {
    const p1 = makePripravek("id-1", "A");

    mockCallAnthropic.mockResolvedValueOnce(
      JSON.stringify([{ pripravek_id: "id-1" }]),
    );

    const result = await getAiDoporuceniPripravku({
      skudceNazev: "Štěnice",
      typObjektu: "hotel",
      dostupnePripravky: [p1],
    });

    expect(result).toHaveLength(1);
    expect(result[0].duvod).toBe("");
    expect(result[0].priorita).toBe(99);
  });

  it("builds prompt with škůdce and typ prostoru", async () => {
    const p1 = makePripravek("id-1", "TestPrep");

    mockCallAnthropic.mockResolvedValueOnce("[]");

    await getAiDoporuceniPripravku({
      skudceNazev: "Potkan obecný",
      typObjektu: "gastro",
      dostupnePripravky: [p1],
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("Potkan obecný");
    expect(userPrompt).toContain("gastro");
    expect(userPrompt).toContain("TestPrep");
  });

  it("uses 'nespecifikováno' when typObjektu is null", async () => {
    const p1 = makePripravek("id-1", "X");

    mockCallAnthropic.mockResolvedValueOnce("[]");

    await getAiDoporuceniPripravku({
      skudceNazev: "Y",
      typObjektu: null,
      dostupnePripravky: [p1],
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("nespecifikováno");
  });
});
