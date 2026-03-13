import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get all zasahy in a date range, with joined zakazka → objekt → klient + technik profile.
 * Used for admin calendar view.
 */
export async function getZasahy(
  supabase: TypedSupabase,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      *,
      profiles!zasahy_technik_id_fkey (
        id,
        jmeno,
        prijmeni,
        email,
        koeficient_rychlosti
      ),
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        status,
        typy_zasahu,
        skudci,
        poznamka,
        objekty!inner (
          id,
          nazev,
          adresa,
          plocha_m2,
          typ_objektu,
          klient_id,
          lat,
          lng,
          klienti!inner (
            id,
            nazev,
            jmeno,
            prijmeni,
            typ,
            telefon,
            email
          )
        )
      )
    `,
    )
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

/**
 * Get zasahy for a specific technik in a date range.
 * Used for technik "Můj den" view.
 */
export async function getZasahyForTechnik(
  supabase: TypedSupabase,
  technikId: string,
  datumOd: string,
  datumDo: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      *,
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        status,
        typy_zasahu,
        skudci,
        cetnost_dny,
        platba_predem,
        objekty!inner (
          id,
          nazev,
          adresa,
          plocha_m2,
          typ_objektu,
          klient_id,
          lat,
          lng,
          klienti!inner (
            id,
            nazev,
            jmeno,
            prijmeni,
            typ,
            telefon,
            email
          )
        )
      )
    `,
    )
    .eq("technik_id", technikId)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

/**
 * Get a single zasah by ID with full joined data.
 */
export async function getZasah(supabase: TypedSupabase, id: string) {
  return supabase
    .from("zasahy")
    .select(
      `
      *,
      profiles!zasahy_technik_id_fkey (
        id,
        jmeno,
        prijmeni,
        email,
        koeficient_rychlosti
      ),
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        status,
        typy_zasahu,
        skudci,
        poznamka,
        objekty!inner (
          id,
          nazev,
          adresa,
          plocha_m2,
          typ_objektu,
          klient_id,
          lat,
          lng,
          klienti!inner (
            id,
            nazev,
            jmeno,
            prijmeni,
            typ,
            telefon,
            email
          )
        )
      )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();
}

/**
 * Create a new zasah.
 */
export async function createZasah(
  supabase: TypedSupabase,
  data: Database["public"]["Tables"]["zasahy"]["Insert"],
) {
  return supabase.from("zasahy").insert(data).select().single();
}

/**
 * Update an existing zasah.
 */
export async function updateZasah(
  supabase: TypedSupabase,
  id: string,
  data: Database["public"]["Tables"]["zasahy"]["Update"],
) {
  return supabase
    .from("zasahy")
    .update(data)
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();
}

/**
 * Soft-delete a zasah.
 */
export async function softDeleteZasah(supabase: TypedSupabase, id: string) {
  return supabase
    .from("zasahy")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
}

/**
 * Get technici (profiles with role 'technik') for selection in admin forms.
 */
export async function getTechnici(supabase: TypedSupabase) {
  return supabase
    .from("profiles")
    .select("id, jmeno, prijmeni, email, koeficient_rychlosti, role")
    .contains("role", ["technik"])
    .is("deleted_at", null)
    .order("prijmeni", { ascending: true });
}

/**
 * Get overdue zasahy — past date, not completed (status != hotovo, zruseno).
 * Used for admin dashboard "Věci ve zpoždění" widget.
 */
/**
 * Get all zasahy for a specific date (all technicians).
 * Used for capacity calculation in dispatcher view.
 */
export async function getZasahyForDate(
  supabase: TypedSupabase,
  datum: string,
) {
  return supabase
    .from("zasahy")
    .select("id, technik_id, cas_od, cas_do, status")
    .eq("datum", datum)
    .is("deleted_at", null)
    .not("status", "eq", "zruseno")
    .order("cas_od", { ascending: true });
}

/**
 * Get technici filtered by pobocka (region) — via junction table technik_pobocky.
 * A technik can be assigned to multiple regions and will appear in all of them.
 */
export async function getTechniciByPobocka(
  supabase: TypedSupabase,
  pobocka: string,
) {
  // 1. Get technik IDs from junction table
  const { data: junctionRows, error: jErr } = await supabase
    .from("technik_pobocky")
    .select("technik_id")
    .eq("pobocka", pobocka)
    .is("deleted_at", null);

  if (jErr) return { data: null, error: jErr };
  if (!junctionRows || junctionRows.length === 0) {
    // Return same shape as a successful Supabase query with no results
    return supabase
      .from("profiles")
      .select(
        "id, jmeno, prijmeni, email, koeficient_rychlosti, role, pobocka, pozadovane_hodiny_tyden, pozadovane_dny_tyden",
      )
      .eq("id", "00000000-0000-0000-0000-000000000000"); // no match
  }

  const technikIds = [...new Set(junctionRows.map((r: { technik_id: string }) => r.technik_id))];

  // 2. Fetch profiles
  return supabase
    .from("profiles")
    .select(
      "id, jmeno, prijmeni, email, koeficient_rychlosti, role, pobocka, pozadovane_hodiny_tyden, pozadovane_dny_tyden",
    )
    .in("id", technikIds)
    .contains("role", ["technik"])
    .is("deleted_at", null)
    .order("prijmeni", { ascending: true });
}

/**
 * Get zasahy for a list of technicians in a date range.
 * Used for dispatch weekly grid.
 */
export async function getZasahyForTechniciRange(
  supabase: TypedSupabase,
  technikIds: string[],
  datumOd: string,
  datumDo: string,
) {
  if (technikIds.length === 0) {
    return { data: [], error: null };
  }
  return supabase
    .from("zasahy")
    .select(
      `
      id, technik_id, datum, cas_od, cas_do, status, poznamka,
      zakazky!zasahy_zakazka_id_fkey (
        id,
        typ,
        typy_zasahu,
        objekty!inner (
          nazev,
          adresa,
          klienti!inner (
            nazev, jmeno, prijmeni, typ
          )
        )
      )
    `,
    )
    .in("technik_id", technikIds)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .not("status", "eq", "zruseno")
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });
}

export async function getOverdueZasahy(
  supabase: TypedSupabase,
  beforeDate: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      id, datum, cas_od, status,
      profiles!zasahy_technik_id_fkey ( jmeno, prijmeni ),
      zakazky!zasahy_zakazka_id_fkey (
        objekty (
          nazev,
          klienti ( nazev, jmeno, prijmeni, typ )
        )
      )
    `,
    )
    .lt("datum", beforeDate)
    .not("status", "in", '("hotovo","zruseno")')
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .limit(20);
}

/**
 * Get ALL overdue zasahy (no limit) with full join data including
 * technik pobočka for region filtering + postponement tracking fields.
 * Used for admin "Přehled zásahů" page — Zpožděné tab.
 */
export async function getOverdueZasahyFull(
  supabase: TypedSupabase,
  beforeDate: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      id, datum, cas_od, cas_do, status, poznamka,
      puvodni_datum, odlozeno_at, odlozeni_duvod, odlozeno_kym,
      profiles!zasahy_technik_id_fkey (
        id, jmeno, prijmeni, pobocka
      ),
      zakazky!zasahy_zakazka_id_fkey (
        id, typ, typy_zasahu,
        objekty!inner (
          id, nazev, adresa,
          klienti!inner (
            id, nazev, jmeno, prijmeni, typ, telefon, email
          )
        )
      )
    `,
    )
    .lt("datum", beforeDate)
    .not("status", "in", '("hotovo","zruseno")')
    .is("deleted_at", null)
    .order("datum", { ascending: true });
}

/**
 * Get completed zasahy that are missing a faktura or have an unpaid one.
 * Join chain: zasahy → zakazky → objekty → klienti + zasahy → protokoly → faktury.
 * Used for admin "Přehled zásahů" page — Fakturace tab.
 */
export async function getZasahyBezFaktury(supabase: TypedSupabase) {
  // First get completed zasahy with their protokoly
  const { data: zasahy, error } = await supabase
    .from("zasahy")
    .select(
      `
      id, datum, cas_od, cas_do, status,
      profiles!zasahy_technik_id_fkey (
        id, jmeno, prijmeni, pobocka
      ),
      zakazky!zasahy_zakazka_id_fkey (
        id, typ, typy_zasahu,
        objekty!inner (
          id, nazev, adresa,
          klienti!inner (
            id, nazev, jmeno, prijmeni, typ, telefon, email
          )
        )
      ),
      protokoly!protokoly_zasah_id_fkey (
        id, status, cislo_protokolu,
        faktury!faktury_protokol_id_fkey (
          id, stav, cislo, castka_s_dph, datum_splatnosti
        )
      )
    `,
    )
    .eq("status", "hotovo")
    .is("deleted_at", null)
    .order("datum", { ascending: false });

  if (error) return { data: null, error };

  // Filter: keep only zasahy where there's no faktura or faktura is not uhrazena
  const filtered = (zasahy || []).filter((z) => {
    const protokolArr = z.protokoly as unknown as Array<{
      id: string;
      status: string;
      cislo_protokolu: string | null;
      faktury: Array<{
        id: string;
        stav: string;
        cislo: string | null;
        castka_s_dph: number | null;
        datum_splatnosti: string | null;
      }> | null;
    }>;
    if (!protokolArr || protokolArr.length === 0) return true; // No protokol = needs invoice
    const protokol = protokolArr[0];
    if (!protokol.faktury || protokol.faktury.length === 0) return true; // No faktura
    // Has faktura but not paid
    return protokol.faktury.some((f) => f.stav !== "uhrazena" && f.stav !== "storno");
  });

  return { data: filtered, error: null };
}

/**
 * Atomically postpone a zasah — sets new datum, preserves original,
 * records who postponed and why.
 */
export async function postponeZasah(
  supabase: TypedSupabase,
  zasahId: string,
  newDatum: string,
  duvod: string | null,
  kym: "admin" | "klient",
) {
  // First fetch current datum to preserve as puvodni_datum (only if not already set)
  const { data: current, error: fetchError } = await supabase
    .from("zasahy")
    .select("datum, puvodni_datum")
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (fetchError || !current) {
    return { data: null, error: fetchError || new Error("Zásah nenalezen") };
  }

  return updateZasah(supabase, zasahId, {
    datum: newDatum,
    // Preserve original datum only on first postponement
    puvodni_datum: current.puvodni_datum || current.datum,
    odlozeno_at: new Date().toISOString(),
    odlozeni_duvod: duvod,
    odlozeno_kym: kym,
  });
}
