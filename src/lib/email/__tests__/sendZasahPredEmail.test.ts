import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

const mockGetZasah = vi.fn();
vi.mock("@/lib/supabase/queries/zasahy", () => ({
  getZasah: (...args: unknown[]) => mockGetZasah(...args),
}));

const mockGetPouceniForZasah = vi.fn();
vi.mock("@/lib/supabase/queries/sablony_pouceni", () => ({
  getPouceniForZasah: (...args: unknown[]) => mockGetPouceniForZasah(...args),
}));

const mockGetAktivniPripravky = vi.fn();
vi.mock("@/lib/supabase/queries/pripravky", () => ({
  getAktivniPripravky: (...args: unknown[]) => mockGetAktivniPripravky(...args),
}));

const mockGetBezpecnostniListy = vi.fn();
vi.mock("@/lib/supabase/queries/bezpecnostni_listy", () => ({
  getBezpecnostniListy: (...args: unknown[]) =>
    mockGetBezpecnostniListy(...args),
}));

const mockCreateEmailLog = vi.fn();
vi.mock("@/lib/supabase/queries/email_log", () => ({
  createEmailLog: (...args: unknown[]) => mockCreateEmailLog(...args),
}));

const mockSendProtokolEmail = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendProtokolEmail: (...args: unknown[]) => mockSendProtokolEmail(...args),
}));

const mockRenderZasahPredEmailHtml = vi.fn();
vi.mock("@/lib/email/templates/ZasahPredEmail", () => ({
  renderZasahPredEmailHtml: (...args: unknown[]) =>
    mockRenderZasahPredEmailHtml(...args),
}));

// ---------- Import after mocks ----------

import {
  sendZasahPredEmail,
  findRelevantPripravky,
} from "../sendZasahPredEmail";

// ---------- Helpers ----------

function makeZasah(overrides: Record<string, unknown> = {}) {
  return {
    id: "zasah-1",
    datum: "2026-03-15",
    cas_od: "09:00",
    cas_do: "10:00",
    status: "naplanovano",
    zakazky: {
      id: "zakazka-1",
      typy_zasahu: ["vnitřní deratizace"],
      skudci: ["Potkan obecný"],
      objekty: {
        id: "objekt-1",
        nazev: "Restaurace U Pávů",
        adresa: "Hlavní 1, Praha",
        typ_objektu: "gastro",
        klienti: {
          id: "klient-1",
          nazev: "Restaurace U Pávů s.r.o.",
          jmeno: null,
          prijmeni: null,
          typ: "firma",
          email: "klient@example.com",
          telefon: "+420111222333",
        },
      },
    },
    ...overrides,
  };
}

const fakeSupabase = {} as never;

// ---------- Tests ----------

describe("sendZasahPredEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderZasahPredEmailHtml.mockReturnValue("<html>test</html>");
    mockSendProtokolEmail.mockResolvedValue("resend-123");
    mockCreateEmailLog.mockResolvedValue({ data: {}, error: null });
    mockGetPouceniForZasah.mockResolvedValue({
      data: [
        {
          id: "p1",
          nazev: "Deratizace — obecné poučení",
          obsah: "Nemanipulujte se staničkami.",
        },
      ],
      error: null,
    });
    mockGetAktivniPripravky.mockResolvedValue({
      data: [
        {
          id: "prip-1",
          nazev: "Brodifacoum 0,005%",
          cilovy_skudce: ["Potkan obecný", "Myš domácí"],
          omezeni_prostor: ["potravinarsky", "prumysl"],
        },
      ],
      error: null,
    });
    mockGetBezpecnostniListy.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it("sends email successfully when client has email", async () => {
    mockGetZasah.mockResolvedValue({ data: makeZasah() });

    const result = await sendZasahPredEmail(fakeSupabase, "zasah-1");

    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(mockSendProtokolEmail).toHaveBeenCalledOnce();
    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({
        zasah_id: "zasah-1",
        prijemce: "klient@example.com",
        typ: "terminy",
        stav: "odeslano",
        resend_id: "resend-123",
      }),
    );
  });

  it("skips when client has no email", async () => {
    const zasah = makeZasah();
    (zasah.zakazky as Record<string, unknown>).objekty = {
      ...(zasah.zakazky as Record<string, unknown>).objekty as Record<string, unknown>,
      klienti: {
        id: "k1",
        nazev: "Test",
        email: null,
        typ: "firma",
      },
    };
    mockGetZasah.mockResolvedValue({ data: zasah });

    const result = await sendZasahPredEmail(fakeSupabase, "zasah-1");

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(mockSendProtokolEmail).not.toHaveBeenCalled();
  });

  it("returns error when zasah not found", async () => {
    mockGetZasah.mockResolvedValue({ data: null });

    const result = await sendZasahPredEmail(fakeSupabase, "bad-id");

    expect(result.success).toBe(false);
    expect(result.error).toContain("nenalezen");
  });

  it("passes correct data to email template", async () => {
    mockGetZasah.mockResolvedValue({ data: makeZasah() });

    await sendZasahPredEmail(fakeSupabase, "zasah-1");

    expect(mockRenderZasahPredEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        klientName: "Restaurace U Pávů s.r.o.",
        objektNazev: "Restaurace U Pávů",
        skudci: ["Potkan obecný"],
        typyZasahu: ["vnitřní deratizace"],
        pouceniTexty: expect.arrayContaining([
          expect.objectContaining({
            nazev: "Deratizace — obecné poučení",
          }),
        ]),
      }),
    );
  });

  it("fetches BL for relevant pripravky", async () => {
    mockGetZasah.mockResolvedValue({ data: makeZasah() });

    await sendZasahPredEmail(fakeSupabase, "zasah-1");

    // Should fetch BL for Brodifacoum which targets "Potkan obecný"
    expect(mockGetBezpecnostniListy).toHaveBeenCalledWith(
      fakeSupabase,
      "prip-1",
    );
  });

  it("logs error to email_log on send failure", async () => {
    mockGetZasah.mockResolvedValue({ data: makeZasah() });
    mockSendProtokolEmail.mockRejectedValue(new Error("Resend failed"));

    const result = await sendZasahPredEmail(fakeSupabase, "zasah-1");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Resend failed");
    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({
        stav: "chyba",
        chyba_detail: "Resend failed",
      }),
    );
  });

  it("uses klient jmeno/prijmeni when nazev is empty", async () => {
    const zasah = makeZasah();
    (zasah.zakazky as Record<string, unknown>).objekty = {
      ...(zasah.zakazky as Record<string, unknown>).objekty as Record<string, unknown>,
      klienti: {
        id: "k1",
        nazev: "",
        jmeno: "Jan",
        prijmeni: "Novák",
        email: "jan@example.com",
        typ: "fyzicka_osoba",
      },
    };
    mockGetZasah.mockResolvedValue({ data: zasah });

    await sendZasahPredEmail(fakeSupabase, "zasah-1");

    expect(mockRenderZasahPredEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        klientName: "Novák Jan",
      }),
    );
  });

  it("includes BL attachments from Supabase Storage", async () => {
    mockGetZasah.mockResolvedValue({ data: makeZasah() });
    mockGetBezpecnostniListy.mockResolvedValue({
      data: [
        {
          id: "bl-1",
          nazev_souboru: "Brodifacoum_BL.pdf",
          soubor_url: "https://storage.example.com/bl.pdf",
        },
      ],
      error: null,
    });

    // Mock fetch for BL download
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
    }) as unknown as typeof fetch;

    await sendZasahPredEmail(fakeSupabase, "zasah-1");

    expect(mockSendProtokolEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: "Brodifacoum_BL.pdf",
          }),
        ]),
      }),
    );

    global.fetch = originalFetch;
  });
});

describe("findRelevantPripravky", () => {
  const pripravky = [
    {
      id: "p1",
      nazev: "Brodifacoum",
      cilovy_skudce: ["Potkan obecný", "Myš domácí"],
      omezeni_prostor: ["potravinarsky", "prumysl"],
    },
    {
      id: "p2",
      nazev: "Deltamethrin",
      cilovy_skudce: ["Šváb obecný", "Rus domácí"],
      omezeni_prostor: ["domacnost", "prumysl"],
    },
    {
      id: "p3",
      nazev: "Imidacloprid",
      cilovy_skudce: ["Mravenec faraón"],
      omezeni_prostor: ["domacnost"],
    },
    {
      id: "p4",
      nazev: "Inactive",
      cilovy_skudce: null,
      omezeni_prostor: null,
    },
  ];

  it("finds pripravky matching skudce", () => {
    const result = findRelevantPripravky(pripravky, ["Potkan obecný"], "gastro");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("filters by typ prostoru (objekt type)", () => {
    const result = findRelevantPripravky(
      pripravky,
      ["Mravenec faraón"],
      "gastro", // maps to "potravinarsky"
    );
    // Imidacloprid targets Mravenec but only for "domacnost", not "potravinarsky"
    expect(result).toHaveLength(0);
  });

  it("returns pripravky for domacnost objekty", () => {
    const result = findRelevantPripravky(
      pripravky,
      ["Mravenec faraón"],
      "domacnost",
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p3");
  });

  it("returns empty when no skudci match", () => {
    const result = findRelevantPripravky(
      pripravky,
      ["Neexistující škůdce"],
      "gastro",
    );
    expect(result).toHaveLength(0);
  });

  it("returns empty when skudci array is empty", () => {
    const result = findRelevantPripravky(pripravky, [], "gastro");
    expect(result).toHaveLength(0);
  });

  it("handles case-insensitive matching", () => {
    const result = findRelevantPripravky(
      pripravky,
      ["potkan obecný"],
      "gastro",
    );
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });

  it("skips pripravky with null cilovy_skudce", () => {
    const result = findRelevantPripravky(
      pripravky,
      ["Potkan obecný"],
      "gastro",
    );
    expect(result.find((p) => p.id === "p4")).toBeUndefined();
  });

  it("includes pripravky when objektTyp has no mapping (null typProstoru)", () => {
    const result = findRelevantPripravky(
      pripravky,
      ["Potkan obecný"],
      "jiny", // maps to null
    );
    // Should include p1 since no prostor restriction applies when typProstoru is null
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p1");
  });
});
