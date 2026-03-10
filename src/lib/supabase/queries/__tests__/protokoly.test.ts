import { describe, it, expect, vi } from "vitest";
import {
  getProtokoly,
  getProtokolyByStatus,
  getProtokolByZasah,
  getProtokol,
  createProtokol,
  updateProtokol,
  deleteProtokol,
  getProtokolDeratBody,
  createProtokolDeratBod,
  updateProtokolDeratBod,
  deleteProtokolDeratBod,
  getProtokolDezinsBody,
  createProtokolDezinsBod,
  updateProtokolDezinsBod,
  deleteProtokolDezinsBod,
  getProtokolPostrik,
  createProtokolPostrik,
  updateProtokolPostrik,
  deleteProtokolPostrik,
  createProtokolPostrikPripravek,
  updateProtokolPostrikPripravek,
  deleteProtokolPostrikPripravek,
  getProtokolFotky,
  createProtokolFotka,
  updateProtokolFotka,
  deleteProtokolFotka,
} from "../protokoly";

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

// ============================================================
// Protokoly — hlavní tabulka
// ============================================================

describe("getProtokoly", () => {
  it("queries all non-deleted protokoly with joins, ordered by created_at desc", async () => {
    const protokoly = [
      { id: "pr1", cislo_protokolu: "P-ABC-001", status: "rozpracovany" },
      { id: "pr2", cislo_protokolu: "P-ABC-002", status: "ke_schvaleni" },
    ];
    const supabase = createMockSupabase({ data: protokoly, error: null });

    const result = await getProtokoly(supabase);

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(protokoly);
  });

  it("returns error when query fails", async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: "DB error" },
    });

    const result = await getProtokoly(supabase);
    expect(result.error).toEqual({ message: "DB error" });
  });
});

describe("getProtokolyByStatus", () => {
  it("filters protokoly by status", async () => {
    const keSchvaleni = [
      { id: "pr1", status: "ke_schvaleni" },
    ];
    const supabase = createMockSupabase({ data: keSchvaleni, error: null });

    const result = await getProtokolyByStatus(supabase, "ke_schvaleni");

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.eq).toHaveBeenCalledWith("status", "ke_schvaleni");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(keSchvaleni);
  });
});

describe("getProtokolByZasah", () => {
  it("queries protokol by zasah_id, returns single", async () => {
    const protokol = { id: "pr1", zasah_id: "z1" };
    const supabase = createMockSupabase({ data: protokol, error: null });

    const result = await getProtokolByZasah(supabase, "z1");

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.eq).toHaveBeenCalledWith("zasah_id", "z1");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(protokol);
  });
});

describe("getProtokol", () => {
  it("queries single protokol by id with full joins", async () => {
    const protokol = { id: "pr1", cislo_protokolu: "P-ABC-001" };
    const supabase = createMockSupabase({ data: protokol, error: null });

    const result = await getProtokol(supabase, "pr1");

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "pr1");
    expect(result.data).toEqual(protokol);
  });
});

describe("createProtokol", () => {
  it("inserts a new protokol and returns it", async () => {
    const newProtokol = {
      zasah_id: "z1",
      technik_id: "t1",
      cislo_protokolu: "P-ABC-001",
    };
    const supabase = createMockSupabase({
      data: { id: "pr-new", ...newProtokol, status: "rozpracovany" },
      error: null,
    });

    await createProtokol(supabase, newProtokol as never);

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newProtokol);
  });
});

describe("updateProtokol", () => {
  it("updates protokol by id with soft-delete filter", async () => {
    const updateData = { status: "ke_schvaleni" as const };
    const supabase = createMockSupabase({
      data: { id: "pr1", status: "ke_schvaleni" },
      error: null,
    });

    await updateProtokol(supabase, "pr1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "pr1");
  });
});

describe("deleteProtokol", () => {
  it("soft-deletes by setting deleted_at timestamp", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteProtokol(supabase, "pr1");

    expect(supabase.from).toHaveBeenCalledWith("protokoly");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "pr1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
    expect(typeof updateCall.deleted_at).toBe("string");
    expect(new Date(updateCall.deleted_at).getTime()).not.toBeNaN();
  });
});

// ============================================================
// Deratizační body
// ============================================================

describe("getProtokolDeratBody", () => {
  it("queries derat body for protokol with joins", async () => {
    const body = [
      { id: "db1", cislo_bodu: "L1", pozer_procent: 50 },
      { id: "db2", cislo_bodu: "L2", pozer_procent: 0 },
    ];
    const supabase = createMockSupabase({ data: body, error: null });

    const result = await getProtokolDeratBody(supabase, "pr1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_deratizacni_body");
    expect(supabase._chain.eq).toHaveBeenCalledWith("protokol_id", "pr1");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result.data).toEqual(body);
  });
});

describe("createProtokolDeratBod", () => {
  it("inserts a new derat bod", async () => {
    const newBod = {
      protokol_id: "pr1",
      cislo_bodu: "L3",
      typ_stanicky: "potkan" as const,
      pozer_procent: 25,
      stav_stanicky: "ok" as const,
    };
    const supabase = createMockSupabase({
      data: { id: "db-new", ...newBod },
      error: null,
    });

    await createProtokolDeratBod(supabase, newBod as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_deratizacni_body");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newBod);
  });
});

describe("deleteProtokolDeratBod", () => {
  it("soft-deletes derat bod", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteProtokolDeratBod(supabase, "db1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_deratizacni_body");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "db1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
  });
});

// ============================================================
// Dezinsekční body
// ============================================================

describe("getProtokolDezinsBody", () => {
  it("queries dezins body for protokol", async () => {
    const body = [
      { id: "zb1", cislo_bodu: "H1", typ_lapace: "lezouci_hmyz", pocet: 3 },
    ];
    const supabase = createMockSupabase({ data: body, error: null });

    const result = await getProtokolDezinsBody(supabase, "pr1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_dezinsekci_body");
    expect(supabase._chain.eq).toHaveBeenCalledWith("protokol_id", "pr1");
    expect(result.data).toEqual(body);
  });
});

describe("createProtokolDezinsBod", () => {
  it("inserts a new dezins bod", async () => {
    const newBod = {
      protokol_id: "pr1",
      cislo_bodu: "H2",
      typ_lapace: "letajici_hmyz" as const,
      pocet: 5,
    };
    const supabase = createMockSupabase({
      data: { id: "zb-new", ...newBod },
      error: null,
    });

    await createProtokolDezinsBod(supabase, newBod as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_dezinsekci_body");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newBod);
  });
});

// ============================================================
// Postřik
// ============================================================

describe("getProtokolPostrik", () => {
  it("queries postrik for protokol with pripravky join", async () => {
    const postrik = [
      { id: "ps1", skudce: "Štěnice", plocha_m2: 50 },
    ];
    const supabase = createMockSupabase({ data: postrik, error: null });

    const result = await getProtokolPostrik(supabase, "pr1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik");
    expect(supabase._chain.eq).toHaveBeenCalledWith("protokol_id", "pr1");
    expect(result.data).toEqual(postrik);
  });
});

describe("createProtokolPostrik", () => {
  it("inserts a new postrik record", async () => {
    const newPostrik = {
      protokol_id: "pr1",
      skudce: "Šváb obecný",
      plocha_m2: 80,
      typ_zakroku: "postrik" as const,
    };
    const supabase = createMockSupabase({
      data: { id: "ps-new", ...newPostrik },
      error: null,
    });

    await createProtokolPostrik(supabase, newPostrik as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newPostrik);
  });
});

// ============================================================
// Fotky
// ============================================================

describe("getProtokolFotky", () => {
  it("queries fotky for protokol", async () => {
    const fotky = [
      { id: "f1", soubor_url: "https://example.com/foto1.jpg" },
    ];
    const supabase = createMockSupabase({ data: fotky, error: null });

    const result = await getProtokolFotky(supabase, "pr1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_fotky");
    expect(supabase._chain.eq).toHaveBeenCalledWith("protokol_id", "pr1");
    expect(result.data).toEqual(fotky);
  });
});

describe("createProtokolFotka", () => {
  it("inserts a new fotka record", async () => {
    const newFotka = {
      protokol_id: "pr1",
      soubor_url: "https://storage/foto.jpg",
      popis: "Vstup do objektu",
    };
    const supabase = createMockSupabase({
      data: { id: "f-new", ...newFotka },
      error: null,
    });

    await createProtokolFotka(supabase, newFotka as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_fotky");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newFotka);
  });
});

describe("deleteProtokolFotka", () => {
  it("soft-deletes fotka by setting deleted_at", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteProtokolFotka(supabase, "f1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_fotky");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "f1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
    expect(typeof updateCall.deleted_at).toBe("string");
    expect(new Date(updateCall.deleted_at).getTime()).not.toBeNaN();
  });
});

// ============================================================
// Nové testy po AI Review — chybějící funkce
// ============================================================

describe("updateProtokolDeratBod", () => {
  it("updates derat bod by id", async () => {
    const updateData = { pozer_procent: 75 };
    const supabase = createMockSupabase({
      data: { id: "db1", pozer_procent: 75 },
      error: null,
    });

    await updateProtokolDeratBod(supabase, "db1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_deratizacni_body");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "db1");
    expect(supabase._chain.is).toHaveBeenCalledWith("deleted_at", null);
  });
});

describe("updateProtokolDezinsBod", () => {
  it("updates dezins bod by id", async () => {
    const updateData = { pocet: 10 };
    const supabase = createMockSupabase({
      data: { id: "zb1", pocet: 10 },
      error: null,
    });

    await updateProtokolDezinsBod(supabase, "zb1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_dezinsekci_body");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "zb1");
  });
});

describe("deleteProtokolDezinsBod", () => {
  it("soft-deletes dezins bod", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteProtokolDezinsBod(supabase, "zb1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_dezinsekci_body");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "zb1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
  });
});

describe("updateProtokolPostrik", () => {
  it("updates postrik by id", async () => {
    const updateData = { skudce: "Potkan obecný", plocha_m2: 120 };
    const supabase = createMockSupabase({
      data: { id: "ps1", ...updateData },
      error: null,
    });

    await updateProtokolPostrik(supabase, "ps1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "ps1");
  });
});

describe("deleteProtokolPostrik", () => {
  it("soft-deletes postrik record", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteProtokolPostrik(supabase, "ps1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "ps1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
  });
});

describe("createProtokolPostrikPripravek", () => {
  it("inserts a new postrik pripravek", async () => {
    const newPripravek = {
      postrik_id: "ps1",
      pripravek_id: "prep1",
      spotreba: "2 l",
      koncentrace_procent: 0.5,
    };
    const supabase = createMockSupabase({
      data: { id: "pp-new", ...newPripravek },
      error: null,
    });

    await createProtokolPostrikPripravek(supabase, newPripravek as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik_pripravky");
    expect(supabase._chain.insert).toHaveBeenCalledWith(newPripravek);
  });
});

describe("updateProtokolPostrikPripravek", () => {
  it("updates postrik pripravek by id", async () => {
    const updateData = { spotreba: "3 l", koncentrace_procent: 1.0 };
    const supabase = createMockSupabase({
      data: { id: "pp1", ...updateData },
      error: null,
    });

    await updateProtokolPostrikPripravek(supabase, "pp1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik_pripravky");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "pp1");
  });
});

describe("deleteProtokolPostrikPripravek", () => {
  it("soft-deletes postrik pripravek", async () => {
    const supabase = createMockSupabase({ data: null, error: null });

    await deleteProtokolPostrikPripravek(supabase, "pp1");

    expect(supabase.from).toHaveBeenCalledWith("protokol_postrik_pripravky");
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "pp1");
    const updateCall = supabase._chain.update.mock.calls[0][0];
    expect(updateCall).toHaveProperty("deleted_at");
  });
});

describe("updateProtokolFotka", () => {
  it("updates fotka description by id", async () => {
    const updateData = { popis: "Nový popis" };
    const supabase = createMockSupabase({
      data: { id: "f1", popis: "Nový popis" },
      error: null,
    });

    await updateProtokolFotka(supabase, "f1", updateData as never);

    expect(supabase.from).toHaveBeenCalledWith("protokol_fotky");
    expect(supabase._chain.update).toHaveBeenCalledWith(updateData);
    expect(supabase._chain.eq).toHaveBeenCalledWith("id", "f1");
  });
});
