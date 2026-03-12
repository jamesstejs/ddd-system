import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client module
vi.mock("../client", () => ({
  fakturoidFetch: vi.fn(),
}));

import { fakturoidFetch } from "../client";
import {
  createInvoice,
  createProformaInvoice,
  getInvoice,
  fireInvoiceEvent,
  buildInvoiceLines,
  mapFakturoidStatus,
} from "../invoices";

const mockFetch = vi.mocked(fakturoidFetch);

describe("createInvoice", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls POST invoices.json with input", async () => {
    const invoice = { id: 529, number: "2026-0024" };
    mockFetch.mockResolvedValueOnce(invoice);

    const result = await createInvoice({
      subject_id: 42,
      lines: [{ name: "Výjezd", quantity: 1, unit_price: 690, vat_rate: 21 }],
      due: 14,
      payment_method: "bank",
    });

    expect(mockFetch).toHaveBeenCalledWith("/invoices.json", {
      method: "POST",
      body: expect.objectContaining({ subject_id: 42 }),
    });
    expect(result).toEqual(invoice);
  });
});

describe("createProformaInvoice", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls POST with document_type proforma", async () => {
    const invoice = { id: 530, number: "2026-P001" };
    mockFetch.mockResolvedValueOnce(invoice);

    const result = await createProformaInvoice({
      subject_id: 42,
      lines: [{ name: "Výjezd", quantity: 1, unit_price: 690, vat_rate: 21 }],
      due: 14,
      payment_method: "bank",
    });

    expect(mockFetch).toHaveBeenCalledWith("/invoices.json", {
      method: "POST",
      body: expect.objectContaining({
        subject_id: 42,
        document_type: "proforma",
        proforma_followup_document: "final_invoice_paid",
      }),
    });
    expect(result).toEqual(invoice);
  });

  it("preserves other input fields", async () => {
    mockFetch.mockResolvedValueOnce({ id: 531 });

    await createProformaInvoice({
      subject_id: 10,
      lines: [],
      due: 7,
      note: "Test note",
      language: "cz",
    });

    expect(mockFetch).toHaveBeenCalledWith("/invoices.json", {
      method: "POST",
      body: expect.objectContaining({
        due: 7,
        note: "Test note",
        language: "cz",
        document_type: "proforma",
      }),
    });
  });
});

describe("getInvoice", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls GET invoices/{id}.json", async () => {
    mockFetch.mockResolvedValueOnce({ id: 529 });
    const result = await getInvoice(529);
    expect(mockFetch).toHaveBeenCalledWith("/invoices/529.json");
    expect(result.id).toBe(529);
  });
});

describe("fireInvoiceEvent", () => {
  beforeEach(() => mockFetch.mockReset());

  it("calls POST fire with event param", async () => {
    mockFetch.mockResolvedValueOnce(undefined);

    await fireInvoiceEvent(529, "deliver");

    expect(mockFetch).toHaveBeenCalledWith(
      "/invoices/529/fire.json?event=deliver",
      { method: "POST" },
    );
  });

  it("supports mark_as_sent event", async () => {
    mockFetch.mockResolvedValueOnce(undefined);
    await fireInvoiceEvent(100, "mark_as_sent");
    expect(mockFetch).toHaveBeenCalledWith(
      "/invoices/100/fire.json?event=mark_as_sent",
      { method: "POST" },
    );
  });
});

describe("buildInvoiceLines", () => {
  it("maps polozky to Fakturoid lines", () => {
    const polozky = [
      { nazev: "Výjezd Praha", pocet: 1, cena_za_kus: 690 },
      { nazev: "Stanice potkan", pocet: 8, cena_za_kus: 170 },
    ];

    const lines = buildInvoiceLines(polozky, 21);

    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      name: "Výjezd Praha",
      quantity: 1,
      unit_price: 690,
      vat_rate: 21,
      unit_name: "ks",
    });
    expect(lines[1]).toEqual({
      name: "Stanice potkan",
      quantity: 8,
      unit_price: 170,
      vat_rate: 21,
      unit_name: "ks",
    });
  });

  it("handles empty polozky", () => {
    const lines = buildInvoiceLines([], 21);
    expect(lines).toEqual([]);
  });

  it("uses custom DPH rate", () => {
    const lines = buildInvoiceLines(
      [{ nazev: "Test", pocet: 1, cena_za_kus: 100 }],
      15,
    );
    expect(lines[0].vat_rate).toBe(15);
  });
});

describe("mapFakturoidStatus", () => {
  it("maps open → vytvorena", () => {
    expect(mapFakturoidStatus("open")).toBe("vytvorena");
  });

  it("maps sent → odeslana", () => {
    expect(mapFakturoidStatus("sent")).toBe("odeslana");
  });

  it("maps overdue → po_splatnosti", () => {
    expect(mapFakturoidStatus("overdue")).toBe("po_splatnosti");
  });

  it("maps paid → uhrazena", () => {
    expect(mapFakturoidStatus("paid")).toBe("uhrazena");
  });

  it("maps cancelled → storno", () => {
    expect(mapFakturoidStatus("cancelled")).toBe("storno");
  });

  it("maps unknown → vytvorena", () => {
    expect(mapFakturoidStatus("xyz")).toBe("vytvorena");
  });
});
