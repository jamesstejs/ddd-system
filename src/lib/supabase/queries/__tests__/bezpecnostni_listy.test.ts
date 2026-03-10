import { describe, it, expect, vi } from "vitest";
import {
  getBezpecnostniListy,
  getAllBezpecnostniListy,
  createBezpecnostniList,
  deleteBezpecnostniList,
} from "../bezpecnostni_listy";

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
  chain.order.mockImplementation(() => {
    const awaitable = {
      ...chain,
      then: (resolve: (v: unknown) => void) => resolve(result),
    };
    return awaitable;
  });
  chain.is.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("getBezpecnostniListy", () => {
  it("queries BL for a specific pripravek, non-deleted, ordered by date desc", async () => {
    const data = [
      { id: "bl1", pripravek_id: "p1", nazev_souboru: "test.pdf" },
    ];
    const supabase = createMockSupabase({ data, error: null });

    const result = await getBezpecnostniListy(supabase, "p1");

    expect(supabase.from).toHaveBeenCalledWith("bezpecnostni_listy");
    expect(supabase._chain.eq).toHaveBeenCalledWith("pripravek_id", "p1");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(data);
  });

  it("returns error when query fails", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "DB error" },
    });

    const result = await getBezpecnostniListy(supabase, "p1");
    expect(result.error).toEqual({ message: "DB error" });
  });
});

describe("getAllBezpecnostniListy", () => {
  it("queries all non-deleted BL ordered by date desc", async () => {
    const data = [
      { id: "bl1", pripravek_id: "p1", nazev_souboru: "a.pdf" },
      { id: "bl2", pripravek_id: "p2", nazev_souboru: "b.pdf" },
    ];
    const supabase = createMockSupabase({ data, error: null });

    const result = await getAllBezpecnostniListy(supabase);

    expect(supabase.from).toHaveBeenCalledWith("bezpecnostni_listy");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(data);
  });
});

describe("createBezpecnostniList", () => {
  it("inserts a new BL record and returns it", async () => {
    const newBL = {
      pripravek_id: "p1",
      soubor_url: "https://example.com/bl.pdf",
      nazev_souboru: "bezpecnostni-list.pdf",
      velikost_bytes: 123456,
    };
    const supabase = createMockSupabase({
      data: { id: "bl-new", ...newBL },
      error: null,
    });

    await createBezpecnostniList(supabase, newBL as never);

    expect(supabase.from).toHaveBeenCalledWith("bezpecnostni_listy");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newBL);
  });
});

describe("deleteBezpecnostniList", () => {
  it("soft-deletes by setting deleted_at timestamp", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteBezpecnostniList(supabase, "bl1");

    expect(supabase.from).toHaveBeenCalledWith("bezpecnostni_listy");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "bl1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
    expect(typeof updateCall.deleted_at).toBe("string");
    expect(new Date(updateCall.deleted_at).getTime()).not.toBeNaN();
  });
});
