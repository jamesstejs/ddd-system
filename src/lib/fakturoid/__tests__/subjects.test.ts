import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client module
vi.mock("../client", () => ({
  fakturoidFetch: vi.fn(),
}));

import { fakturoidFetch } from "../client";
import {
  parseAdresa,
  buildSubjectInput,
  findOrCreateSubject,
  searchSubjects,
  createSubject,
  getSubject,
} from "../subjects";

const mockFetch = vi.mocked(fakturoidFetch);

describe("parseAdresa", () => {
  it("parses standard Czech address", () => {
    const result = parseAdresa("Dvořákova 475, 252 64 Velké Přílepy");
    expect(result).toEqual({
      street: "Dvořákova 475",
      zip: "25264",
      city: "Velké Přílepy",
    });
  });

  it("parses address without comma", () => {
    const result = parseAdresa("Hlavní 123");
    expect(result).toEqual({
      street: "Hlavní 123",
      zip: "",
      city: "",
    });
  });

  it("parses address with zip without space", () => {
    const result = parseAdresa("Náměstí 5, 14000 Praha");
    expect(result).toEqual({
      street: "Náměstí 5",
      zip: "14000",
      city: "Praha",
    });
  });

  it("handles empty string", () => {
    const result = parseAdresa("");
    expect(result).toEqual({ street: "", zip: "", city: "" });
  });
});

describe("buildSubjectInput", () => {
  it("builds subject for firma", () => {
    const input = buildSubjectInput({
      nazev: "AHELP Group s.r.o.",
      jmeno: "Jakub",
      prijmeni: "Stejskal",
      typ: "firma",
      ico: "01483056",
      dic: "CZ01483056",
      email: "info@deraplus.cz",
      telefon: "800130303",
      adresa: "Dvořákova 475, 252 64 Velké Přílepy",
    });

    expect(input.name).toBe("AHELP Group s.r.o.");
    expect(input.registration_no).toBe("01483056");
    expect(input.vat_no).toBe("CZ01483056");
    expect(input.email).toBe("info@deraplus.cz");
    expect(input.country).toBe("CZ");
    expect(input.type).toBe("customer");
  });

  it("builds subject for fyzicka_osoba", () => {
    const input = buildSubjectInput({
      nazev: "",
      jmeno: "Jan",
      prijmeni: "Novák",
      typ: "fyzicka_osoba",
      adresa: "Hlavní 123",
    });

    expect(input.name).toBe("Novák Jan");
    expect(input.registration_no).toBeUndefined();
    expect(input.vat_no).toBeUndefined();
  });

  it("omits null values as undefined", () => {
    const input = buildSubjectInput({
      nazev: "Firma",
      jmeno: "",
      prijmeni: "",
      typ: "firma",
      ico: null,
      dic: null,
      email: null,
      telefon: null,
      adresa: "",
    });

    expect(input.registration_no).toBeUndefined();
    expect(input.vat_no).toBeUndefined();
    expect(input.email).toBeUndefined();
    expect(input.phone).toBeUndefined();
  });
});

describe("searchSubjects", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls search endpoint with encoded query", async () => {
    mockFetch.mockResolvedValueOnce([]);

    await searchSubjects("01483056");

    expect(mockFetch).toHaveBeenCalledWith(
      "/subjects/search.json?query=01483056",
    );
  });
});

describe("createSubject", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls POST subjects.json", async () => {
    const created = { id: 99, name: "Test" };
    mockFetch.mockResolvedValueOnce(created);

    const result = await createSubject({ name: "Test" });

    expect(mockFetch).toHaveBeenCalledWith("/subjects.json", {
      method: "POST",
      body: { name: "Test" },
    });
    expect(result).toEqual(created);
  });
});

describe("getSubject", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls GET subjects/{id}.json", async () => {
    mockFetch.mockResolvedValueOnce({ id: 42, name: "X" });

    const result = await getSubject(42);

    expect(mockFetch).toHaveBeenCalledWith("/subjects/42.json");
    expect(result.id).toBe(42);
  });
});

describe("findOrCreateSubject", () => {
  beforeEach(() => mockFetch.mockReset());

  const baseKlient = {
    nazev: "Firma",
    jmeno: "",
    prijmeni: "",
    typ: "firma" as const,
    ico: "12345678",
    dic: null,
    email: null,
    telefon: null,
    adresa: "Ulice 1",
    fakturoid_subject_id: null as number | null,
  };

  it("returns existing fakturoid_subject_id if valid", async () => {
    mockFetch.mockResolvedValueOnce({ id: 55 }); // getSubject

    const result = await findOrCreateSubject({
      ...baseKlient,
      fakturoid_subject_id: 55,
    });

    expect(result).toBe(55);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("searches by IČO if no subject_id", async () => {
    mockFetch.mockResolvedValueOnce([
      { id: 77, registration_no: "12345678" },
    ]);

    const result = await findOrCreateSubject(baseKlient);

    expect(result).toBe(77);
  });

  it("creates new if IČO not found", async () => {
    mockFetch.mockResolvedValueOnce([]); // search returns empty
    mockFetch.mockResolvedValueOnce({ id: 99, name: "Firma" }); // create

    const result = await findOrCreateSubject(baseKlient);

    expect(result).toBe(99);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("creates new if no IČO", async () => {
    mockFetch.mockResolvedValueOnce({ id: 111, name: "Klient" });

    const result = await findOrCreateSubject({
      ...baseKlient,
      ico: null,
    });

    expect(result).toBe(111);
  });

  it("falls back to search/create if subject_id invalid in Fakturoid", async () => {
    // getSubject throws
    mockFetch.mockRejectedValueOnce(new Error("404"));
    // search by IČO
    mockFetch.mockResolvedValueOnce([{ id: 88, registration_no: "12345678" }]);

    const result = await findOrCreateSubject({
      ...baseKlient,
      fakturoid_subject_id: 999,
    });

    expect(result).toBe(88);
  });
});
