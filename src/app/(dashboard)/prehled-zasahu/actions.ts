"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import {
  getOverdueZasahyFull,
  getZasahyBezFaktury,
  postponeZasah,
} from "@/lib/supabase/queries/zasahy";
import {
  getAktivniPripominkyWithRegion,
  updatePripominka,
} from "@/lib/supabase/queries/pripominky";
import { sendOdlozeniEmail } from "@/lib/email/sendOdlozeniEmail";

const REVALIDATE_PATH = "/prehled-zasahu";

// ---------------------------------------------------------------
// Načtení dat pro přehled
// ---------------------------------------------------------------

/**
 * Načte data pro všechny 3 taby přehledu zásahů.
 */
export async function getPrehledDataAction() {
  const { supabase } = await requireAdmin();

  const today = new Date().toISOString().split("T")[0];

  const [pripominkyRes, overdueRes, fakturaceRes] = await Promise.all([
    getAktivniPripominkyWithRegion(supabase),
    getOverdueZasahyFull(supabase, today),
    getZasahyBezFaktury(supabase),
  ]);

  if (pripominkyRes.error) throw new Error(pripominkyRes.error.message);
  if (overdueRes.error) throw new Error(overdueRes.error.message);
  if (fakturaceRes.error) throw new Error(fakturaceRes.error.message);

  // Transform pripominky
  const pripominky = (pripominkyRes.data || []).map((p) => {
    const profiles = p.profiles as Record<string, unknown> | null;
    const zasahy = p.zasahy as Record<string, unknown> | null;
    const zakazky = p.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const klienti = objekty?.klienti as Record<string, unknown> | null;

    return {
      id: p.id,
      stav: p.stav,
      pocet_upozorneni: p.pocet_upozorneni,
      posledni_upozorneni_at: p.posledni_upozorneni_at,
      created_at: p.created_at,
      technik: profiles
        ? {
            id: profiles.id as string,
            jmeno: profiles.jmeno as string,
            prijmeni: profiles.prijmeni as string,
            pobocka: (profiles.pobocka as string) || null,
          }
        : null,
      zasah: zasahy
        ? {
            id: zasahy.id as string,
            datum: zasahy.datum as string,
            cas_od: zasahy.cas_od as string,
            cas_do: zasahy.cas_do as string,
          }
        : null,
      zakazka: zakazky
        ? {
            id: zakazky.id as string,
            typ: zakazky.typ as string,
            objekt: objekty
              ? {
                  id: objekty.id as string,
                  nazev: objekty.nazev as string,
                  adresa: objekty.adresa as string,
                  klient: klienti
                    ? {
                        id: klienti.id as string,
                        nazev: (klienti.nazev as string) || null,
                        jmeno: klienti.jmeno as string,
                        prijmeni: klienti.prijmeni as string,
                        typ: klienti.typ as string,
                        telefon: (klienti.telefon as string) || null,
                        email: (klienti.email as string) || null,
                      }
                    : {
                        id: "",
                        nazev: null,
                        jmeno: "",
                        prijmeni: "",
                        typ: "fyzicka_osoba",
                        telefon: null,
                        email: null,
                      },
                }
              : {
                  id: "",
                  nazev: "",
                  adresa: "",
                  klient: {
                    id: "",
                    nazev: null,
                    jmeno: "",
                    prijmeni: "",
                    typ: "fyzicka_osoba",
                    telefon: null,
                    email: null,
                  },
                },
          }
        : null,
    };
  });

  // Transform overdue
  const overdue = (overdueRes.data || []).map((z) => {
    const profiles = z.profiles as Record<string, unknown> | null;
    const zakazky = z.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const klienti = objekty?.klienti as Record<string, unknown> | null;

    const dnyZpozdeni = Math.floor(
      (Date.now() - new Date(z.datum).getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: z.id,
      datum: z.datum,
      cas_od: z.cas_od,
      cas_do: z.cas_do,
      status: z.status,
      poznamka: z.poznamka,
      puvodni_datum: z.puvodni_datum,
      odlozeno_at: z.odlozeno_at,
      odlozeni_duvod: z.odlozeni_duvod,
      odlozeno_kym: z.odlozeno_kym,
      dny_zpozdeni: dnyZpozdeni,
      technik: profiles
        ? {
            id: profiles.id as string,
            jmeno: profiles.jmeno as string,
            prijmeni: profiles.prijmeni as string,
            pobocka: (profiles.pobocka as string) || null,
          }
        : null,
      zakazka: zakazky
        ? {
            id: zakazky.id as string,
            typ: zakazky.typ as string,
            typy_zasahu: (zakazky.typy_zasahu as string[]) || null,
            objekt: objekty
              ? {
                  id: objekty.id as string,
                  nazev: objekty.nazev as string,
                  adresa: objekty.adresa as string,
                  klient: klienti
                    ? {
                        id: klienti.id as string,
                        nazev: (klienti.nazev as string) || null,
                        jmeno: klienti.jmeno as string,
                        prijmeni: klienti.prijmeni as string,
                        typ: klienti.typ as string,
                        telefon: (klienti.telefon as string) || null,
                        email: (klienti.email as string) || null,
                      }
                    : {
                        id: "",
                        nazev: null,
                        jmeno: "",
                        prijmeni: "",
                        typ: "fyzicka_osoba",
                        telefon: null,
                        email: null,
                      },
                }
              : {
                  id: "",
                  nazev: "",
                  adresa: "",
                  klient: {
                    id: "",
                    nazev: null,
                    jmeno: "",
                    prijmeni: "",
                    typ: "fyzicka_osoba",
                    telefon: null,
                    email: null,
                  },
                },
          }
        : null,
    };
  });

  // Transform fakturace
  const fakturace = (fakturaceRes.data || []).map((z) => {
    const profiles = z.profiles as Record<string, unknown> | null;
    const zakazky = z.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as Record<string, unknown> | null;
    const klienti = objekty?.klienti as Record<string, unknown> | null;

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
    }> | null;

    const protokol = protokolArr?.[0] || null;
    const faktura = protokol?.faktury?.[0] || null;

    return {
      id: z.id,
      datum: z.datum,
      cas_od: z.cas_od,
      cas_do: z.cas_do,
      status: z.status,
      technik: profiles
        ? {
            id: profiles.id as string,
            jmeno: profiles.jmeno as string,
            prijmeni: profiles.prijmeni as string,
            pobocka: (profiles.pobocka as string) || null,
          }
        : null,
      zakazka: zakazky
        ? {
            id: zakazky.id as string,
            typ: zakazky.typ as string,
            typy_zasahu: (zakazky.typy_zasahu as string[]) || null,
            objekt: objekty
              ? {
                  id: objekty.id as string,
                  nazev: objekty.nazev as string,
                  adresa: objekty.adresa as string,
                  klient: klienti
                    ? {
                        id: klienti.id as string,
                        nazev: (klienti.nazev as string) || null,
                        jmeno: klienti.jmeno as string,
                        prijmeni: klienti.prijmeni as string,
                        typ: klienti.typ as string,
                        telefon: (klienti.telefon as string) || null,
                        email: (klienti.email as string) || null,
                      }
                    : {
                        id: "",
                        nazev: null,
                        jmeno: "",
                        prijmeni: "",
                        typ: "fyzicka_osoba",
                        telefon: null,
                        email: null,
                      },
                }
              : {
                  id: "",
                  nazev: "",
                  adresa: "",
                  klient: {
                    id: "",
                    nazev: null,
                    jmeno: "",
                    prijmeni: "",
                    typ: "fyzicka_osoba",
                    telefon: null,
                    email: null,
                  },
                },
          }
        : null,
      protokol: protokol
        ? {
            id: protokol.id,
            status: protokol.status,
            cislo_protokolu: protokol.cislo_protokolu,
          }
        : null,
      faktura: faktura
        ? {
            id: faktura.id,
            stav: faktura.stav,
            cislo: faktura.cislo,
            castka_s_dph: faktura.castka_s_dph,
            datum_splatnosti: faktura.datum_splatnosti,
          }
        : null,
    };
  });

  return {
    pripominky,
    overdue,
    fakturace,
    counts: {
      pripominky: pripominky.length,
      overdue: overdue.length,
      fakturace: fakturace.length,
    },
  };
}

// ---------------------------------------------------------------
// Posunutí zásahu (admin)
// ---------------------------------------------------------------

/**
 * Admin posune zpožděný zásah na nový datum.
 * Odešle email klientovi (fire-and-forget).
 */
export async function postponeZasahAction(
  zasahId: string,
  newDatum: string,
  duvod: string | null,
) {
  const { supabase } = await requireAdmin();

  // Validace: datum v budoucnosti
  const today = new Date().toISOString().split("T")[0];
  if (newDatum <= today) {
    throw new Error("Novy datum musi byt v budoucnosti");
  }

  // Načtení starého data pro email
  const { data: zasahBefore } = await supabase
    .from("zasahy")
    .select("datum")
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasahBefore) {
    throw new Error("Zasah nenalezen");
  }

  const puvodniDatum = zasahBefore.datum;

  // Atomické posunutí
  const { error } = await postponeZasah(
    supabase,
    zasahId,
    newDatum,
    duvod,
    "admin",
  );
  if (error) throw new Error("error" in error ? (error as { message: string }).message : "Chyba pri posunuti");

  // Fire-and-forget email
  sendOdlozeniEmail(
    supabase,
    zasahId,
    puvodniDatum,
    newDatum,
    duvod,
    "admin",
  ).catch(() => {
    // Silently ignore — logged in email_log
  });

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}

// ---------------------------------------------------------------
// Vyřešení připomínky z přehledu
// ---------------------------------------------------------------

/**
 * Označí připomínku jako vyřešenou.
 */
export async function resolvePripominkaFromPrehledAction(
  pripominkaId: string,
) {
  const { supabase } = await requireAdmin();

  const { error } = await updatePripominka(supabase, pripominkaId, {
    stav: "vyreseno",
  });
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}
