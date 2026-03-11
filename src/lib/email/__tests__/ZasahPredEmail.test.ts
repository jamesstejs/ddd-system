import { describe, it, expect } from "vitest";
import { renderZasahPredEmailHtml } from "../templates/ZasahPredEmail";

describe("renderZasahPredEmailHtml", () => {
  const defaultProps = {
    klientName: "Test s.r.o.",
    objektNazev: "Restaurace",
    objektAdresa: "Hlavní 1, Praha",
    datumZasahu: "15. 3. 2026",
    casOd: "09:00",
    skudci: ["Potkan obecný"],
    typyZasahu: ["vnitřní deratizace"],
    pouceniTexty: [
      {
        nazev: "Deratizace — obecné",
        obsah: "Nemanipulujte se staničkami.",
      },
    ],
    bezpecnostniListy: ["Brodifacoum_BL.pdf"],
  };

  it("renders valid HTML", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes klient name", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("Test s.r.o.");
  });

  it("includes objekt name and address", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("Restaurace");
    expect(html).toContain("Hlavní 1, Praha");
  });

  it("includes datum and time", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("15. 3. 2026");
    expect(html).toContain("09:00");
  });

  it("includes skudci names", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("Potkan obecný");
  });

  it("includes pouceni text", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("Deratizace — obecné");
    expect(html).toContain("Nemanipulujte se staničkami.");
  });

  it("includes BL list", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("Brodifacoum_BL.pdf");
    expect(html).toContain("Bezpecnostni listy");
  });

  it("includes Deraplus branding", () => {
    const html = renderZasahPredEmailHtml(defaultProps);
    expect(html).toContain("DERAPLUS");
    expect(html).toContain("AHELP Group");
    expect(html).toContain("800 130 303");
    expect(html).toContain("info@deraplus.cz");
  });

  it("handles empty pouceni array", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      pouceniTexty: [],
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).not.toContain("Deratizace — obecné");
  });

  it("handles empty BL array", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      bezpecnostniListy: [],
    });
    expect(html).not.toContain("Bezpecnostni listy");
  });

  it("handles multiple pouceni sections", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      pouceniTexty: [
        { nazev: "Poučení 1", obsah: "Text 1" },
        { nazev: "Poučení 2", obsah: "Text 2" },
      ],
    });
    expect(html).toContain("Poučení 1");
    expect(html).toContain("Poučení 2");
    expect(html).toContain("Text 1");
    expect(html).toContain("Text 2");
  });

  it("escapes HTML in user data", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      klientName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("handles empty casOd", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      casOd: "",
    });
    expect(html).toContain("15. 3. 2026");
    expect(html).not.toContain("od ");
  });

  it("handles empty typyZasahu", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      typyZasahu: [],
    });
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("handles empty skudci (shows default text)", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      skudci: [],
    });
    expect(html).toContain("Dle objednavky");
  });

  it("handles multiple BL files", () => {
    const html = renderZasahPredEmailHtml({
      ...defaultProps,
      bezpecnostniListy: ["BL1.pdf", "BL2.pdf", "BL3.pdf"],
    });
    expect(html).toContain("BL1.pdf");
    expect(html).toContain("BL2.pdf");
    expect(html).toContain("BL3.pdf");
  });
});
