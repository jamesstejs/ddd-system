import { describe, it, expect, vi } from "vitest";
import {
  getSablonyPouceni,
  getSablonaPouceni,
  createSablonaPouceni,
  updateSablonaPouceni,
  deleteSablonaPouceni,
  mapTypyZasahuToSablona,
} from "../sablony_pouceni";

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

describe("getSablonyPouceni", () => {
  it("queries all non-deleted sablony with skudci join, ordered by nazev", async () => {
    const data = [
      { id: "s1", nazev: "Deratizace obecné", skudci: null },
      { id: "s2", nazev: "Dezinsekce švábi", skudci: { nazev: "Rus domácí" } },
    ];
    const supabase = createMockSupabase({ data, error: null });

    const result = await getSablonyPouceni(supabase);

    expect(supabase.from).toHaveBeenCalledWith("sablony_pouceni");
    expect(supabase._chain.select).toHaveBeenCalledWith("*, skudci(nazev)");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(data);
  });

  it("returns error when query fails", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "DB error" },
    });

    const result = await getSablonyPouceni(supabase);
    expect(result.error).toEqual({ message: "DB error" });
  });
});

describe("getSablonaPouceni", () => {
  it("queries single sablona by id with skudci join", async () => {
    const sablona = {
      id: "s1",
      nazev: "Deratizace obecné",
      skudci: null,
    };
    const supabase = createMockSupabase({ data: sablona, error: null });

    const result = await getSablonaPouceni(supabase, "s1");

    expect(supabase.from).toHaveBeenCalledWith("sablony_pouceni");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "s1");
    expect(result.data).toEqual(sablona);
  });
});

describe("createSablonaPouceni", () => {
  it("inserts a new sablona and returns it", async () => {
    const newSablona = {
      nazev: "Nová šablona",
      typ_zasahu: "deratizace",
      obsah: "Text poučení...",
      aktivni: true,
    };
    const supabase = createMockSupabase({
      data: { id: "s-new", ...newSablona },
      error: null,
    });

    await createSablonaPouceni(supabase, newSablona as never);

    expect(supabase.from).toHaveBeenCalledWith("sablony_pouceni");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newSablona);
  });
});

describe("updateSablonaPouceni", () => {
  it("updates sablona by id with soft-delete filter", async () => {
    const updateData = { nazev: "Upravený název" };
    const supabase = createMockSupabase({
      data: { id: "s1", nazev: "Upravený název" },
      error: null,
    });

    await updateSablonaPouceni(supabase, "s1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("sablony_pouceni");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "s1");
  });
});

describe("deleteSablonaPouceni", () => {
  it("soft-deletes by setting deleted_at timestamp", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteSablonaPouceni(supabase, "s1");

    expect(supabase.from).toHaveBeenCalledWith("sablony_pouceni");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "s1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
    expect(typeof updateCall.deleted_at).toBe("string");
    expect(new Date(updateCall.deleted_at).getTime()).not.toBeNaN();
  });
});

// Sprint 25: mapTypyZasahuToSablona tests

describe("mapTypyZasahuToSablona", () => {
  it("maps vnitřní deratizace to deratizace", () => {
    expect(mapTypyZasahuToSablona(["vnitřní deratizace"])).toEqual([
      "deratizace",
    ]);
  });

  it("maps vnější deratizace to deratizace", () => {
    expect(mapTypyZasahuToSablona(["vnější deratizace"])).toEqual([
      "deratizace",
    ]);
  });

  it("maps vnitřní dezinsekce to dezinsekce", () => {
    expect(mapTypyZasahuToSablona(["vnitřní dezinsekce"])).toEqual([
      "dezinsekce",
    ]);
  });

  it("maps postřik to postrik", () => {
    expect(mapTypyZasahuToSablona(["postřik"])).toEqual(["postrik"]);
  });

  it("maps multiple types", () => {
    const result = mapTypyZasahuToSablona([
      "vnitřní deratizace",
      "postřik",
    ]);
    expect(result).toContain("deratizace");
    expect(result).toContain("postrik");
    expect(result).toHaveLength(2);
  });

  it("deduplicates (vnitřní + vnější deratizace = 1 deratizace)", () => {
    const result = mapTypyZasahuToSablona([
      "vnitřní deratizace",
      "vnější deratizace",
    ]);
    expect(result).toEqual(["deratizace"]);
  });

  it("handles empty array", () => {
    expect(mapTypyZasahuToSablona([])).toEqual([]);
  });

  it("maps dezinfekce", () => {
    expect(mapTypyZasahuToSablona(["dezinfekce"])).toEqual(["dezinfekce"]);
  });

  it("is case-insensitive", () => {
    expect(mapTypyZasahuToSablona(["Vnitřní Deratizace"])).toEqual([
      "deratizace",
    ]);
  });

  it("handles unknown type gracefully (empty result)", () => {
    expect(mapTypyZasahuToSablona(["neznámý typ"])).toEqual([]);
  });
});
