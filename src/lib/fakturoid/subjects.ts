/**
 * Fakturoid Subjects (contacts) — sync klienti ↔ Fakturoid.
 */

import { fakturoidFetch } from "./client";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface FakturoidSubject {
  id: number;
  name: string;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  registration_no: string | null;
  vat_no: string | null;
  email: string | null;
  phone: string | null;
  type: "customer" | "supplier" | "both";
  created_at: string;
  updated_at: string;
}

export interface CreateSubjectInput {
  name: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
  registration_no?: string | null;
  vat_no?: string | null;
  email?: string | null;
  phone?: string | null;
  type?: "customer" | "supplier" | "both";
}

// ---------------------------------------------------------------
// API calls
// ---------------------------------------------------------------

/**
 * Search Fakturoid subjects by query string (name, email, IČO, DIČ).
 */
export async function searchSubjects(
  query: string,
): Promise<FakturoidSubject[]> {
  return fakturoidFetch<FakturoidSubject[]>(
    `/subjects/search.json?query=${encodeURIComponent(query)}`,
  );
}

/**
 * Get a single subject by its Fakturoid ID.
 */
export async function getSubject(
  subjectId: number,
): Promise<FakturoidSubject> {
  return fakturoidFetch<FakturoidSubject>(`/subjects/${subjectId}.json`);
}

/**
 * Create a new subject in Fakturoid.
 */
export async function createSubject(
  input: CreateSubjectInput,
): Promise<FakturoidSubject> {
  return fakturoidFetch<FakturoidSubject>("/subjects.json", {
    method: "POST",
    body: input as unknown as Record<string, unknown>,
  });
}

/**
 * Update an existing subject in Fakturoid.
 */
export async function updateSubject(
  subjectId: number,
  input: Partial<CreateSubjectInput>,
): Promise<FakturoidSubject> {
  return fakturoidFetch<FakturoidSubject>(`/subjects/${subjectId}.json`, {
    method: "PATCH",
    body: input as unknown as Record<string, unknown>,
  });
}

// ---------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------

/**
 * Parse address string "Dvořákova 475, 252 64 Velké Přílepy" into parts.
 * Best-effort: returns street and city/zip if detectable.
 */
export function parseAdresa(adresa: string): {
  street: string;
  city: string;
  zip: string;
} {
  // Try to match: "Street 123, ZIP City"
  const match = adresa.match(/^(.+?),\s*(\d{3}\s?\d{2})\s+(.+)$/);
  if (match) {
    return {
      street: match[1].trim(),
      zip: match[2].replace(/\s/g, ""),
      city: match[3].trim(),
    };
  }

  // Fallback: just street
  return { street: adresa.trim(), city: "", zip: "" };
}

/**
 * Build Fakturoid subject input from our klient data.
 */
export function buildSubjectInput(klient: {
  nazev: string;
  jmeno: string;
  prijmeni: string;
  typ: "firma" | "fyzicka_osoba";
  ico?: string | null;
  dic?: string | null;
  email?: string | null;
  telefon?: string | null;
  adresa: string;
}): CreateSubjectInput {
  const name =
    klient.typ === "firma"
      ? klient.nazev
      : `${klient.prijmeni} ${klient.jmeno}`.trim() || klient.nazev;

  const { street, city, zip } = parseAdresa(klient.adresa);

  return {
    name,
    street,
    city,
    zip,
    country: "CZ",
    registration_no: klient.ico || undefined,
    vat_no: klient.dic || undefined,
    email: klient.email || undefined,
    phone: klient.telefon || undefined,
    type: "customer",
  };
}

/**
 * Find or create a Fakturoid subject for a klient.
 * Returns the Fakturoid subject_id.
 *
 * 1. If klient.fakturoid_subject_id exists → verify it exists in Fakturoid
 * 2. If klient has IČO → search by IČO
 * 3. Otherwise → create new subject
 */
export async function findOrCreateSubject(klient: {
  nazev: string;
  jmeno: string;
  prijmeni: string;
  typ: "firma" | "fyzicka_osoba";
  ico?: string | null;
  dic?: string | null;
  email?: string | null;
  telefon?: string | null;
  adresa: string;
  fakturoid_subject_id?: number | null;
}): Promise<number> {
  // 1. Already linked — verify it's still valid
  if (klient.fakturoid_subject_id) {
    try {
      const subject = await getSubject(klient.fakturoid_subject_id);
      if (subject?.id) return subject.id;
    } catch {
      // Subject was deleted in Fakturoid — continue to search/create
    }
  }

  // 2. Search by IČO
  if (klient.ico) {
    const results = await searchSubjects(klient.ico);
    const match = results.find((s) => s.registration_no === klient.ico);
    if (match) return match.id;
  }

  // 3. Create new
  const input = buildSubjectInput(klient);
  const created = await createSubject(input);
  return created.id;
}
