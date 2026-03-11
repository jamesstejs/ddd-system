import { describe, it, expect } from "vitest";
import { renderProtokolEmailHtml } from "../templates/ProtokolEmail";

describe("renderProtokolEmailHtml", () => {
  const baseProps = {
    cisloProtokolu: "P-ABC-001",
    datumZasahu: "11. 3. 2026",
    klientName: "ACME s.r.o.",
    objektNazev: "Sklad Praha 5",
    bezpecnostniListy: [],
  };

  it("returns valid HTML string", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("contains protocol number", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("P-ABC-001");
  });

  it("contains zasah date", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("11. 3. 2026");
  });

  it("contains client name", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("ACME s.r.o.");
  });

  it("contains object name", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("Sklad Praha 5");
  });

  it("contains Deraplus branding", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("DERAPLUS");
    expect(html).toContain("info@deraplus.cz");
    expect(html).toContain("800 130 303");
    expect(html).toContain("www.deraplus.cz");
  });

  it("contains company info", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("AHELP Group, s.r.o.");
    expect(html).toContain("01483056");
    expect(html).toContain("CZ01483056");
  });

  it("contains DDD description", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("Dezinfekce");
    expect(html).toContain("Dezinsekce");
    expect(html).toContain("Deratizace");
  });

  it("does not contain BL section when empty", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).not.toContain("Bezpečnostní listy v příloze");
  });

  it("renders BL section when provided", () => {
    const html = renderProtokolEmailHtml({
      ...baseProps,
      bezpecnostniListy: ["BL-Rodilon.pdf", "BL-Brodifacoum.pdf"],
    });
    expect(html).toContain("Bezpečnostní listy v příloze");
    expect(html).toContain("BL-Rodilon.pdf");
    expect(html).toContain("BL-Brodifacoum.pdf");
  });

  it("renders multiple BL items as list", () => {
    const html = renderProtokolEmailHtml({
      ...baseProps,
      bezpecnostniListy: ["A.pdf", "B.pdf", "C.pdf"],
    });
    expect(html).toContain("<li");
    const matches = html.match(/<li/g);
    expect(matches?.length).toBe(3);
  });

  it("uses green branding color", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("#16a34a");
  });

  it("is responsive with viewport meta", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('width=device-width');
  });

  it("uses Czech language", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain('lang="cs"');
  });

  it("contains greeting text", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("Dobrý den");
    expect(html).toContain("v příloze zasíláme protokol");
  });

  it("contains auto-generated notice", () => {
    const html = renderProtokolEmailHtml(baseProps);
    expect(html).toContain("automaticky systémem Deraplus");
  });
});
