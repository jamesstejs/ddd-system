import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing actions
const mockGetUser = vi.fn();
const mockGetProfile = vi.fn();
const mockGetProtokol = vi.fn();
const mockUpdateProtokol = vi.fn();
const mockRequireAdmin = vi.fn();
const mockRequireTechnik = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

vi.mock("@/lib/supabase/queries/profiles", () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

vi.mock("@/lib/supabase/queries/protokoly", () => ({
  getProtokol: (...args: unknown[]) => mockGetProtokol(...args),
  updateProtokol: (...args: unknown[]) => mockUpdateProtokol(...args),
  getProtokolByZasah: vi.fn(),
  createProtokol: vi.fn(),
  getProtokolDeratBody: vi.fn().mockResolvedValue({ data: [] }),
  createProtokolDeratBod: vi.fn(),
  updateProtokolDeratBod: vi.fn(),
  deleteProtokolDeratBod: vi.fn(),
  getProtokolDezinsBody: vi.fn().mockResolvedValue({ data: [] }),
  createProtokolDezinsBod: vi.fn(),
  updateProtokolDezinsBod: vi.fn(),
  deleteProtokolDezinsBod: vi.fn(),
  getProtokolPostrik: vi.fn().mockResolvedValue({ data: [] }),
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

vi.mock("@/lib/supabase/queries/okruhy", () => ({
  getOkruhy: vi.fn(),
}));

vi.mock("@/lib/supabase/queries/pripravky", () => ({
  getAktivniPripravky: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock("@/lib/utils/protokolUtils", () => ({
  prefillBodyFromPrevious: vi.fn(),
  prefillDezinsBodyFromPrevious: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@/lib/auth/requireTechnik", () => ({
  requireTechnik: () => mockRequireTechnik(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({}));

import {
  adminApproveProtokolAction,
  adminRejectProtokolAction,
} from "../protokolActions";

const VALID_UUID = "12345678-1234-1234-1234-123456789012";

describe("adminApproveProtokolAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      supabase: {},
      user: { id: "admin-1" },
      profile: { role: ["admin"] },
    });
  });

  it("schv\u00e1l\u00ed protokol ve stavu ke_schvaleni", async () => {
    mockGetProtokol.mockResolvedValue({
      data: { id: VALID_UUID, status: "ke_schvaleni" },
    });
    mockUpdateProtokol.mockResolvedValue({ error: null });

    await adminApproveProtokolAction(VALID_UUID);

    expect(mockUpdateProtokol).toHaveBeenCalledWith(
      expect.anything(),
      VALID_UUID,
      { status: "schvaleny", admin_komentar: null },
    );
  });

  it("zam\u00edtne neplatn\u00e9 UUID", async () => {
    await expect(adminApproveProtokolAction("bad-id")).rejects.toThrow(
      "Neplatn\u00fd form\u00e1t ID protokolu",
    );
  });

  it("zam\u00edtne protokol v jin\u00e9m stavu", async () => {
    mockGetProtokol.mockResolvedValue({
      data: { id: VALID_UUID, status: "rozpracovany" },
    });

    await expect(adminApproveProtokolAction(VALID_UUID)).rejects.toThrow(
      "Schv\u00e1lit lze pouze protokol ve stavu ke schv\u00e1len\u00ed",
    );
  });

  it("zam\u00edtne neexistuj\u00edc\u00ed protokol", async () => {
    mockGetProtokol.mockResolvedValue({ data: null });

    await expect(adminApproveProtokolAction(VALID_UUID)).rejects.toThrow(
      "Protokol nenalezen",
    );
  });
});

describe("adminRejectProtokolAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({
      supabase: {},
      user: { id: "admin-1" },
      profile: { role: ["admin"] },
    });
  });

  it("vr\u00e1t\u00ed protokol s koment\u00e1\u0159em", async () => {
    mockGetProtokol.mockResolvedValue({
      data: { id: VALID_UUID, status: "ke_schvaleni" },
    });
    mockUpdateProtokol.mockResolvedValue({ error: null });

    await adminRejectProtokolAction(VALID_UUID, "Chyb\u00ed podpis klienta, pros\u00edm dopln\u011bte");

    expect(mockUpdateProtokol).toHaveBeenCalledWith(
      expect.anything(),
      VALID_UUID,
      {
        status: "rozpracovany",
        admin_komentar: "Chyb\u00ed podpis klienta, pros\u00edm dopln\u011bte",
      },
    );
  });

  it("vy\u017eaduje koment\u00e1\u0159 minim\u00e1ln\u011b 10 znak\u016f", async () => {
    await expect(
      adminRejectProtokolAction(VALID_UUID, "kr\u00e1tk\u00fd"),
    ).rejects.toThrow("Koment\u00e1\u0159 mus\u00ed m\u00edt alespo\u0148 10 znak\u016f");
  });

  it("vy\u017eaduje nepr\u00e1zdn\u00fd koment\u00e1\u0159", async () => {
    await expect(
      adminRejectProtokolAction(VALID_UUID, ""),
    ).rejects.toThrow("Koment\u00e1\u0159 mus\u00ed m\u00edt alespo\u0148 10 znak\u016f");
  });

  it("zam\u00edtne protokol v jin\u00e9m stavu", async () => {
    mockGetProtokol.mockResolvedValue({
      data: { id: VALID_UUID, status: "schvaleny" },
    });

    await expect(
      adminRejectProtokolAction(VALID_UUID, "Dostate\u010dn\u011b dlouh\u00fd koment\u00e1\u0159"),
    ).rejects.toThrow("Vr\u00e1tit lze pouze protokol ve stavu ke schv\u00e1len\u00ed");
  });
});
