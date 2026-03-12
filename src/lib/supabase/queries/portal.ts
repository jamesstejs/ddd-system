/**
 * Portal queries — klient-facing queries for the client portal.
 * Sprint 32: Klientský portál základ
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get klient record linked to the authenticated user.
 * klient_id is stored on the profile when the klient account is created.
 */
export async function getKlientByUserId(
  supabase: TypedSupabase,
  userId: string,
) {
  return supabase
    .from("profiles")
    .select("klient_id")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();
}

/**
 * Get protocols for a given klient (via klient's objects).
 */
export async function getProtokolyForKlient(
  supabase: TypedSupabase,
  klientId: string,
) {
  return supabase
    .from("protokoly")
    .select(
      `
      id,
      cislo_protokolu,
      status,
      created_at,
      zodpovedny_technik,
      zasahy!protokoly_zasah_id_fkey (
        id, datum, cas_od,
        zakazky (
          id, typ, typy_zasahu,
          objekty (
            id, nazev, adresa,
            klienti ( id, nazev, jmeno, prijmeni, typ )
          )
        )
      )
    `,
    )
    .in("status", ["schvaleny", "odeslany"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
}

/**
 * Get invoices for a given klient.
 */
export async function getFakturyForKlient(
  supabase: TypedSupabase,
  klientId: string,
) {
  return supabase
    .from("faktury")
    .select(
      `
      id,
      cislo,
      castka_bez_dph,
      castka_s_dph,
      stav,
      created_at,
      datum_vystaveni,
      datum_splatnosti,
      fakturoid_id,
      zakazky:zakazka_id (
        id, typ,
        objekty:objekt_id (
          nazev,
          klienti:klient_id ( id, nazev, jmeno, prijmeni, typ )
        )
      )
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
}

/**
 * Get upcoming zasahy (appointments) for a klient.
 */
export async function getUpcomingZasahyForKlient(
  supabase: TypedSupabase,
  klientId: string,
  fromDate: string,
) {
  return supabase
    .from("zasahy")
    .select(
      `
      id, datum, cas_od, cas_do, status,
      profiles!zasahy_technik_id_fkey ( jmeno, prijmeni, telefon ),
      zakazky!zasahy_zakazka_id_fkey (
        id, typ, typy_zasahu,
        objekty (
          id, nazev, adresa,
          klienti ( id, nazev, jmeno, prijmeni, typ )
        )
      )
    `,
    )
    .gte("datum", fromDate)
    .not("status", "eq", "zruseno")
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true })
    .limit(20);
}
