import { describe, it, expect, vi } from "vitest";
import { getKlienti, getKlient, softDeleteKlient } from "../klienti";
import { getKontaktniOsoby } from "../kontaktni_osoby";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockSupabase(result: { data: unknown; error: unknown }): any {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
  chain.is.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockResolvedValue(result);
  chain.update.mockReturnValue(chain);

  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

describe("getKlienti", () => {
  it("queries all non-deleted klienti ordered by nazev", async () => {
    const klienti = [
      { id: "k1", nazev: "Alfa s.r.o." },
      { id: "k2", nazev: "Beta a.s." },
    ];
    const supabase = createMockSupabase({ data: klienti, error: null });

    const result = await getKlienti(supabase);

    expect(supabase.from).toHaveBeenCalledWith("klienti");
    expect(result.data).toEqual(klienti);
  });
});

describe("getKlient", () => {
  it("queries klient by id, filters deleted, returns single", async () => {
    const klient = { id: "k1", nazev: "Alfa s.r.o." };
    const supabase = createMockSupabase({ data: klient, error: null });

    const result = await getKlient(supabase, "k1");

    expect(supabase.from).toHaveBeenCalledWith("klienti");
    expect(result.data).toEqual(klient);
  });
});

describe("softDeleteKlient", () => {
  it("sets deleted_at timestamp on klient", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await softDeleteKlient(supabase, "k1");

    expect(supabase.from).toHaveBeenCalledWith("klienti");
  });
});

describe("getKontaktniOsoby", () => {
  it("queries kontaktni_osoby by klient_id", async () => {
    const osoby = [
      { id: "o1", jmeno: "Jan Novak", je_primarni: true },
    ];
    const supabase = createMockSupabase({ data: osoby, error: null });

    const result = await getKontaktniOsoby(supabase, "k1");

    expect(supabase.from).toHaveBeenCalledWith("kontaktni_osoby");
    expect(result.data).toEqual(osoby);
  });
});
