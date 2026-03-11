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
});
