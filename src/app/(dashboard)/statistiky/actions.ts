"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getKlientiForExport,
  getZakazkyForExport,
  getFakturyForExport,
  getZasahyForExport,
} from "@/lib/supabase/queries/statistiky";

/**
 * Export data as CSV string. Only admin/super_admin can call this.
 */
export async function exportCsvAction(
  type: "klienti" | "zakazky" | "faktury" | "zasahy",
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  const role = profile?.aktivni_role;
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("Nemáte oprávnění");
  }

  switch (type) {
    case "klienti":
      return exportKlienti(supabase);
    case "zakazky":
      return exportZakazky(supabase);
    case "faktury":
      return exportFaktury(supabase);
    case "zasahy":
      return exportZasahy(supabase);
    default:
      throw new Error("Neplatný typ exportu");
  }
}

async function exportKlienti(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await getKlientiForExport(supabase);
  if (!data || data.length === 0) return "Žádná data";

  const header = "ID;Název;Jméno;Příjmení;Typ;IČO;DIČ;Email;Telefon;Adresa;Vytvořeno";
  const rows = data.map((k) =>
    [k.id, k.nazev, k.jmeno, k.prijmeni, k.typ, k.ico, k.dic, k.email, k.telefon, k.adresa, k.created_at].join(";"),
  );
  return [header, ...rows].join("\n");
}

async function exportZakazky(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await getZakazkyForExport(supabase);
  if (!data || data.length === 0) return "Žádná data";

  type ZRow = {
    id: string;
    typ: string;
    status: string;
    typy_zasahu: unknown;
    cetnost_dny: number | null;
    cena_zaklad: number | null;
    cena_po_sleve: number | null;
    cena_s_dph: number | null;
    created_at: string;
    objekty: { nazev: string; klienti: { nazev: string; jmeno: string; prijmeni: string; typ: string } };
  };

  const header = "ID;Typ;Status;Typy zásahu;Četnost dny;Cena základ;Cena po slevě;Cena s DPH;Objekt;Klient;Vytvořeno";
  const rows = (data as unknown as ZRow[]).map((z) => {
    const klient = z.objekty?.klienti;
    const klientName = klient?.typ === "firma" ? klient.nazev : `${klient?.prijmeni} ${klient?.jmeno}`.trim();
    return [
      z.id, z.typ, z.status, JSON.stringify(z.typy_zasahu), z.cetnost_dny,
      z.cena_zaklad, z.cena_po_sleve, z.cena_s_dph,
      z.objekty?.nazev, klientName, z.created_at,
    ].join(";");
  });
  return [header, ...rows].join("\n");
}

async function exportFaktury(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await getFakturyForExport(supabase);
  if (!data || data.length === 0) return "Žádná data";

  const header = "ID;Číslo;Částka bez DPH;Částka s DPH;DPH sazba;Stav;Datum vystavení;Datum splatnosti;Vytvořeno";
  const rows = data.map((f) =>
    [f.id, f.cislo, f.castka_bez_dph, f.castka_s_dph, f.dph_sazba, f.stav, f.datum_vystaveni, f.datum_splatnosti, f.created_at].join(";"),
  );
  return [header, ...rows].join("\n");
}

async function exportZasahy(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await getZasahyForExport(supabase);
  if (!data || data.length === 0) return "Žádná data";

  type ZRow = {
    id: string;
    datum: string;
    cas_od: string;
    cas_do: string;
    status: string;
    created_at: string;
    profiles: { jmeno: string; prijmeni: string } | null;
    zakazky: {
      typ: string;
      typy_zasahu: unknown;
      objekty: { nazev: string; adresa: string | null; klienti: { nazev: string; jmeno: string; prijmeni: string; typ: string } };
    } | null;
  };

  const header = "ID;Datum;Čas od;Čas do;Status;Technik;Objekt;Adresa;Klient;Typ zakázky;Typy zásahu;Vytvořeno";
  const rows = (data as unknown as ZRow[]).map((z) => {
    const technik = z.profiles ? `${z.profiles.jmeno} ${z.profiles.prijmeni}` : "";
    const klient = z.zakazky?.objekty?.klienti;
    const klientName = klient?.typ === "firma" ? klient.nazev : `${klient?.prijmeni} ${klient?.jmeno}`.trim();
    return [
      z.id, z.datum, z.cas_od, z.cas_do, z.status, technik,
      z.zakazky?.objekty?.nazev, z.zakazky?.objekty?.adresa,
      klientName, z.zakazky?.typ, JSON.stringify(z.zakazky?.typy_zasahu), z.created_at,
    ].join(";");
  });
  return [header, ...rows].join("\n");
}
