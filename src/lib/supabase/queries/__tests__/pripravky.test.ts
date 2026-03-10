import { describe, it, expect, vi } from "vitest";
import {
  getPripravky,
  getAktivniPripravky,
  getPripravek,
  createPripravek,
  updatePripravek,
  deletePripravek,
} from "../pripravky";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(result: { data: unknown; error: unknown }): any {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };
  // Terminal calls resolve the result
  chain.order.mockReturnValue(chain);
  chain.is.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  // For list queries — last .order() resolves
  // We need to make the chain awaitable for list queries
  chain.order.mockImplementation(() => {
    const awaitable = {
      ...chain,
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return awaitable;
  });

  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("getPripravky", () => {
  it("queries all non-deleted pripravky ordered by typ and nazev", async () => {
    const pripravky = [
      { id: "p1", nazev: "Brodifacoum Bloc", typ: "rodenticid" },
      { id: "p2", nazev: "Cyperkill 25 EC", typ: "insekticid" },
    ];
    const supabase = createMockSupabase({ data: pripravky, error: null });

    const result = await getPripravky(supabase);

    expect(supabase.from).toHaveBeenCalledWith("pripravky");
    expect(result.data).toEqual(pripravky);
  });

  it("returns error when query fails", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "DB error" },
    });

    const result = await getPripravky(supabase);

    expect(result.error).toEqual({ message: "DB error" });
  });
});

describe("getAktivniPripravky", () => {
  it("queries only active non-deleted pripravky", async () => {
    const aktivni = [{ id: "p1", nazev: "Brodifacoum Bloc", aktivni: true }];
    const supabase = createMockSupabase({ data: aktivni, error: null });

    const result = await getAktivniPripravky(supabase);

    expect(supabase.from).toHaveBeenCalledWith("pripravky");
    expect(supabase._chain.eq).toHaveBeenCalledWith("aktivni", true);
    expect(result.data).toEqual(aktivni);
  });
});

describe("getPripravek", () => {
  it("queries pripravek by id, filters deleted, returns single", async () => {
    const pripravek = { id: "p1", nazev: "Brodifacoum Bloc" };
    const supabase = createMockSupabase({ data: pripravek, error: null });

    const result = await getPripravek(supabase, "p1");

    expect(supabase.from).toHaveBeenCalledWith("pripravky");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "p1");
    expect(result.data).toEqual(pripravek);
  });
});

describe("createPripravek", () => {
  it("inserts a new pripravek and returns it", async () => {
    const newPripravek = {
      nazev: "Nový přípravek",
      typ: "insekticid" as const,
      forma: "kapalina" as const,
    };
    const supabase = createMockSupabase({
      data: { id: "p-new", ...newPripravek },
      error: null,
    });

    const result = await createPripravek(supabase, newPripravek as never);

    expect(supabase.from).toHaveBeenCalledWith("pripravky");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newPripravek);
  });
});

describe("updatePripravek", () => {
  it("updates pripravek by id with soft-delete filter", async () => {
    const updateData = { nazev: "Upravený název" };
    const supabase = createMockSupabase({
      data: { id: "p1", nazev: "Upravený název" },
      error: null,
    });

    const result = await updatePripravek(supabase, "p1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("pripravky");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "p1");
  });
});

describe("deletePripravek", () => {
  it("soft-deletes by setting deleted_at timestamp", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deletePripravek(supabase, "p1");

    expect(supabase.from).toHaveBeenCalledWith("pripravky");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "p1");
    // Verify update was called with a deleted_at ISO string
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
    expect(typeof updateCall.deleted_at).toBe("string");
    expect(new Date(updateCall.deleted_at).getTime()).not.toBeNaN();
  });
});
