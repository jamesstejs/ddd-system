import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProformaSheet } from "../ProformaSheet";

// Mock server actions
const mockCreateProforma = vi.fn();
const mockCheckPayment = vi.fn();

vi.mock("../proformaActions", () => ({
  createProformaAction: (...args: unknown[]) => mockCreateProforma(...args),
  checkProformaPaymentAction: (...args: unknown[]) =>
    mockCheckPayment(...args),
}));

// Mock QRCodeSVG
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} />
  ),
}));

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  zasahId: "zasah-1",
  zakazkaId: "zakazka-1",
};

const mockProformaData = {
  success: true,
  data: {
    proformaId: "proforma-1",
    cislo: "2026-P001",
    castka_s_dph: 6050,
    castka_bez_dph: 5000,
    fakturoidPublicUrl: "https://app.fakturoid.cz/proforma/abc",
    iban: "CZ6508000000192000145399",
    vs: "2026001",
  },
};

describe("ProformaSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially and creates proforma", async () => {
    mockCreateProforma.mockResolvedValueOnce(mockProformaData);

    render(<ProformaSheet {...defaultProps} />);

    // Should show loading initially
    expect(screen.getByText("Vytvářím proformu...")).toBeInTheDocument();

    // After loading, shows QR
    await waitFor(() => {
      expect(screen.getByText("2026-P001", { exact: false })).toBeInTheDocument();
    });

    expect(mockCreateProforma).toHaveBeenCalledWith("zasah-1");
  });

  it("displays amount and QR code after creation", async () => {
    mockCreateProforma.mockResolvedValueOnce(mockProformaData);

    render(<ProformaSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTestId("qr-code")).toBeInTheDocument();
    });

    // Check amount is displayed
    expect(screen.getByText(/6[\s\u00a0]050/)).toBeInTheDocument();
  });

  it("displays Fakturoid link", async () => {
    mockCreateProforma.mockResolvedValueOnce(mockProformaData);

    render(<ProformaSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Zobrazit ve Fakturoidu ↗")).toBeInTheDocument();
    });

    const link = screen.getByText("Zobrazit ve Fakturoidu ↗");
    expect(link).toHaveAttribute(
      "href",
      "https://app.fakturoid.cz/proforma/abc",
    );
  });

  it("shows error on creation failure", async () => {
    mockCreateProforma.mockResolvedValueOnce({
      success: false,
      error: "Zakázka nemá položky",
    });

    render(<ProformaSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Zakázka nemá položky")).toBeInTheDocument();
    });
  });

  it("check payment button calls action", async () => {
    mockCreateProforma.mockResolvedValueOnce(mockProformaData);
    mockCheckPayment.mockResolvedValueOnce({ success: true, paid: false });

    const user = userEvent.setup();
    render(<ProformaSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Zkontrolovat platbu")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Zkontrolovat platbu"));

    await waitFor(() => {
      expect(mockCheckPayment).toHaveBeenCalledWith("proforma-1");
    });
  });

  it("shows paid state when payment confirmed", async () => {
    mockCreateProforma.mockResolvedValueOnce(mockProformaData);
    mockCheckPayment.mockResolvedValueOnce({ success: true, paid: true });

    const user = userEvent.setup();
    render(<ProformaSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Zkontrolovat platbu")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Zkontrolovat platbu"));

    await waitFor(() => {
      expect(screen.getByText("Uhrazeno")).toBeInTheDocument();
    });
  });

  it("does not render content when closed", () => {
    render(<ProformaSheet {...defaultProps} open={false} />);

    expect(screen.queryByText("Vytvářím proformu...")).not.toBeInTheDocument();
  });

  it("has retry button on error", async () => {
    mockCreateProforma
      .mockResolvedValueOnce({ success: false, error: "Chyba" })
      .mockResolvedValueOnce(mockProformaData);

    const user = userEvent.setup();
    render(<ProformaSheet {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Chyba")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Zkusit znovu"));

    await waitFor(() => {
      expect(mockCreateProforma).toHaveBeenCalledTimes(2);
    });
  });
});
