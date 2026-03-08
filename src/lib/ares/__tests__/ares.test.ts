import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAres } from "../index";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAres", () => {
  it("returns null for invalid IČO (wrong length)", async () => {
    expect(await fetchAres("123")).toBeNull();
    expect(await fetchAres("")).toBeNull();
    expect(await fetchAres("123456789")).toBeNull();
  });

  it("returns null for non-numeric IČO", async () => {
    expect(await fetchAres("abcdefgh")).toBeNull();
  });

  it("strips whitespace from IČO", async () => {
    const mockData = {
      obchodniJmeno: "Test s.r.o.",
      dic: "CZ12345678",
      sidlo: { textovaAdresa: "Praha 1" },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    );

    const result = await fetchAres("1234 5678");
    expect(result).not.toBeNull();
    expect(result?.nazev).toBe("Test s.r.o.");
  });

  it("parses ARES response with textovaAdresa", async () => {
    const mockData = {
      obchodniJmeno: "AHELP Group, s.r.o.",
      dic: "CZ01483056",
      sidlo: { textovaAdresa: "Dvořákova 475, 252 64 Velké Přílepy" },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    );

    const result = await fetchAres("01483056");
    expect(result).toEqual({
      nazev: "AHELP Group, s.r.o.",
      adresa: "Dvořákova 475, 252 64 Velké Přílepy",
      dic: "CZ01483056",
    });
  });

  it("builds address from parts when textovaAdresa missing", async () => {
    const mockData = {
      obchodniJmeno: "Test",
      dic: null,
      sidlo: {
        nazevUlice: "Hlavní",
        cisloDomovni: 10,
        cisloOrientacni: null,
        psc: "11000",
        nazevObce: "Praha",
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    );

    const result = await fetchAres("12345678");
    expect(result?.adresa).toBe("Hlavní, 10, 11000, Praha");
    expect(result?.dic).toBeNull();
  });

  it("returns null on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );

    const result = await fetchAres("99999999");
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const result = await fetchAres("12345678");
    expect(result).toBeNull();
  });
});
