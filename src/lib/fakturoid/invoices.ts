/**
 * Fakturoid Invoices — create & manage invoices via API v3.
 */

import { fakturoidFetch } from "./client";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface FakturoidInvoiceLine {
  name: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit_name?: string;
}

export interface CreateInvoiceInput {
  subject_id: number;
  lines: FakturoidInvoiceLine[];
  due?: number; // days until overdue
  issued_on?: string; // YYYY-MM-DD
  taxable_fulfillment_due?: string;
  currency?: string;
  payment_method?: "bank" | "cash" | "cod" | "card" | "paypal" | "custom";
  language?: string;
  note?: string;
  custom_id?: string;
  /** "invoice" (default) or "proforma" */
  document_type?: "invoice" | "proforma";
  /** What to do after proforma is paid: "final_invoice_paid" auto-creates final invoice */
  proforma_followup_document?: "final_invoice_paid" | "final_invoice" | "none";
}

export interface FakturoidInvoice {
  id: number;
  number: string;
  custom_id: string | null;
  subject_id: number;
  status: string; // "open", "sent", "overdue", "paid", "cancelled"
  due_on: string;
  issued_on: string;
  taxable_fulfillment_due: string | null;
  subtotal: string; // bez DPH
  total: string; // s DPH
  native_subtotal: string;
  native_total: string;
  currency: string;
  html_url: string;
  public_html_url: string;
  url: string;
  pdf_url: string;
  subject_url: string;
  lines: Array<{
    id: number;
    name: string;
    quantity: string;
    unit_price: string;
    vat_rate: string;
    unit_name: string | null;
  }>;
  payment_method: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------
// API calls
// ---------------------------------------------------------------

/**
 * Create a new invoice in Fakturoid.
 */
export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<FakturoidInvoice> {
  return fakturoidFetch<FakturoidInvoice>("/invoices.json", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

/**
 * Get a single invoice by Fakturoid ID.
 */
export async function getInvoice(
  invoiceId: number,
): Promise<FakturoidInvoice> {
  return fakturoidFetch<FakturoidInvoice>(`/invoices/${invoiceId}.json`);
}

/**
 * Fire an event on an invoice (e.g., mark_as_sent, deliver, pay, cancel).
 */
export async function fireInvoiceEvent(
  invoiceId: number,
  event: "mark_as_sent" | "deliver" | "pay" | "pay_proforma" | "cancel",
): Promise<void> {
  await fakturoidFetch<void>(
    `/invoices/${invoiceId}/fire.json?event=${event}`,
    { method: "POST" },
  );
}

/**
 * Update an existing invoice in Fakturoid.
 * Only works on "open" (draft) invoices.
 */
export async function updateInvoice(
  invoiceId: number,
  input: Partial<CreateInvoiceInput>,
): Promise<FakturoidInvoice> {
  return fakturoidFetch<FakturoidInvoice>(`/invoices/${invoiceId}.json`, {
    method: "PATCH",
    body: input as unknown as Record<string, unknown>,
  });
}

/**
 * Create a proforma invoice in Fakturoid.
 * After payment, Fakturoid auto-creates final invoice (proforma_followup_document).
 */
export async function createProformaInvoice(
  input: Omit<CreateInvoiceInput, "document_type" | "proforma_followup_document">,
): Promise<FakturoidInvoice> {
  return createInvoice({
    ...input,
    document_type: "proforma",
    proforma_followup_document: "final_invoice_paid",
  });
}

// ---------------------------------------------------------------
// Account info
// ---------------------------------------------------------------

interface FakturoidAccount {
  vat_payer: boolean;
  vat_mode: string | null;
  [key: string]: unknown;
}

let cachedAccount: FakturoidAccount | null = null;

/**
 * Get Fakturoid account info (cached).
 * Used to determine VAT payer status.
 */
export async function getAccount(): Promise<FakturoidAccount> {
  if (cachedAccount) return cachedAccount;
  cachedAccount = await fakturoidFetch<FakturoidAccount>("/account.json");
  return cachedAccount;
}

/**
 * Get the effective VAT rate for invoice lines.
 * Returns 0 if the Fakturoid account is not a VAT payer.
 */
export async function getEffectiveVatRate(
  desiredRate: number,
): Promise<number> {
  const account = await getAccount();
  return account.vat_payer ? desiredRate : 0;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Determine proper unit name for a Fakturoid line based on item name.
 */
function getUnitName(nazev: string): string {
  const lower = nazev.toLowerCase();
  if (lower.includes("doprava") || lower.includes("km")) return "km";
  if (lower.includes("m²") || lower.includes("plocha")) return "m²";
  if (lower.includes("hodina") || lower.includes("hod")) return "hod";
  if (lower.includes("práce technika") || lower.includes("výjezd")) return "ks";
  return "ks";
}

/**
 * Build Fakturoid invoice lines from zakazka_polozky.
 */
export function buildInvoiceLines(
  polozky: Array<{
    nazev: string;
    pocet: number;
    cena_za_kus: number;
  }>,
  dphSazba: number,
): FakturoidInvoiceLine[] {
  return polozky.map((p) => ({
    name: p.nazev,
    quantity: p.pocet,
    unit_price: p.cena_za_kus,
    vat_rate: dphSazba,
    unit_name: getUnitName(p.nazev),
  }));
}

/**
 * Map Fakturoid invoice status to our stav_faktury.
 */
export function mapFakturoidStatus(
  fakturoidStatus: string,
): "vytvorena" | "odeslana" | "uhrazena" | "po_splatnosti" | "storno" {
  switch (fakturoidStatus) {
    case "open":
      return "vytvorena";
    case "sent":
      return "odeslana";
    case "overdue":
      return "po_splatnosti";
    case "paid":
      return "uhrazena";
    case "cancelled":
      return "storno";
    default:
      return "vytvorena";
  }
}
