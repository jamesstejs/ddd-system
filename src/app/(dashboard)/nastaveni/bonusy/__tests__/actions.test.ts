import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------

const {
  mockGetNastaveniBonusu,
  mockUpdateNastaveniBonusu,
  mockSupabase,
} = vi.hoisted(() => {
  const mockSupabase = {} as unknown;
  return {
    mockGetNastaveniBonusu: vi.fn(),
    mockUpdateNastaveniBonusu: vi.fn(),
    mockSupabase,
  };
});

vi.mock("@/lib/supabase/queries/bonusy", () => ({
  getNastaveniBonusu: (...args: unknown[]) => mockGetNastaveniBonusu(...args),
  updateNastaveniBonusu: (...args: unknown[]) => mockUpdateNastaveniBonusu(...args),
}));

vi.mock("@/lib/auth/requireSuperAdmin", () => ({
  requireSuperAdmin: vi.fn().mockResolvedValue({
    supabase: mockSupabase,
    user: { id: "super-admin-1" },
    profile: { role: ["super_admin"] },
  }),
}));

import {
  getNastaveniBonusuAction,
  updateBonusNastaveniAction,
  updateAllBonusNastaveniAction,
} from "../actions";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------
// getNastaveniBonusuAction
// ---------------------------------------------------------------

describe("getNastaveniBonusuAction", () => {
  it("returns nastaveni from DB", async () => {
    const expected = {
      bonus_za_zakazku: 150,
      bonus_za_opakovanou: 100,
      fixni_odmena_admin: 5000,
    };
    mockGetNastaveniBonusu.mockResolvedValue(expected);

    const result = await getNastaveniBonusuAction();
    expect(result).toEqual(expected);
    expect(mockGetNastaveniBonusu).toHaveBeenCalledWith(mockSupabase);
  });
});

// ---------------------------------------------------------------
// updateBonusNastaveniAction
// ---------------------------------------------------------------

describe("updateBonusNastaveniAction", () => {
  it("updates valid key with valid value", async () => {
    mockUpdateNastaveniBonusu.mockResolvedValue({ error: null });

    const result = await updateBonusNastaveniAction("bonus_za_zakazku", 200);
    expect(result).toEqual({ success: true });
    expect(mockUpdateNastaveniBonusu).toHaveBeenCalledWith(
      mockSupabase,
      "bonus_za_zakazku",
      200,
    );
  });

  it("throws on invalid key", async () => {
    await expect(
      updateBonusNastaveniAction("neplatny_klic", 100),
    ).rejects.toThrow("Neplatný klíč nastavení");
  });

  it("throws on negative value", async () => {
    await expect(
      updateBonusNastaveniAction("bonus_za_zakazku", -50),
    ).rejects.toThrow("Hodnota musí být mezi 0 a 100 000 Kč");
  });

  it("throws on value over 100000", async () => {
    await expect(
      updateBonusNastaveniAction("bonus_za_zakazku", 150000),
    ).rejects.toThrow("Hodnota musí být mezi 0 a 100 000 Kč");
  });

  it("throws on DB error", async () => {
    mockUpdateNastaveniBonusu.mockResolvedValue({
      error: { message: "DB error" },
    });

    await expect(
      updateBonusNastaveniAction("bonus_za_zakazku", 100),
    ).rejects.toThrow("DB error");
  });
});

// ---------------------------------------------------------------
// updateAllBonusNastaveniAction
// ---------------------------------------------------------------

describe("updateAllBonusNastaveniAction", () => {
  it("updates all provided keys", async () => {
    mockUpdateNastaveniBonusu.mockResolvedValue({ error: null });

    const result = await updateAllBonusNastaveniAction({
      bonus_za_zakazku: 200,
      bonus_za_opakovanou: 150,
      fixni_odmena_admin: 3000,
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdateNastaveniBonusu).toHaveBeenCalledTimes(3);
  });

  it("skips unknown keys", async () => {
    mockUpdateNastaveniBonusu.mockResolvedValue({ error: null });

    const result = await updateAllBonusNastaveniAction({
      bonus_za_zakazku: 200,
    } as Record<string, number>);

    expect(result).toEqual({ success: true });
    expect(mockUpdateNastaveniBonusu).toHaveBeenCalledTimes(1);
  });

  it("throws on invalid value", async () => {
    await expect(
      updateAllBonusNastaveniAction({
        bonus_za_zakazku: -100,
      }),
    ).rejects.toThrow("Neplatná hodnota");
  });
});
