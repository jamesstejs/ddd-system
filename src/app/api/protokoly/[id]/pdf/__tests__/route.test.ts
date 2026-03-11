/**
 * Tests for /api/protokoly/[id]/pdf route.
 *
 * We mock all external dependencies (Supabase, queries, PDF renderer)
 * and test the route handler's authorization, data mapping, and error handling.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// ---------- Mocks ----------

const mockGetUser = vi.fn();
const mockGetProfile = vi.fn();
const mockGetProtokol = vi.fn();
const mockGetPostrik = vi.fn();
const mockGetDeratBody = vi.fn();
const mockGetDezinsBody = vi.fn();
const mockRenderToBuffer = vi.fn();
const mockBuildData = vi.fn();

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
  getProtokolPostrik: (...args: unknown[]) => mockGetPostrik(...args),
  getProtokolDeratBody: (...args: unknown[]) => mockGetDeratBody(...args),
  getProtokolDezinsBody: (...args: unknown[]) => mockGetDezinsBody(...args),
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: (...args: unknown[]) => mockRenderToBuffer(...args),
}));

vi.mock("@/lib/pdf/dezinsekniProtokol", () => ({
  DezinsekniProtokolPdf: vi.fn().mockReturnValue("mock-jsx"),
  buildDezinsekniPdfData: (...args: unknown[]) => mockBuildData(...args),
}));

// Import AFTER mocks are set up
const { GET } = await import("../route");

// ---------- Helpers ----------

function makeRequest() {
  return new NextRequest("http://localhost:3000/api/protokoly/test-id/pdf");
}

function makeParams(id = "test-id") {
  return { params: Promise.resolve({ id }) };
}

function setupAuth(role: string[] = ["admin"], userId = "user-1") {
  mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
  mockGetProfile.mockResolvedValue({
    data: { role },
  });
}

function setupProtokol(overrides: Record<string, unknown> = {}) {
  mockGetProtokol.mockResolvedValue({
    data: {
      id: "test-id",
      cislo_protokolu: "P-TST001-001",
      poznamka: "Test",
      veta_ucinnosti: "Účinnost OK",
      zodpovedny_technik: "Pavel Horák",
      technik_id: "user-1",
      zasahy: {
        datum: "2026-03-15",
        zakazky: {
          objekty: {
            nazev: "Provozovna",
            adresa: "Hlavní 1",
            klienti: {
              nazev: "Firma s.r.o.",
              jmeno: null,
              prijmeni: null,
              ico: "12345678",
              dic: "CZ12345678",
              adresa: "Praha 1",
              email: "test@test.cz",
              telefon: "777000111",
            },
          },
        },
      },
      ...overrides,
    },
    error: null,
  });
}

function setupEmptyData() {
  mockGetPostrik.mockResolvedValue({ data: [] });
  mockGetDeratBody.mockResolvedValue({ data: [] });
  mockGetDezinsBody.mockResolvedValue({ data: [] });
}

function setupPdfRender() {
  mockBuildData.mockReturnValue({ cislo_protokolu: "P-TST001-001" });
  mockRenderToBuffer.mockResolvedValue(Buffer.from("fake-pdf-content"));
}

// ---------- Tests ----------

describe("GET /api/protokoly/[id]/pdf — Authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when profile is not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockGetProfile.mockResolvedValue({ data: null });

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 401 when profile.role is not an array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockGetProfile.mockResolvedValue({ data: { role: "admin" } }); // string, not array

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has no admin or technik role", async () => {
    setupAuth(["klient"]);

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when technik accesses another technik's protocol", async () => {
    setupAuth(["technik"], "technik-1");
    setupProtokol({ technik_id: "technik-2" }); // Different technik

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(403);
  });

  it("allows admin to access any protocol", async () => {
    setupAuth(["admin"], "admin-1");
    setupProtokol({ technik_id: "other-technik" });
    setupEmptyData();
    setupPdfRender();

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });

  it("allows super_admin to access any protocol", async () => {
    setupAuth(["super_admin"], "sa-1");
    setupProtokol({ technik_id: "other-technik" });
    setupEmptyData();
    setupPdfRender();

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });

  it("allows technik to access own protocol", async () => {
    setupAuth(["technik"], "technik-1");
    setupProtokol({ technik_id: "technik-1" }); // Same technik
    setupEmptyData();
    setupPdfRender();

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });

  it("allows user with both admin and technik roles", async () => {
    setupAuth(["admin", "technik"], "user-1");
    setupProtokol({ technik_id: "other-user" });
    setupEmptyData();
    setupPdfRender();

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
  });
});

describe("GET /api/protokoly/[id]/pdf — Protocol loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when protocol is not found", async () => {
    setupAuth(["admin"]);
    mockGetProtokol.mockResolvedValue({ data: null, error: null });

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("Protocol not found");
  });

  it("returns 404 when protocol query has error", async () => {
    setupAuth(["admin"]);
    mockGetProtokol.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(404);
  });
});

describe("GET /api/protokoly/[id]/pdf — Data mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth(["admin"]);
    setupProtokol();
    setupPdfRender();
  });

  it("passes postrik data to buildDezinsekniPdfData", async () => {
    mockGetPostrik.mockResolvedValue({
      data: [
        {
          skudce: "Šváb",
          plocha_m2: 120,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            {
              spotreba: "2 l",
              koncentrace_procent: 5,
              pripravky: {
                nazev: "Demand CS",
                ucinna_latka: "Lambda",
                protilatka: "Atropin",
              },
            },
          ],
        },
      ],
    });
    mockGetDeratBody.mockResolvedValue({ data: [] });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        postriky: [
          expect.objectContaining({
            skudce: "Šváb",
            plocha_m2: 120,
            pripravky: [
              expect.objectContaining({
                nazev: "Demand CS",
                ucinna_latka: "Lambda",
                spotreba: "2 l",
                koncentrace_procent: 5,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it("passes derat body data to buildDezinsekniPdfData", async () => {
    mockGetPostrik.mockResolvedValue({ data: [] });
    mockGetDeratBody.mockResolvedValue({
      data: [
        {
          cislo_bodu: "L1",
          typ_stanicky: "mys",
          pozer_procent: 25,
          stav_stanicky: "ok",
          pripravky: { nazev: "Brodifacoum" },
          okruhy: { nazev: "Kuchyně" },
        },
      ],
    });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        deratBody: [
          expect.objectContaining({
            cislo_bodu: "L1",
            typ_stanicky: "mys",
            pozer_procent: 25,
            pripravek_nazev: "Brodifacoum",
            okruh_nazev: "Kuchyně",
          }),
        ],
      }),
    );
  });

  it("passes dezins body data to buildDezinsekniPdfData", async () => {
    mockGetPostrik.mockResolvedValue({ data: [] });
    mockGetDeratBody.mockResolvedValue({ data: [] });
    mockGetDezinsBody.mockResolvedValue({
      data: [
        {
          cislo_bodu: "D1",
          typ_lapace: "lezouci_hmyz",
          druh_hmyzu: "Šváb",
          pocet: 3,
          okruhy: { nazev: "Sklad" },
        },
      ],
    });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        dezinsBody: [
          expect.objectContaining({
            cislo_bodu: "D1",
            typ_lapace: "lezouci_hmyz",
            druh_hmyzu: "Šváb",
            pocet: 3,
            okruh_nazev: "Sklad",
          }),
        ],
      }),
    );
  });

  it("handles null postrik data", async () => {
    mockGetPostrik.mockResolvedValue({ data: null });
    mockGetDeratBody.mockResolvedValue({ data: [] });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        postriky: [],
      }),
    );
  });

  it("handles null derat body data", async () => {
    mockGetPostrik.mockResolvedValue({ data: [] });
    mockGetDeratBody.mockResolvedValue({ data: null });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        deratBody: [],
      }),
    );
  });

  it("handles null dezins body data", async () => {
    mockGetPostrik.mockResolvedValue({ data: [] });
    mockGetDeratBody.mockResolvedValue({ data: [] });
    mockGetDezinsBody.mockResolvedValue({ data: null });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        dezinsBody: [],
      }),
    );
  });

  it("handles derat body with null pripravky and okruhy", async () => {
    mockGetPostrik.mockResolvedValue({ data: [] });
    mockGetDeratBody.mockResolvedValue({
      data: [
        {
          cislo_bodu: "B1",
          typ_stanicky: "mys",
          pozer_procent: 0,
          stav_stanicky: "ok",
          pripravky: null,
          okruhy: null,
        },
      ],
    });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        deratBody: [
          expect.objectContaining({
            pripravek_nazev: null,
            okruh_nazev: null,
          }),
        ],
      }),
    );
  });

  it("handles postrik with null protokol_postrik_pripravky", async () => {
    mockGetPostrik.mockResolvedValue({
      data: [
        {
          skudce: "Test",
          plocha_m2: 50,
          typ_zakroku: "ulv",
          poznamka: null,
          protokol_postrik_pripravky: null,
        },
      ],
    });
    mockGetDeratBody.mockResolvedValue({ data: [] });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        postriky: [
          expect.objectContaining({
            skudce: "Test",
            pripravky: [],
          }),
        ],
      }),
    );
  });

  it("extracts nested klient data from protocol", async () => {
    setupEmptyData();

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        klient: expect.objectContaining({
          nazev: "Firma s.r.o.",
          ico: "12345678",
          dic: "CZ12345678",
          email: "test@test.cz",
        }),
      }),
    );
  });

  it("handles missing nested data (zasahy null)", async () => {
    setupProtokol({ zasahy: null });
    setupEmptyData();

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        klient: expect.objectContaining({
          nazev: null,
          ico: null,
        }),
        zasah: expect.objectContaining({
          datum: null,
        }),
      }),
    );
  });

  it("collects unique BL names from postriky pripravky", async () => {
    mockGetPostrik.mockResolvedValue({
      data: [
        {
          skudce: "A",
          plocha_m2: 10,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            { spotreba: "1 l", koncentrace_procent: 5, pripravky: { nazev: "Prep A", ucinna_latka: null, protilatka: null } },
            { spotreba: "2 l", koncentrace_procent: 3, pripravky: { nazev: "Prep B", ucinna_latka: null, protilatka: null } },
          ],
        },
        {
          skudce: "B",
          plocha_m2: 20,
          typ_zakroku: "postrik",
          poznamka: null,
          protokol_postrik_pripravky: [
            { spotreba: "1 l", koncentrace_procent: 5, pripravky: { nazev: "Prep A", ucinna_latka: null, protilatka: null } }, // duplicate
          ],
        },
      ],
    });
    mockGetDeratBody.mockResolvedValue({ data: [] });
    mockGetDezinsBody.mockResolvedValue({ data: [] });

    await GET(makeRequest(), makeParams());

    expect(mockBuildData).toHaveBeenCalledWith(
      expect.objectContaining({
        bezpecnostniListy: [
          "Bezpečnostní list: Prep A",
          "Bezpečnostní list: Prep B",
        ],
      }),
    );
  });
});

describe("GET /api/protokoly/[id]/pdf — PDF response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth(["admin"]);
    setupProtokol();
    setupEmptyData();
  });

  it("returns 200 with PDF content type", async () => {
    setupPdfRender();

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("sets Content-Disposition header with filename", async () => {
    mockBuildData.mockReturnValue({ cislo_protokolu: "P-TST001-001" });
    mockRenderToBuffer.mockResolvedValue(Buffer.from("pdf"));

    const res = await GET(makeRequest(), makeParams());
    expect(res.headers.get("Content-Disposition")).toContain("P-TST001-001.pdf");
    expect(res.headers.get("Content-Disposition")).toContain("inline");
  });

  it("sets Cache-Control to private, no-cache", async () => {
    setupPdfRender();

    const res = await GET(makeRequest(), makeParams());
    expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("uses 'protokol' as fallback filename when cislo is empty", async () => {
    mockBuildData.mockReturnValue({ cislo_protokolu: "" });
    mockRenderToBuffer.mockResolvedValue(Buffer.from("pdf"));

    const res = await GET(makeRequest(), makeParams());
    expect(res.headers.get("Content-Disposition")).toContain("protokol.pdf");
  });

  it("returns 500 when PDF rendering fails", async () => {
    mockBuildData.mockReturnValue({ cislo_protokolu: "P-001" });
    mockRenderToBuffer.mockRejectedValue(new Error("Render crash"));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(makeRequest(), makeParams());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Failed to generate PDF");

    consoleError.mockRestore();
  });

  it("returns binary PDF data in response body", async () => {
    const pdfContent = "Hello PDF";
    mockBuildData.mockReturnValue({ cislo_protokolu: "P-001" });
    mockRenderToBuffer.mockResolvedValue(Buffer.from(pdfContent));

    const res = await GET(makeRequest(), makeParams());
    const buffer = await res.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    expect(text).toBe(pdfContent);
  });
});

describe("GET /api/protokoly/[id]/pdf — Parallel data loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth(["admin"]);
    setupProtokol();
    setupPdfRender();
  });

  it("loads postrik, derat, and dezins data in parallel", async () => {
    // Track call order
    const callOrder: string[] = [];

    mockGetPostrik.mockImplementation(async () => {
      callOrder.push("postrik");
      return { data: [] };
    });
    mockGetDeratBody.mockImplementation(async () => {
      callOrder.push("derat");
      return { data: [] };
    });
    mockGetDezinsBody.mockImplementation(async () => {
      callOrder.push("dezins");
      return { data: [] };
    });

    await GET(makeRequest(), makeParams());

    // All three should be called
    expect(mockGetPostrik).toHaveBeenCalledTimes(1);
    expect(mockGetDeratBody).toHaveBeenCalledTimes(1);
    expect(mockGetDezinsBody).toHaveBeenCalledTimes(1);
  });
});
