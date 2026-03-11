import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PdfSection } from "../PdfSection";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("PdfSection", () => {
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
