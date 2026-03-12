import { describe, it, expect, vi, beforeEach } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(): any {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "from",
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "is",
    "in",
    "order",
    "single",
    "maybeSingle",
  ];

  for (const method of chainMethods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Default resolved values
  chain.single.mockResolvedValue({ data: null, error: null });
  chain.maybeSingle.mockResolvedValue({ data: null, error: null });
  chain.order.mockResolvedValue({ data: [], error: null });

  return chain;
}

describe("faktury queries", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;

  beforeEach(() => {
    supabase = createMockSupabase();
  });

  it("getFaktury queries with correct table and filters", async () => {
    const { getFaktury } = await import("../faktury");
    await getFaktury(supabase);

    expect(supabase.from).toHaveBeenCalledWith("faktury");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("getFaktura queries single by id", async () => {
    const { getFaktura } = await import("../faktury");
    await getFaktura(supabase, "test-id");

    expect(supabase.from).toHaveBeenCalledWith("faktury");
    expect(supabase.eq).toHaveBeenCalledWith("id", "test-id");
    expect(supabase.single).toHaveBeenCalled();
  });

  it("getFakturaByProtokol uses maybeSingle", async () => {
    const { getFakturaByProtokol } = await import("../faktury");
    await getFakturaByProtokol(supabase, "proto-1");

    expect(supabase.from).toHaveBeenCalledWith("faktury");
    expect(supabase.eq).toHaveBeenCalledWith("protokol_id", "proto-1");
    expect(supabase.maybeSingle).toHaveBeenCalled();
  });

  it("createFaktura inserts and returns single", async () => {
    const { createFaktura } = await import("../faktury");
    await createFaktura(supabase, {
      zakazka_id: "z1",
      protokol_id: "p1",
      fakturoid_id: 529,
      cislo: "2026-001",
      castka_bez_dph: 5000,
      castka_s_dph: 6050,
      stav: "vytvorena",
    });

    expect(supabase.from).toHaveBeenCalledWith("faktury");
    expect(supabase.insert).toHaveBeenCalled();
    expect(supabase.single).toHaveBeenCalled();
  });

  it("updateFaktura updates by id", async () => {
    const { updateFaktura } = await import("../faktury");
    await updateFaktura(supabase, "f1", { stav: "odeslana" });

    expect(supabase.from).toHaveBeenCalledWith("faktury");
    expect(supabase.update).toHaveBeenCalledWith({ stav: "odeslana" });
    expect(supabase.eq).toHaveBeenCalledWith("id", "f1");
  });

  it("deleteFaktura soft-deletes", async () => {
    const { deleteFaktura } = await import("../faktury");
    await deleteFaktura(supabase, "f2");

    expect(supabase.from).toHaveBeenCalledWith("faktury");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "f2");
  });

  it("updateKlientFakturoidId updates klient", async () => {
    const { updateKlientFakturoidId } = await import("../faktury");
    await updateKlientFakturoidId(supabase, "k1", 42);

    expect(supabase.from).toHaveBeenCalledWith("klienti");
    expect(supabase.update).toHaveBeenCalledWith({
      fakturoid_subject_id: 42,
    });
    expect(supabase.eq).toHaveBeenCalledWith("id", "k1");
  });
});
