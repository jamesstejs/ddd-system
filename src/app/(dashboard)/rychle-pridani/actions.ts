"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import { searchKlienti } from "@/lib/supabase/queries/klienti";
import { createZakazka, getUnscheduledZakazky } from "@/lib/supabase/queries/zakazky";
import { createZasah, getTechnici, getZasahyForDate } from "@/lib/supabase/queries/zasahy";
import { getAllDostupnostForDate } from "@/lib/supabase/queries/dostupnost";
import { sendZasahPredEmail } from "@/lib/email/sendZasahPredEmail";
import { computeTechnikCapacity, type TechnikCapacity } from "@/lib/utils/capacityUtils";

// ---------------------------------------------------------------
// Search klienti (typeahead)
// ---------------------------------------------------------------

export async function searchKlientiAction(query: string) {
  const { supabase } = await requireAdmin();

  if (!query || query.trim().length < 2) return [];

  const { data, error } = await searchKlienti(supabase, query.trim());
  if (error) {
    console.error("[searchKlientiAction] Supabase error:", error.message, error.details);
    throw new Error(error.message);
  }
  return data || [];
}

// ---------------------------------------------------------------
// Quick create klient (minimální data)
// ---------------------------------------------------------------

export async function quickCreateKlientAction(input: {
  jmeno: string;
  prijmeni?: string;
  telefon: string;
  adresa: string;
}) {
  const { supabase } = await requireAdmin();

  if (!input.jmeno || !input.telefon) {
    throw new Error("Jméno a telefon jsou povinné");
  }

  // Vytvoř klienta jako FO
  const { data: klient, error: klientError } = await supabase
    .from("klienti")
    .insert({
      typ: "fyzicka_osoba" as "fyzicka_osoba" | "firma",
      jmeno: input.jmeno,
      prijmeni: input.prijmeni || undefined,
      telefon: input.telefon,
      adresa: input.adresa || undefined,
    })
    .select()
    .single();

  if (klientError) throw new Error(klientError.message);

  // Vytvoř default objekt z adresy
  const { data: objekt, error: objektError } = await supabase
    .from("objekty")
    .insert({
      klient_id: klient.id,
      nazev: input.adresa || "Hlavní objekt",
      adresa: input.adresa || "",
      typ_objektu: "domacnost",
    })
    .select()
    .single();

  if (objektError) throw new Error(objektError.message);

  revalidatePath("/klienti");
  return { klient, objekt };
}

// ---------------------------------------------------------------
// Quick create zakázka + zásah (atomický)
// ---------------------------------------------------------------

export async function quickCreateZakazkaWithZasahAction(input: {
  objekt_id: string;
  typ: "jednorazova" | "smluvni";
  typy_zasahu: string[];
  skudci: string[];
  poznamka?: string;
  // Zasah data
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
}) {
  const { supabase } = await requireAdmin();

  // Validace
  if (!input.objekt_id) throw new Error("Objekt je povinný");
  if (!input.typy_zasahu.length) throw new Error("Typ zásahu je povinný");
  if (!input.technik_id) throw new Error("Technik je povinný");
  if (!input.datum) throw new Error("Datum je povinné");
  if (input.cas_od >= input.cas_do) throw new Error("Čas od musí být menší než čas do");

  // 1. Vytvoř zakázku
  const { data: zakazka, error: zakazkaError } = await createZakazka(supabase, {
    objekt_id: input.objekt_id,
    typ: input.typ,
    status: "aktivni",
    typy_zasahu: input.typy_zasahu,
    skudci: input.skudci,
    poznamka: input.poznamka || null,
    platba_predem: false,
  });

  if (zakazkaError) throw new Error(zakazkaError.message);

  // 2. Vytvoř zásah
  const { data: zasah, error: zasahError } = await createZasah(supabase, {
    zakazka_id: zakazka.id,
    technik_id: input.technik_id,
    datum: input.datum,
    cas_od: input.cas_od,
    cas_do: input.cas_do,
    status: "naplanovano",
  });

  if (zasahError) throw new Error(zasahError.message);

  // 3. Fire-and-forget email
  if (zasah?.id) {
    sendZasahPredEmail(supabase, zasah.id).catch(() => {});
  }

  revalidatePath("/kalendar");
  revalidatePath("/zakazky");
  revalidatePath("/");

  return { zakazka, zasah };
}

// ---------------------------------------------------------------
// Šablony zakázek
// ---------------------------------------------------------------

export async function getZakazkaSablonyAction() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("zakazka_sablony")
    .select("*")
    .is("deleted_at", null)
    .eq("aktivni", true)
    .order("poradi", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// ---------------------------------------------------------------
// Fronta — nenaplánované zakázky
// ---------------------------------------------------------------

export async function getUnscheduledZakazkyAction() {
  const { supabase } = await requireAdmin();

  const { data, error } = await getUnscheduledZakazky(supabase);
  if (error) throw new Error(error.message);
  return data || [];
}

// ---------------------------------------------------------------
// Technik kapacita pro datum
// ---------------------------------------------------------------

export async function getTechnikCapacityAction(datum: string) {
  const { supabase } = await requireAdmin();

  // Načteme techniky, dostupnost, a zásahy pro daný den
  const [techniciRes, dostupnostRes, zasahyRes] = await Promise.all([
    getTechnici(supabase),
    getAllDostupnostForDate(supabase, datum),
    getZasahyForDate(supabase, datum),
  ]);

  const technici = techniciRes.data || [];
  const allDostupnost = dostupnostRes.data || [];
  const allZasahy = zasahyRes.data || [];

  return technici.map((t) => {
    const techDostupnost = allDostupnost.filter((d) => d.technik_id === t.id);
    const techZasahy = allZasahy.filter((z) => z.technik_id === t.id);

    const capacity = computeTechnikCapacity(
      techDostupnost.map((d) => ({ cas_od: d.cas_od, cas_do: d.cas_do })),
      techZasahy.map((z) => ({ cas_od: z.cas_od, cas_do: z.cas_do, status: z.status })),
    );

    return {
      id: t.id,
      jmeno: t.jmeno,
      prijmeni: t.prijmeni,
      capacity,
    };
  });
}

// ---------------------------------------------------------------
// Objekty pro klienta (reexport pro QuickAddSheet)
// ---------------------------------------------------------------

export async function getObjektyForKlientAction(klientId: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("objekty")
    .select("id, nazev, adresa, typ_objektu, plocha_m2")
    .eq("klient_id", klientId)
    .is("deleted_at", null)
    .order("nazev", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
