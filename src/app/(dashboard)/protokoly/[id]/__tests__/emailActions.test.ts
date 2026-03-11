import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------

const mockGetProtokol = vi.fn();
const mockUpdateProtokol = vi.fn();
const mockGetProtokolPostrik = vi.fn();
const mockGetProtokolDeratBody = vi.fn();
const mockGetProtokolDezinsBody = vi.fn();

vi.mock("@/lib/supabase/queries/protokoly", () => ({
  getProtokol: (...args: unknown[]) => mockGetProtokol(...args),
  updateProtokol: (...args: unknown[]) => mockUpdateProtokol(...args),
  getProtokolPostrik: (...args: unknown[]) => mockGetProtokolPostrik(...args),
  getProtokolDeratBody: (...args: unknown[]) => mockGetProtokolDeratBody(...args),
  getProtokolDezinsBody: (...args: unknown[]) => mockGetProtokolDezinsBody(...args),
  createProtokol: vi.fn(),
  getProtokolByZasah: vi.fn(),
  createProtokolDeratBod: vi.fn(),
  updateProtokolDeratBod: vi.fn(),
  deleteProtokolDeratBod: vi.fn(),
  createProtokolDezinsBod: vi.fn(),
  updateProtokolDezinsBod: vi.fn(),
  deleteProtokolDezinsBod: vi.fn(),
  createProtokolPostrik: vi.fn(),
  updateProtokolPostrik: vi.fn(),
  deleteProtokolPostrik: vi.fn(),
  createProtokolPostrikPripravek: vi.fn(),
  updateProtokolPostrikPripravek: vi.fn(),
  deleteProtokolPostrikPripravek: vi.fn(),
  getLatestProtokolForObjekt: vi.fn(),
  createProtokolFotka: vi.fn(),
  deleteProtokolFotka: vi.fn(),
}));

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/auth/requireTechnik", () => ({
  requireTechnik: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/profiles", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({}));

vi.mock("@/lib/supabase/queries/okruhy", () => ({
  getOkruhy: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/pripravky", () => ({
  getAktivniPripravky: vi.fn(),
}));

vi.mock("@/lib/utils/protokolUtils", () => ({
  prefillBodyFromPrevious: vi.fn(),
  prefillDezinsBodyFromPrevious: vi.fn(),
}));

const mockSendProtokolEmail = vi.fn();
vi.mock("@/lib/email/resend", () => ({
  sendProtokolEmail: (...args: unknown[]) => mockSendProtokolEmail(...args),
}));

const mockRenderProtokolEmailHtml = vi.fn();
vi.mock("@/lib/email/templates/ProtokolEmail", () => ({
  renderProtokolEmailHtml: (...args: unknown[]) => mockRenderProtokolEmailHtml(...args),
}));

const mockCreateEmailLog = vi.fn();
vi.mock("@/lib/supabase/queries/email_log", () => ({
  createEmailLog: (...args: unknown[]) => mockCreateEmailLog(...args),
}));

const mockGetBezpecnostniListy = vi.fn();
vi.mock("@/lib/supabase/queries/bezpecnostni_listy", () => ({
  getBezpecnostniListy: (...args: unknown[]) => mockGetBezpecnostniListy(...args),
}));

const mockRenderToBuffer = vi.fn();
vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: (...args: unknown[]) => mockRenderToBuffer(...args),
}));

vi.mock("@/lib/pdf/dezinsekniProtokol", () => ({
  DezinsekniProtokolPdf: vi.fn().mockReturnValue(null),
  buildDezinsekniPdfData: vi.fn().mockReturnValue({
    cislo_protokolu: "P-TST-001",
  }),
}));

import { sendProtokolEmailAction } from "../protokolActions";

// ---------- Helpers ----------

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const mockProtokol = {
  id: VALID_UUID,
  cislo_protokolu: "P-TST-001",
  status: "schvaleny",
  poznamka: null,
  zasah_id: "z1",
  veta_ucinnosti: "Účinnost dostatečná",
  podpis_klient_url: null,
  admin_komentar: null,
  zodpovedny_technik: "Pavel Horák",
  zasahy: {
    datum: "2026-03-11",
    zakazky: {
      objekty: {
        id: "obj1",
        nazev: "Sklad Praha",
        adresa: "Ulice 1",
        klienti: {
          nazev: "ACME s.r.o.",
          jmeno: "Jan",
          prijmeni: "Novák",
          ico: "12345678",
          dic: "CZ12345678",
          adresa: "Firemní 42",
          email: "klient@example.com",
          telefon: "+420123456789",
        },
      },
    },
  },
};

const mockSupabase = {} as Record<string, unknown>;

function setupAdminAndProtokol(overrides: Record<string, unknown> = {}) {
  mockRequireAdmin.mockResolvedValue({ supabase: mockSupabase });
  mockGetProtokol.mockResolvedValue({
    data: { ...mockProtokol, ...overrides },
    error: null,
  });
  mockGetProtokolPostrik.mockResolvedValue({ data: [] });
  mockGetProtokolDeratBody.mockResolvedValue({ data: [] });
  mockGetProtokolDezinsBody.mockResolvedValue({ data: [] });
  mockRenderToBuffer.mockResolvedValue(Buffer.from("pdf"));
  mockRenderProtokolEmailHtml.mockReturnValue("<p>Email</p>");
  mockSendProtokolEmail.mockResolvedValue("resend_123");
  mockCreateEmailLog.mockResolvedValue({ data: {}, error: null });
  mockUpdateProtokol.mockResolvedValue({ error: null });
  mockGetBezpecnostniListy.mockResolvedValue({ data: [] });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// sendProtokolEmailAction
// ============================================================

describe("sendProtokolEmailAction", () => {
  it("rejects invalid UUID", async () => {
    const result = await sendProtokolEmailAction("not-a-uuid");
    expect(result).toEqual({
      success: false,
      error: "Neplatný formát ID protokolu",
    });
  });

  it("requires admin role", async () => {
    mockRequireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(sendProtokolEmailAction(VALID_UUID)).rejects.toThrow(
      "Forbidden",
    );
  });

  it("rejects when protocol not found", async () => {
    mockRequireAdmin.mockResolvedValue({ supabase: mockSupabase });
    mockGetProtokol.mockResolvedValue({ data: null, error: null });

    const result = await sendProtokolEmailAction(VALID_UUID);
    expect(result).toEqual({
      success: false,
      error: "Protokol nenalezen",
    });
  });

  it("rejects protocol not in schvaleny status", async () => {
    setupAdminAndProtokol({ status: "rozpracovany" });

    const result = await sendProtokolEmailAction(VALID_UUID);
    expect(result).toEqual({
      success: false,
      error: "Odeslat lze pouze schválený protokol",
    });
  });

  it("rejects when klient has no email", async () => {
    setupAdminAndProtokol();
    // Override klient email to null
    mockGetProtokol.mockResolvedValue({
      data: {
        ...mockProtokol,
        zasahy: {
          ...mockProtokol.zasahy,
          zakazky: {
            objekty: {
              ...mockProtokol.zasahy.zakazky.objekty,
              klienti: {
                ...mockProtokol.zasahy.zakazky.objekty.klienti,
                email: null,
              },
            },
          },
        },
      },
      error: null,
    });

    const result = await sendProtokolEmailAction(VALID_UUID);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Klient nemá zadaný email");
  });

  it("successfully sends email and updates status", async () => {
    setupAdminAndProtokol();

    const result = await sendProtokolEmailAction(VALID_UUID);

    expect(result).toEqual({ success: true });
    expect(mockSendProtokolEmail).toHaveBeenCalledTimes(1);
    expect(mockSendProtokolEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "klient@example.com",
      }),
    );
    // Verify status update
    expect(mockUpdateProtokol).toHaveBeenCalledWith(
      mockSupabase,
      VALID_UUID,
      { status: "odeslany" },
    );
  });

  it("creates email_log on success", async () => {
    setupAdminAndProtokol();

    await sendProtokolEmailAction(VALID_UUID);

    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        protokol_id: VALID_UUID,
        prijemce: "klient@example.com",
        typ: "protokol",
        stav: "odeslano",
        resend_id: "resend_123",
      }),
    );
  });

  it("creates error email_log on failure", async () => {
    setupAdminAndProtokol();
    mockSendProtokolEmail.mockRejectedValue(new Error("Network error"));

    const result = await sendProtokolEmailAction(VALID_UUID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        stav: "chyba",
        chyba_detail: "Network error",
      }),
    );
  });

  it("does not update status on email failure", async () => {
    setupAdminAndProtokol();
    mockSendProtokolEmail.mockRejectedValue(new Error("API error"));

    await sendProtokolEmailAction(VALID_UUID);

    // updateProtokol should NOT be called for status change
    expect(mockUpdateProtokol).not.toHaveBeenCalledWith(
      expect.anything(),
      VALID_UUID,
      expect.objectContaining({ status: "odeslany" }),
    );
  });

  it("includes PDF attachment in email", async () => {
    setupAdminAndProtokol();

    await sendProtokolEmailAction(VALID_UUID);

    expect(mockSendProtokolEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({
            filename: "P-TST-001.pdf",
          }),
        ]),
      }),
    );
  });

  it("rejects ke_schvaleni status", async () => {
    setupAdminAndProtokol({ status: "ke_schvaleni" });

    const result = await sendProtokolEmailAction(VALID_UUID);
    expect(result.success).toBe(false);
  });

  it("rejects odeslany status (already sent)", async () => {
    setupAdminAndProtokol({ status: "odeslany" });

    const result = await sendProtokolEmailAction(VALID_UUID);
    expect(result.success).toBe(false);
  });

  // ==========================================================
  // Test with postrik data (pripravky array with BL references)
  // ==========================================================

  it("processes postrik data with pripravky and includes BL attachments", async () => {
    setupAdminAndProtokol();

    // Mock postrik data with nested pripravky
    mockGetProtokolPostrik.mockResolvedValue({
      data: [
        {
          id: "ps1",
          skudce: "Štěnice obecná",
          plocha_m2: 80,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            {
              spotreba: "2l",
              koncentrace_procent: 5,
              pripravky: {
                id: "prip-1",
                nazev: "Bayer K-Othrine",
                ucinna_latka: "Deltamethrin",
                protilatka: "Atropin",
              },
            },
            {
              spotreba: "1l",
              koncentrace_procent: 3,
              pripravky: {
                id: "prip-2",
                nazev: "Syngenta Icon",
                ucinna_latka: "Lambda-cyhalothrin",
                protilatka: null,
              },
            },
          ],
        },
      ],
    });

    // Mock BL file data for each pripravek
    mockGetBezpecnostniListy
      .mockResolvedValueOnce({
        data: [
          {
            id: "bl1",
            soubor_url: "https://storage.example.com/bl-kothrine.pdf",
            nazev_souboru: "BL-K-Othrine.pdf",
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "bl2",
            soubor_url: "https://storage.example.com/bl-icon.pdf",
            nazev_souboru: "BL-Icon.pdf",
          },
        ],
      });

    // Mock global fetch for BL file downloads
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(200)),
      });

    try {
      const result = await sendProtokolEmailAction(VALID_UUID);

      expect(result).toEqual({ success: true });
      // Verify BL queries were made for each unique pripravek ID
      expect(mockGetBezpecnostniListy).toHaveBeenCalledWith(mockSupabase, "prip-1");
      expect(mockGetBezpecnostniListy).toHaveBeenCalledWith(mockSupabase, "prip-2");
      // Email should include PDF + 2 BL attachments
      expect(mockSendProtokolEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: "P-TST-001.pdf" }),
            expect.objectContaining({ filename: "BL-K-Othrine.pdf" }),
            expect.objectContaining({ filename: "BL-Icon.pdf" }),
          ]),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ==========================================================
  // Test BL attachment fetching — mock fetch for BL URLs
  // ==========================================================

  it("skips BL attachment when fetch fails", async () => {
    setupAdminAndProtokol();

    mockGetProtokolPostrik.mockResolvedValue({
      data: [
        {
          id: "ps1",
          skudce: "Štěnice",
          plocha_m2: 50,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            {
              spotreba: "1l",
              koncentrace_procent: 5,
              pripravky: {
                id: "prip-fail",
                nazev: "BrokenPrep",
                ucinna_latka: "X",
                protilatka: null,
              },
            },
          ],
        },
      ],
    });

    mockGetBezpecnostniListy.mockResolvedValue({
      data: [
        {
          id: "bl-fail",
          soubor_url: "https://storage.example.com/broken.pdf",
          nazev_souboru: "BL-Broken.pdf",
        },
      ],
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    try {
      const result = await sendProtokolEmailAction(VALID_UUID);

      // Should still succeed — broken BL is skipped silently
      expect(result).toEqual({ success: true });
      // Attachments should only include the PDF, not the broken BL
      expect(mockSendProtokolEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: expect.arrayContaining([
            expect.objectContaining({ filename: "P-TST-001.pdf" }),
          ]),
        }),
      );
      // Verify the BL attachment is NOT in the list
      const sentAttachments = mockSendProtokolEmail.mock.calls[0][0].attachments;
      const blAttachment = sentAttachments.find(
        (a: { filename: string }) => a.filename === "BL-Broken.pdf",
      );
      expect(blAttachment).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("skips BL attachment when fetch returns non-OK status", async () => {
    setupAdminAndProtokol();

    mockGetProtokolPostrik.mockResolvedValue({
      data: [
        {
          id: "ps1",
          skudce: "Rus",
          plocha_m2: 30,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            {
              spotreba: "0.5l",
              koncentrace_procent: 2,
              pripravky: {
                id: "prip-404",
                nazev: "NotFoundPrep",
                ucinna_latka: "Y",
                protilatka: null,
              },
            },
          ],
        },
      ],
    });

    mockGetBezpecnostniListy.mockResolvedValue({
      data: [
        {
          id: "bl-404",
          soubor_url: "https://storage.example.com/missing.pdf",
          nazev_souboru: "BL-Missing.pdf",
        },
      ],
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });

    try {
      const result = await sendProtokolEmailAction(VALID_UUID);
      expect(result).toEqual({ success: true });
      const sentAttachments = mockSendProtokolEmail.mock.calls[0][0].attachments;
      expect(sentAttachments).toHaveLength(1); // only PDF
      expect(sentAttachments[0].filename).toBe("P-TST-001.pdf");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ==========================================================
  // Test email subject format
  // ==========================================================

  it("email subject includes protocol number and Deraplus brand", async () => {
    setupAdminAndProtokol();

    await sendProtokolEmailAction(VALID_UUID);

    expect(mockSendProtokolEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Protokol P-TST-001 \u2014 Deraplus",
      }),
    );
  });

  it("email subject uses em dash separator", async () => {
    setupAdminAndProtokol();

    await sendProtokolEmailAction(VALID_UUID);

    const calledSubject = mockSendProtokolEmail.mock.calls[0][0].subject;
    expect(calledSubject).toContain("\u2014"); // em dash
  });

  // ==========================================================
  // Test HTML rendering called with correct params
  // ==========================================================

  it("calls renderProtokolEmailHtml with correct params", async () => {
    setupAdminAndProtokol();

    await sendProtokolEmailAction(VALID_UUID);

    expect(mockRenderProtokolEmailHtml).toHaveBeenCalledTimes(1);
    expect(mockRenderProtokolEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        cisloProtokolu: "P-TST-001",
        klientName: "ACME s.r.o.",
        objektNazev: "Sklad Praha",
      }),
    );
  });

  it("renderProtokolEmailHtml receives formatted date", async () => {
    setupAdminAndProtokol();

    await sendProtokolEmailAction(VALID_UUID);

    const callArgs = mockRenderProtokolEmailHtml.mock.calls[0][0];
    // datumZasahu should be a formatted date string (Czech locale)
    expect(callArgs.datumZasahu).toBeDefined();
    expect(typeof callArgs.datumZasahu).toBe("string");
    // The date "2026-03-11" formatted in cs-CZ locale
    expect(callArgs.datumZasahu).not.toBe("2026-03-11");
  });

  it("renderProtokolEmailHtml receives BL filenames from attachments", async () => {
    setupAdminAndProtokol();

    mockGetProtokolPostrik.mockResolvedValue({
      data: [
        {
          id: "ps1",
          skudce: "Potkan",
          plocha_m2: 100,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            {
              spotreba: "1l",
              koncentrace_procent: 5,
              pripravky: {
                id: "prip-bl",
                nazev: "Rodilon",
                ucinna_latka: "Brodifacoum",
                protilatka: "Vitamin K1",
              },
            },
          ],
        },
      ],
    });

    mockGetBezpecnostniListy.mockResolvedValue({
      data: [
        {
          id: "bl-1",
          soubor_url: "https://storage.example.com/bl.pdf",
          nazev_souboru: "BL-Rodilon.pdf",
        },
      ],
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(50)),
    });

    try {
      await sendProtokolEmailAction(VALID_UUID);

      const callArgs = mockRenderProtokolEmailHtml.mock.calls[0][0];
      expect(callArgs.bezpecnostniListy).toEqual(["BL-Rodilon.pdf"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ==========================================================
  // Test that updateProtokol is NOT called when email send fails
  // ==========================================================

  it("does NOT call updateProtokol when sendProtokolEmail throws", async () => {
    setupAdminAndProtokol();
    mockSendProtokolEmail.mockRejectedValue(new Error("Resend error: Rate limited"));

    const result = await sendProtokolEmailAction(VALID_UUID);

    expect(result.success).toBe(false);
    // updateProtokol should NOT have been called at all
    expect(mockUpdateProtokol).not.toHaveBeenCalled();
  });

  it("does NOT call updateProtokol when renderToBuffer throws", async () => {
    setupAdminAndProtokol();
    mockRenderToBuffer.mockRejectedValue(new Error("PDF render failed"));

    const result = await sendProtokolEmailAction(VALID_UUID);

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF render failed");
    expect(mockUpdateProtokol).not.toHaveBeenCalled();
  });

  // ==========================================================
  // Test sequential calls (second call after first completes)
  // ==========================================================

  it("handles sequential calls independently", async () => {
    setupAdminAndProtokol();

    const result1 = await sendProtokolEmailAction(VALID_UUID);
    expect(result1).toEqual({ success: true });
    expect(mockSendProtokolEmail).toHaveBeenCalledTimes(1);

    // Reset all mocks between calls so the second call uses fresh state
    vi.clearAllMocks();
    setupAdminAndProtokol();

    const result2 = await sendProtokolEmailAction(VALID_UUID);
    expect(result2).toEqual({ success: true });
    expect(mockSendProtokolEmail).toHaveBeenCalledTimes(1);
  });

  it("failure on first call does not prevent second call from succeeding", async () => {
    setupAdminAndProtokol();
    mockSendProtokolEmail.mockRejectedValue(new Error("First failed"));

    const result1 = await sendProtokolEmailAction(VALID_UUID);
    expect(result1.success).toBe(false);
    expect(result1.error).toBe("First failed");

    // Reset and make the second call succeed
    setupAdminAndProtokol();

    const result2 = await sendProtokolEmailAction(VALID_UUID);
    expect(result2).toEqual({ success: true });
  });

  // ==========================================================
  // Email log includes odeslano_at timestamp
  // ==========================================================

  it("email_log on success includes odeslano_at ISO timestamp", async () => {
    setupAdminAndProtokol();

    const result = await sendProtokolEmailAction(VALID_UUID);
    expect(result.success).toBe(true);

    // createEmailLog should have been called with stav: "odeslano"
    expect(mockCreateEmailLog).toHaveBeenCalled();
    // Find the success call (stav === "odeslano")
    const successCall = mockCreateEmailLog.mock.calls.find(
      (call: unknown[]) => (call[1] as Record<string, unknown>).stav === "odeslano",
    );
    expect(successCall).toBeDefined();
    const logData = successCall![1] as Record<string, unknown>;
    expect(logData.odeslano_at).toBeDefined();
    // Should be a valid ISO date string
    expect(new Date(logData.odeslano_at as string).getTime()).not.toBeNaN();
  });

  // ==========================================================
  // Non-Error thrown object handling
  // ==========================================================

  it("returns Error.message when sendProtokolEmail throws an Error", async () => {
    setupAdminAndProtokol();
    mockSendProtokolEmail.mockRejectedValue(new Error("Specific error message"));

    const result = await sendProtokolEmailAction(VALID_UUID);

    expect(result.success).toBe(false);
    // Error instances should have their message extracted
    expect(result.error).toBe("Specific error message");
  });

  it("error log includes chyba_detail from Error.message", async () => {
    setupAdminAndProtokol();
    mockSendProtokolEmail.mockRejectedValue(new Error("Detailed failure reason"));

    const result = await sendProtokolEmailAction(VALID_UUID);

    expect(result.success).toBe(false);
    expect(mockCreateEmailLog).toHaveBeenCalledWith(
      mockSupabase,
      expect.objectContaining({
        chyba_detail: "Detailed failure reason",
      }),
    );
  });

  // ==========================================================
  // Klient name fallback logic
  // ==========================================================

  it("uses prijmeni + jmeno when nazev is empty", async () => {
    setupAdminAndProtokol();
    mockGetProtokol.mockResolvedValue({
      data: {
        ...mockProtokol,
        zasahy: {
          ...mockProtokol.zasahy,
          zakazky: {
            objekty: {
              ...mockProtokol.zasahy.zakazky.objekty,
              klienti: {
                ...mockProtokol.zasahy.zakazky.objekty.klienti,
                nazev: null,
                jmeno: "Jan",
                prijmeni: "Novák",
              },
            },
          },
        },
      },
      error: null,
    });

    await sendProtokolEmailAction(VALID_UUID);

    expect(mockRenderProtokolEmailHtml).toHaveBeenCalledWith(
      expect.objectContaining({
        klientName: expect.stringContaining("Novák"),
      }),
    );
  });
});
