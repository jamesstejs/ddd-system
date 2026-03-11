import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { PdfSection } from "../PdfSection";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ============================================================
// Rendering — visibility & subtitle logic
// ============================================================

describe("PdfSection — rendering", () => {
  it("renders PDF buttons when hasPostrik is true", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
      />,
    );

    expect(screen.getByText("PDF protokol")).toBeInTheDocument();
    expect(screen.getByText("Náhled")).toBeInTheDocument();
    expect(screen.getByText("Stáhnout PDF")).toBeInTheDocument();
  });

  it("renders nothing when hasPostrik and hasDeratBody are both false", () => {
    const { container } = render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={false}
        hasDeratBody={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no flags are set", () => {
    const { container } = render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders when only hasDeratBody is true", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={false}
        hasDeratBody={true}
      />,
    );

    expect(screen.getByText("PDF protokol")).toBeInTheDocument();
    expect(screen.getByText("Deratizační protokol")).toBeInTheDocument();
  });

  it("shows postřik subtitle when only hasPostrik", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
        hasDeratBody={false}
      />,
    );

    expect(
      screen.getByText("Dezinsekční protokol (postřik)"),
    ).toBeInTheDocument();
  });

  it("shows combined subtitle when both postrik and derat", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
        hasDeratBody={true}
      />,
    );

    expect(
      screen.getByText("Dezinsekční protokol (postřik + deratizace)"),
    ).toBeInTheDocument();
  });

  it("has clickable Náhled button", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
      />,
    );

    const nahledBtn = screen.getByText("Náhled");
    expect(nahledBtn.closest("button")).not.toBeDisabled();
  });

  it("has clickable Stáhnout button", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
      />,
    );

    const downloadBtn = screen.getByText("Stáhnout PDF");
    expect(downloadBtn.closest("button")).not.toBeDisabled();
  });

  it("renders when only hasDezinsBody is true", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={false}
        hasDeratBody={false}
        hasDezinsBody={true}
      />,
    );

    expect(screen.getByText("PDF protokol")).toBeInTheDocument();
    expect(
      screen.getByText("Dezinsekční protokol (dezinsekce)"),
    ).toBeInTheDocument();
  });

  it("renders nothing when all flags are false", () => {
    const { container } = render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={false}
        hasDeratBody={false}
        hasDezinsBody={false}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows combined subtitle with all three types", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
        hasDeratBody={true}
        hasDezinsBody={true}
      />,
    );

    expect(
      screen.getByText(
        "Dezinsekční protokol (postřik + deratizace + dezinsekce)",
      ),
    ).toBeInTheDocument();
  });
});

// ============================================================
// All 8 subtitle combinations
// ============================================================

describe("PdfSection — all subtitle combinations", () => {
  it("derat+dezins shows Dezinsekční protokol", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={false}
        hasDeratBody={true}
        hasDezinsBody={true}
      />,
    );
    expect(
      screen.getByText("Dezinsekční protokol (deratizace + dezinsekce)"),
    ).toBeInTheDocument();
  });

  it("postrik+dezins shows correct combo", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
        hasDeratBody={false}
        hasDezinsBody={true}
      />,
    );
    expect(
      screen.getByText("Dezinsekční protokol (postřik + dezinsekce)"),
    ).toBeInTheDocument();
  });
});

// ============================================================
// handlePreview
// ============================================================

describe("PdfSection — handlePreview", () => {
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("calls window.open with correct PDF URL on Náhled click", () => {
    render(
      <PdfSection
        protokolId="abc-123"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
      />,
    );

    fireEvent.click(screen.getByText("Náhled"));
    expect(openSpy).toHaveBeenCalledWith(
      "/api/protokoly/abc-123/pdf",
      "_blank",
    );
  });

  it("opens in new tab (_blank target)", () => {
    render(
      <PdfSection
        protokolId="xyz"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    fireEvent.click(screen.getByText("Náhled"));
    expect(openSpy).toHaveBeenCalledWith(
      expect.any(String),
      "_blank",
    );
  });
});

// ============================================================
// handleDownload — success flow
// ============================================================

describe("PdfSection — handleDownload success", () => {
  let fetchMock: Mock;
  let createObjectURLSpy: Mock;
  let revokeObjectURLSpy: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    createObjectURLSpy = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;
  });

  it("fetches PDF, creates blob URL and triggers download", async () => {
    const mockBlob = new Blob(["pdf"], { type: "application/pdf" });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/protokoly/p1/pdf");
    expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-url");
  });

  it("uses cisloProtokolu as filename", async () => {
    const mockBlob = new Blob(["pdf"]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    // Track appended anchor elements
    const appendSpy = vi.spyOn(document.body, "appendChild");

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-TST001-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    // Find the anchor that was appended
    const anchor = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).tagName === "A",
    )?.[0] as HTMLAnchorElement | undefined;
    expect(anchor).toBeDefined();
    expect(anchor!.download).toBe("P-TST001-001.pdf");
  });

  it("uses 'protokol' as filename when cisloProtokolu is null", async () => {
    const mockBlob = new Blob(["pdf"]);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const appendSpy = vi.spyOn(document.body, "appendChild");

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu={null}
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    const anchor = appendSpy.mock.calls.find(
      (call) => (call[0] as HTMLElement).tagName === "A",
    )?.[0] as HTMLAnchorElement | undefined;
    expect(anchor).toBeDefined();
    expect(anchor!.download).toBe("protokol.pdf");
  });
});

// ============================================================
// handleDownload — error handling
// ============================================================

describe("PdfSection — handleDownload errors", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  it("shows error when HTTP response is not ok (with JSON body)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server chyba" }),
    });

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Server chyba")).toBeInTheDocument();
    });
  });

  it("shows fallback error when HTTP response has no JSON body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.reject(new Error("not json")),
    });

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Chyba 403")).toBeInTheDocument();
    });
  });

  it("shows error when fetch throws network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows generic error for non-Error throws", async () => {
    fetchMock.mockRejectedValueOnce("string error");

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Chyba při generování PDF")).toBeInTheDocument();
    });
  });

  it("shows error for 401 Unauthorized", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });
  });

  it("shows error for 404 Not Found", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "Protocol not found" }),
    });

    render(
      <PdfSection
        protokolId="nonexistent"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByText("Protocol not found")).toBeInTheDocument();
    });
  });
});

// ============================================================
// handleDownload — loading state
// ============================================================

describe("PdfSection — loading state", () => {
  let fetchMock: Mock;
  let resolveBlob: (value: unknown) => void;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    global.URL.createObjectURL = vi.fn().mockReturnValue("blob:url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("shows 'Generuji...' text during download and disables button", async () => {
    // Create a fetch that we can control
    const blobPromise = new Promise((resolve) => {
      resolveBlob = resolve;
    });
    fetchMock.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        blob: () => blobPromise,
      }),
    );

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    // Click download
    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    // During generation — button should show loading text and be disabled
    expect(screen.getByText("Generuji\u2026")).toBeInTheDocument();
    const btn = screen.getByText("Generuji\u2026").closest("button");
    expect(btn).toBeDisabled();

    // Resolve the blob
    await act(async () => {
      resolveBlob(new Blob(["pdf"]));
    });

    // After completion — button returns to normal
    await waitFor(() => {
      expect(screen.getByText("Stáhnout PDF")).toBeInTheDocument();
    });
  });

  it("re-enables button after error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("fail"));

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByText("Stáhnout PDF")).toBeInTheDocument();
      const btn = screen.getByText("Stáhnout PDF").closest("button");
      expect(btn).not.toBeDisabled();
    });
  });

  it("clears previous error on new download attempt", async () => {
    // First: error
    fetchMock.mockRejectedValueOnce(new Error("fail 1"));

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.getByText("fail 1")).toBeInTheDocument();
    });

    // Second: success (should clear error)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"])),
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

// ============================================================
// URL construction
// ============================================================

describe("PdfSection — URL construction", () => {
  it("constructs correct PDF URL from protokolId", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <PdfSection
        protokolId="abc-def-123"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    fireEvent.click(screen.getByText("Náhled"));
    expect(openSpy).toHaveBeenCalledWith(
      "/api/protokoly/abc-def-123/pdf",
      "_blank",
    );
  });
});

// ============================================================
// Error display — accessibility
// ============================================================

describe("PdfSection — error accessibility", () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  it("error container has role=alert for screen readers", async () => {
    fetchMock.mockRejectedValueOnce(new Error("test error"));

    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Stáhnout PDF"));
    });

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass("bg-destructive/10");
    });
  });

  it("no error displayed initially", () => {
    render(
      <PdfSection
        protokolId="p1"
        cisloProtokolu="P-001"
        hasPostrik={true}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
