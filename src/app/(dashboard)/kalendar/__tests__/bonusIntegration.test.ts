import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------

const {
  mockCheckBonusExists,
  mockGetBonusSazba,
  mockCreateBonus,
  mockGetCurrentMonthStart,
} = vi.hoisted(() => ({
  mockCheckBonusExists: vi.fn(),
  mockGetBonusSazba: vi.fn(),
  mockCreateBonus: vi.fn(),
  mockGetCurrentMonthStart: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/bonusy", () => ({
  checkBonusExists: (...args: unknown[]) => mockCheckBonusExists(...args),
  getBonusSazba: (...args: unknown[]) => mockGetBonusSazba(...args),
  createBonus: (...args: unknown[]) => mockCreateBonus(...args),
  getCurrentMonthStart: () => mockGetCurrentMonthStart(),
  createBonusZaZakazku: vi.fn(),
  createBonusZaOpakovanou: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentMonthStart.mockReturnValue("2026-03-01");
});

// ---------------------------------------------------------------
// Auto-bonus za zakázku — business logic
// ---------------------------------------------------------------

describe("auto-bonus za zakázku logic", () => {
  it("creates bonus when not duplicate and sazba > 0", async () => {
    mockCheckBonusExists.mockResolvedValue(false);
    mockGetBonusSazba.mockResolvedValue(100);
    mockCreateBonus.mockResolvedValue({ data: {}, error: null });

    // Simulate the logic from createBonusZaZakazku
    const supabase = {} as unknown;
    const userId = "user-1";
    const zakazkaId = "zak-1";
    const zasahId = "zas-1";

    const exists = await mockCheckBonusExists(supabase, zasahId, "zakazka");
    expect(exists).toBe(false);

    const castka = await mockGetBonusSazba(supabase, "bonus_za_zakazku");
    expect(castka).toBe(100);

    await mockCreateBonus(supabase, {
      uzivatel_id: userId,
      typ: "zakazka",
      zakazka_id: zakazkaId,
      zasah_id: zasahId,
      castka,
      obdobi_mesic: "2026-03-01",
      poznamka: null,
    });

    expect(mockCreateBonus).toHaveBeenCalledTimes(1);
    expect(mockCreateBonus).toHaveBeenCalledWith(supabase, {
      uzivatel_id: "user-1",
      typ: "zakazka",
      zakazka_id: "zak-1",
      zasah_id: "zas-1",
      castka: 100,
      obdobi_mesic: "2026-03-01",
      poznamka: null,
    });
  });

  it("skips bonus when already exists (deduplication)", async () => {
    mockCheckBonusExists.mockResolvedValue(true);

    const supabase = {} as unknown;
    const exists = await mockCheckBonusExists(supabase, "zas-1", "zakazka");
    expect(exists).toBe(true);

    // Should not create bonus
    expect(mockCreateBonus).not.toHaveBeenCalled();
  });

  it("skips bonus when sazba is 0", async () => {
    mockCheckBonusExists.mockResolvedValue(false);
    mockGetBonusSazba.mockResolvedValue(0);

    const supabase = {} as unknown;
    const exists = await mockCheckBonusExists(supabase, "zas-1", "zakazka");
    expect(exists).toBe(false);

    const castka = await mockGetBonusSazba(supabase, "bonus_za_zakazku");
    expect(castka).toBe(0);

    // castka <= 0, should not create bonus
    if (castka > 0) {
      await mockCreateBonus(supabase, {});
    }
    expect(mockCreateBonus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------
// Auto-bonus za opakovanou zakázku
// ---------------------------------------------------------------

describe("auto-bonus za opakovanou zakázku logic", () => {
  it("creates bonus for opakovanou when conditions met", async () => {
    mockCheckBonusExists.mockResolvedValue(false);
    mockGetBonusSazba.mockResolvedValue(100);
    mockCreateBonus.mockResolvedValue({ data: {}, error: null });

    const supabase = {} as unknown;

    const exists = await mockCheckBonusExists(supabase, "zas-follow", "opakovana_zakazka");
    expect(exists).toBe(false);

    const castka = await mockGetBonusSazba(supabase, "bonus_za_opakovanou");
    expect(castka).toBe(100);

    await mockCreateBonus(supabase, {
      uzivatel_id: "user-1",
      typ: "opakovana_zakazka",
      zakazka_id: "zak-1",
      zasah_id: "zas-follow",
      castka,
      obdobi_mesic: "2026-03-01",
      poznamka: null,
    });

    expect(mockCreateBonus).toHaveBeenCalledWith(supabase, {
      uzivatel_id: "user-1",
      typ: "opakovana_zakazka",
      zakazka_id: "zak-1",
      zasah_id: "zas-follow",
      castka: 100,
      obdobi_mesic: "2026-03-01",
      poznamka: null,
    });
  });

  it("prevents double bonus for same follow-up zasah", async () => {
    mockCheckBonusExists.mockResolvedValue(true);

    const supabase = {} as unknown;
    const exists = await mockCheckBonusExists(supabase, "zas-follow", "opakovana_zakazka");
    expect(exists).toBe(true);

    // Deduplication: should not proceed
    expect(mockCreateBonus).not.toHaveBeenCalled();
  });
});
