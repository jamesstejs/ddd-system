import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GenerateAiHodnoceniParams } from "../analyzaTrendu";

// Mock callAnthropic
const { mockCallAnthropic } = vi.hoisted(() => {
  const mockCallAnthropic = vi.fn();
  return { mockCallAnthropic };
});

vi.mock("../client", () => ({
  callAnthropic: mockCallAnthropic,
}));

import { generateAiHodnoceni } from "../analyzaTrendu";

const baseParams: GenerateAiHodnoceniParams = {
  objektNazev: "Restaurace U Zlatého lva",
  typObjektu: "gastro",
  deratStatistiky: null,
  dezinsStatistiky: null,
  currentDeratBody: [],
  currentDezinsBody: [],
  previousDeratBody: null,
  previousDezinsBody: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCallAnthropic.mockResolvedValue("AI hodnocení textu.");
});

describe("generateAiHodnoceni", () => {
  it("returns AI-generated text", async () => {
    const result = await generateAiHodnoceni(baseParams);
    expect(result).toBe("AI hodnocení textu.");
  });

  it("uses temperature 0.4", async () => {
    await generateAiHodnoceni(baseParams);

    expect(mockCallAnthropic).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      0.4,
    );
  });

  it("includes objekt name and typ in prompt", async () => {
    await generateAiHodnoceni(baseParams);

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("Restaurace U Zlatého lva");
    expect(userPrompt).toContain("gastro");
  });

  it("uses nespecifikováno when typObjektu is null", async () => {
    await generateAiHodnoceni({ ...baseParams, typObjektu: null });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("nespecifikováno");
  });

  it("includes deratizace statistics when present", async () => {
    await generateAiHodnoceni({
      ...baseParams,
      deratStatistiky: {
        currentAvgPozer: 25.5,
        currentBodyCount: 10,
        previousAvgPozer: 35.0,
        previousBodyCount: 10,
        trend: "klesajici",
      },
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("Deratizace");
    expect(userPrompt).toContain("25.5");
    expect(userPrompt).toContain("35.0");
    expect(userPrompt).toContain("klesajici");
  });

  it("marks first protocol when no previous data", async () => {
    await generateAiHodnoceni({
      ...baseParams,
      deratStatistiky: {
        currentAvgPozer: 10.0,
        currentBodyCount: 5,
        previousAvgPozer: null,
        previousBodyCount: null,
        trend: null,
      },
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("první protokol");
  });

  it("highlights problematic derat points (≥75%)", async () => {
    await generateAiHodnoceni({
      ...baseParams,
      deratStatistiky: {
        currentAvgPozer: 50.0,
        currentBodyCount: 3,
        previousAvgPozer: null,
        previousBodyCount: null,
        trend: null,
      },
      currentDeratBody: [
        { cislo_bodu: "S1", pozer_procent: 25, typ_stanicky: "mys" },
        { cislo_bodu: "S2", pozer_procent: 75, typ_stanicky: "mys" },
        { cislo_bodu: "L1", pozer_procent: 100, typ_stanicky: "potkan" },
      ],
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("S2 (75%)");
    expect(userPrompt).toContain("L1 (100%)");
    expect(userPrompt).not.toContain("S1 (25%)");
  });

  it("includes dezinsekce statistics when present", async () => {
    await generateAiHodnoceni({
      ...baseParams,
      dezinsStatistiky: {
        currentTotalPocet: 42,
        currentBodyCount: 8,
        previousTotalPocet: 60,
        previousBodyCount: 8,
        trend: "klesajici",
      },
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("Dezinsekce");
    expect(userPrompt).toContain("42");
    expect(userPrompt).toContain("60");
    expect(userPrompt).toContain("klesajici");
  });

  it("highlights high-count dezins points (≥10)", async () => {
    await generateAiHodnoceni({
      ...baseParams,
      dezinsStatistiky: {
        currentTotalPocet: 25,
        currentBodyCount: 3,
        previousTotalPocet: null,
        previousBodyCount: null,
        trend: null,
      },
      currentDezinsBody: [
        { cislo_bodu: "D1", pocet: 3, druh_hmyzu: "moucha" },
        { cislo_bodu: "D2", pocet: 15, druh_hmyzu: "šváb" },
        { cislo_bodu: "D3", pocet: 10, druh_hmyzu: null },
      ],
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("D2 (15 ks, šváb)");
    expect(userPrompt).toContain("D3 (10 ks)");
    expect(userPrompt).not.toContain("D1");
  });

  it("handles both derat and dezins data together", async () => {
    await generateAiHodnoceni({
      ...baseParams,
      deratStatistiky: {
        currentAvgPozer: 10.0,
        currentBodyCount: 5,
        previousAvgPozer: 20.0,
        previousBodyCount: 5,
        trend: "klesajici",
      },
      dezinsStatistiky: {
        currentTotalPocet: 5,
        currentBodyCount: 3,
        previousTotalPocet: 10,
        previousBodyCount: 3,
        trend: "klesajici",
      },
    });

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("Deratizace");
    expect(userPrompt).toContain("Dezinsekce");
  });

  it("shows no-data message when both stats are null", async () => {
    await generateAiHodnoceni(baseParams);

    const userPrompt = mockCallAnthropic.mock.calls[0][1] as string;
    expect(userPrompt).toContain("Žádná data monitorovacích bodů");
  });

  it("propagates API errors", async () => {
    mockCallAnthropic.mockRejectedValueOnce(new Error("API error"));

    await expect(generateAiHodnoceni(baseParams)).rejects.toThrow("API error");
  });
});
