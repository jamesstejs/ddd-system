import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------
// Mocks — vi.hoisted runs before vi.mock factory
// ---------------------------------------------------------------

const {
  mockGetFaktury,
  mockGetFaktura,
  mockUpdateFaktura,
  mockGetInvoice,
  mockMapFakturoidStatus,
  mockSupabase,
} = vi.hoisted(() => {
  const mockSupabase = {} as unknown;
  return {
    mockGetFaktury: vi.fn(),
    mockGetFaktura: vi.fn(),
    mockUpdateFaktura: vi.fn(),
    mockGetInvoice: vi.fn(),
    mockMapFakturoidStatus: vi.fn(),
    mockSupabase,
  };
});

vi.mock("@/lib/supabase/queries/faktury", () => ({
  getFaktury: (...args: unknown[]) => mockGetFaktury(...args),
  getFaktura: (...args: unknown[]) => mockGetFaktura(...args),
  updateFaktura: (...args: unknown[]) => mockUpdateFaktura(...args),
}));

vi.mock("@/lib/fakturoid", () => ({
  getInvoice: (...args: unknown[]) => mockGetInvoice(...args),
  mapFakturoidStatus: (...args: unknown[]) => mockMapFakturoidStatus(...args),
}));

// Mock auth
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ supabase: mockSupabase, user: { id: "admin-1" } }),
}));
vi.mock("@/lib/auth/requireTechnik", () => ({
  requireTechnik: vi.fn().mockRejectedValue(new Error("not technik")),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  syncFakturoidPaymentsAction,
  checkSinglePaymentAction,
} from "../actions";

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateFaktura.mockResolvedValue({ data: {}, error: null });
});

// ===============================================================
// syncFakturoidPaymentsAction
// ===============================================================

describe("syncFakturoidPaymentsAction", () => {
  it("returns 0 updated when no neuhrazené faktury", async () => {
    mockGetFaktury.mockResolvedValue({ data: [] });

    const result = await syncFakturoidPaymentsAction();

    expect(result.success).toBe(true);
    expect(result.updated).toBe(0);
    expect(result.total).toBe(0);
  });

  it("returns 0 when no data from getFaktury", async () => {
    mockGetFaktury.mockResolvedValue({ data: null });

    const result = await syncFakturoidPaymentsAction();

    expect(result.success).toBe(true);
    expect(result.updated).toBe(0);
    expect(result.total).toBe(0);
  });

  it("skips uhrazené and storno faktury", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [
        { id: "1", stav: "uhrazena", fakturoid_id: 100 },
        { id: "2", stav: "storno", fakturoid_id: 200 },
      ],
    });

    const result = await syncFakturoidPaymentsAction();

    expect(result.total).toBe(0);
    expect(mockGetInvoice).not.toHaveBeenCalled();
  });

  it("skips faktury without fakturoid_id", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [{ id: "1", stav: "odeslana", fakturoid_id: null }],
    });

    const result = await syncFakturoidPaymentsAction();

    expect(result.total).toBe(0);
    expect(mockGetInvoice).not.toHaveBeenCalled();
  });

  it("updates stav when Fakturoid status differs", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [
        { id: "f1", stav: "odeslana", fakturoid_id: 100, datum_splatnosti: "2026-12-31" },
      ],
    });
    mockGetInvoice.mockResolvedValue({ status: "paid" });
    mockMapFakturoidStatus.mockReturnValue("uhrazena");

    const result = await syncFakturoidPaymentsAction();

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.total).toBe(1);
    expect(mockUpdateFaktura).toHaveBeenCalledWith(
      mockSupabase,
      "f1",
      { stav: "uhrazena" },
    );
  });

  it("does not update when stav matches Fakturoid", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [
        { id: "f1", stav: "odeslana", fakturoid_id: 100, datum_splatnosti: "2099-12-31" },
      ],
    });
    mockGetInvoice.mockResolvedValue({ status: "sent" });
    mockMapFakturoidStatus.mockReturnValue("odeslana");

    const result = await syncFakturoidPaymentsAction();

    expect(result.updated).toBe(0);
    expect(mockUpdateFaktura).not.toHaveBeenCalled();
  });

  it("applies local overdue check when datum_splatnosti < today", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [
        {
          id: "f1",
          stav: "odeslana",
          fakturoid_id: 100,
          datum_splatnosti: "2020-01-01", // well past
        },
      ],
    });
    // Fakturoid also says "sent" (not overdue) — but local check catches it
    mockGetInvoice.mockResolvedValue({ status: "sent" });
    mockMapFakturoidStatus.mockReturnValue("odeslana");

    const result = await syncFakturoidPaymentsAction();

    expect(result.updated).toBe(1);
    expect(mockUpdateFaktura).toHaveBeenCalledWith(
      mockSupabase,
      "f1",
      { stav: "po_splatnosti" },
    );
  });

  it("counts errors when getInvoice throws", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [
        { id: "f1", stav: "odeslana", fakturoid_id: 100 },
        { id: "f2", stav: "vytvorena", fakturoid_id: 200 },
      ],
    });
    mockGetInvoice
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce({ status: "paid" });
    mockMapFakturoidStatus.mockReturnValue("uhrazena");

    const result = await syncFakturoidPaymentsAction();

    expect(result.errors).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.total).toBe(2);
  });

  it("processes multiple faktury correctly", async () => {
    mockGetFaktury.mockResolvedValue({
      data: [
        { id: "f1", stav: "odeslana", fakturoid_id: 100, datum_splatnosti: "2099-12-31" },
        { id: "f2", stav: "vytvorena", fakturoid_id: 200, datum_splatnosti: null },
        { id: "f3", stav: "po_splatnosti", fakturoid_id: 300, datum_splatnosti: "2020-01-01" },
      ],
    });
    mockGetInvoice
      .mockResolvedValueOnce({ status: "paid" })
      .mockResolvedValueOnce({ status: "open" })
      .mockResolvedValueOnce({ status: "paid" });
    mockMapFakturoidStatus
      .mockReturnValueOnce("uhrazena")
      .mockReturnValueOnce("vytvorena")
      .mockReturnValueOnce("uhrazena");

    const result = await syncFakturoidPaymentsAction();

    expect(result.updated).toBe(2); // f1 (odeslana→uhrazena) + f3 (po_splatnosti→uhrazena)
    expect(result.total).toBe(3);
  });
});

// ===============================================================
// checkSinglePaymentAction
// ===============================================================

describe("checkSinglePaymentAction", () => {
  it("rejects invalid UUID", async () => {
    const result = await checkSinglePaymentAction("not-a-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Neplatný formát");
  });

  it("returns error when faktura not found", async () => {
    mockGetFaktura.mockResolvedValue({ data: null });

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("nenalezena");
  });

  it("returns paid=true when already uhrazena", async () => {
    mockGetFaktura.mockResolvedValue({
      data: { id: "f1", stav: "uhrazena", fakturoid_id: 100 },
    });

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(true);
    expect(result.paid).toBe(true);
    expect(mockGetInvoice).not.toHaveBeenCalled();
  });

  it("returns error when no fakturoid_id", async () => {
    mockGetFaktura.mockResolvedValue({
      data: { id: "f1", stav: "odeslana", fakturoid_id: null },
    });

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Fakturoid ID");
  });

  it("updates stav when Fakturoid reports paid", async () => {
    mockGetFaktura.mockResolvedValue({
      data: { id: "f1", stav: "odeslana", fakturoid_id: 100 },
    });
    mockGetInvoice.mockResolvedValue({ status: "paid" });
    mockMapFakturoidStatus.mockReturnValue("uhrazena");

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(true);
    expect(result.paid).toBe(true);
    expect(result.newStav).toBe("uhrazena");
    expect(mockUpdateFaktura).toHaveBeenCalledWith(
      mockSupabase,
      "11111111-1111-1111-1111-111111111111",
      { stav: "uhrazena" },
    );
  });

  it("returns paid=false when status unchanged", async () => {
    mockGetFaktura.mockResolvedValue({
      data: { id: "f1", stav: "odeslana", fakturoid_id: 100 },
    });
    mockGetInvoice.mockResolvedValue({ status: "sent" });
    mockMapFakturoidStatus.mockReturnValue("odeslana");

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(true);
    expect(result.paid).toBe(false);
    expect(result.newStav).toBe("odeslana");
    expect(mockUpdateFaktura).not.toHaveBeenCalled();
  });

  it("updates to po_splatnosti when overdue", async () => {
    mockGetFaktura.mockResolvedValue({
      data: { id: "f1", stav: "odeslana", fakturoid_id: 100 },
    });
    mockGetInvoice.mockResolvedValue({ status: "overdue" });
    mockMapFakturoidStatus.mockReturnValue("po_splatnosti");

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(true);
    expect(result.paid).toBe(false);
    expect(result.newStav).toBe("po_splatnosti");
    expect(mockUpdateFaktura).toHaveBeenCalledWith(
      mockSupabase,
      "11111111-1111-1111-1111-111111111111",
      { stav: "po_splatnosti" },
    );
  });

  it("handles Fakturoid API error gracefully", async () => {
    mockGetFaktura.mockResolvedValue({
      data: { id: "f1", stav: "odeslana", fakturoid_id: 100 },
    });
    mockGetInvoice.mockRejectedValue(new Error("Fakturoid 503"));

    const result = await checkSinglePaymentAction(
      "11111111-1111-1111-1111-111111111111",
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Fakturoid 503");
  });
});
