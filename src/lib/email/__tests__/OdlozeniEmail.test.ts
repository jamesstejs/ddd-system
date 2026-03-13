import { describe, it, expect } from "vitest";
import { renderOdlozeniEmailHtml } from "../templates/OdlozeniEmail";

describe("renderOdlozeniEmailHtml", () => {
  const defaultProps = {
    klientName: "Jan Novák",
    objektNazev: "Restaurace U Medvěda",
    objektAdresa: "Hlavní 1, Praha",
    puvodniDatum: "28. 2. 2026",
    novyDatum: "20. 3. 2026",
    duvod: null as string | null,
    iniciator: "admin" as const,
  };

  it("renders valid HTML", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });

  it("includes klient name", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("Jan Novák");
  });

  it("includes objekt name and address", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("Restaurace U Medvěda");
    expect(html).toContain("Hlavní 1, Praha");
  });

  it("includes original date with strikethrough", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("28. 2. 2026");
    expect(html).toContain("text-decoration: line-through");
  });

  it("includes new date in green", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("20. 3. 2026");
    expect(html).toContain("#16a34a"); // green color
  });

  it("shows admin-initiated text when admin postpones", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("zmene terminu planovaneho zasahu");
  });

  it("shows klient-initiated text when klient postpones", () => {
    const html = renderOdlozeniEmailHtml({
      ...defaultProps,
      iniciator: "klient",
    });
    expect(html).toContain("Na Vasi zadost");
  });

  it("includes reason section when provided", () => {
    const html = renderOdlozeniEmailHtml({
      ...defaultProps,
      duvod: "Klient je na dovolené",
    });
    expect(html).toContain("Klient je na dovolené");
    expect(html).toContain("Duvod posunuti");
  });

  it("omits reason section when null", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).not.toContain("Duvod posunuti");
  });

  it("includes Deraplus branding", () => {
    const html = renderOdlozeniEmailHtml(defaultProps);
    expect(html).toContain("DERAPLUS");
    expect(html).toContain("AHELP Group");
    expect(html).toContain("800 130 303");
  });

  it("escapes HTML in user-provided fields", () => {
    const html = renderOdlozeniEmailHtml({
      ...defaultProps,
      klientName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
