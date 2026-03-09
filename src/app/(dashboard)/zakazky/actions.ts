"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireAuth } from "@/lib/auth/requireAuth";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  createZakazka,
  updateZakazka,
  softDeleteZakazka,
} from "@/lib/supabase/queries/zakazky";
import {
  getCenikObecne,
  getCenikPostriky,
  getCenikGely,
  getCenikSpecialni,
  getCenikDeratizace,
  getCenikDezinfekce,
} from "@/lib/supabase/queries/cenik";
import {
  getPolozkyForZakazka,
  replacePolozky,
} from "@/lib/supabase/queries/zakazka_polozky";
import type { CenikData, Polozka } from "@/lib/kalkulacka/vypocetCeny";

type ZakazkaInsert = Database["public"]["Tables"]["zakazky"]["Insert"];

const REVALIDATE_PATH = "/zakazky";

export async function createZakazkaAction(
  data: Omit<ZakazkaInsert, "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();

  const { error } = await createZakazka(supabase, data);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
}

export async function updateZakazkaAction(
  id: string,
  data: Partial<
    Omit<ZakazkaInsert, "id" | "created_at" | "updated_at" | "deleted_at">
  >,
) {
  const { supabase } = await requireAdmin();

  const { error } = await updateZakazka(supabase, id, data);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath(`${REVALIDATE_PATH}/${id}`);
}

export async function deleteZakazkaAction(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await softDeleteZakazka(supabase, id);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
}

/**
 * Fetch objekty for a given klient (used in create form).
 */
export async function getObjektyForKlientAction(klientId: string) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("objekty")
    .select("id, nazev, adresa, plocha_m2, typ_objektu")
    .eq("klient_id", klientId)
    .is("deleted_at", null)
    .order("nazev", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch all škůdci (used in create form).
 */
export async function getSkudciAction() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("skudci")
    .select("id, nazev, typ, doporucena_cetnost_dny, pocet_zasahu")
    .is("deleted_at", null)
    .order("typ", { ascending: true })
    .order("nazev", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Fetch šablony bodů for auto-recommendation.
 */
export async function getSablonyBoduAction(
  typObjektu: Database["public"]["Enums"]["typ_objektu"],
  typZasahu: Database["public"]["Enums"]["typ_zasahu_kalkulacka"],
) {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from("sablony_bodu")
    .select("*")
    .eq("typ_objektu", typObjektu)
    .eq("typ_zasahu", typZasahu)
    .is("deleted_at", null)
    .order("rozsah_m2_od", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

// =====================================================
// Sprint 9 — Cenová kalkulace actions
// =====================================================

/**
 * Fetch all ceník data (6 tables) for client-side price calculation.
 * Available to any authenticated user (technik needs it to see prices).
 */
export async function getCenikDataAction(): Promise<CenikData> {
  const { supabase } = await requireAuth();

  const [obecneRes, postrikyRes, gelyRes, specialniRes, deratizaceRes, dezinfekceRes] =
    await Promise.all([
      getCenikObecne(supabase),
      getCenikPostriky(supabase),
      getCenikGely(supabase),
      getCenikSpecialni(supabase),
      getCenikDeratizace(supabase),
      getCenikDezinfekce(supabase),
    ]);

  return {
    obecne: (obecneRes.data || []).map((r) => ({
      nazev: r.nazev,
      hodnota: Number(r.hodnota),
      jednotka: r.jednotka,
    })),
    postriky: (postrikyRes.data || []).map((r) => ({
      kategorie: r.kategorie,
      plocha_od: r.plocha_od,
      plocha_do: r.plocha_do,
      cena: Number(r.cena),
    })),
    gely: (gelyRes.data || []).map((r) => ({
      kategorie: r.kategorie,
      bytu_od: r.bytu_od,
      bytu_do: r.bytu_do,
      cena: Number(r.cena),
    })),
    specialni: (specialniRes.data || []).map((r) => ({
      nazev: r.nazev,
      cena_od: Number(r.cena_od),
      cena_do: r.cena_do ? Number(r.cena_do) : null,
    })),
    deratizace: (deratizaceRes.data || []).map((r) => ({
      nazev: r.nazev,
      cena_za_kus: Number(r.cena_za_kus),
    })),
    dezinfekce: (dezinfekceRes.data || []).map((r) => ({
      typ: r.typ,
      plocha_od: r.plocha_od,
      plocha_do: r.plocha_do,
      cena_za_m: Number(r.cena_za_m),
    })),
  };
}

/**
 * Save price calculation: update zakazky pricing columns + replace polozky.
 * Admin only.
 */
export async function saveKalkulaceAction(
  zakazkaId: string,
  input: {
    polozky: Polozka[];
    doprava_km: number;
    je_prvni_navsteva: boolean;
    je_vikend: boolean;
    je_nocni: boolean;
    pocet_bytu?: number;
    sleva_typ?: string | null;
    sleva_hodnota?: number;
    sleva_zadal?: string;
    cena_zaklad: number;
    cena_po_sleve: number;
    cena_s_dph: number;
    dph_sazba_snapshot: number;
  },
) {
  const { supabase } = await requireAdmin();

  // Update zakazky pricing columns
  const { error: updateError } = await updateZakazka(supabase, zakazkaId, {
    doprava_km: input.doprava_km,
    je_prvni_navsteva: input.je_prvni_navsteva,
    je_vikend: input.je_vikend,
    je_nocni: input.je_nocni,
    pocet_bytu: input.pocet_bytu ?? null,
    sleva_typ: input.sleva_typ ?? null,
    sleva_hodnota: input.sleva_hodnota ?? 0,
    sleva_zadal: input.sleva_zadal ?? null,
    cena_zaklad: input.cena_zaklad,
    cena_po_sleve: input.cena_po_sleve,
    cena_s_dph: input.cena_s_dph,
    dph_sazba_snapshot: input.dph_sazba_snapshot,
  });
  if (updateError) throw new Error(updateError.message);

  // Replace polozky
  const { error: polozkyError } = await replacePolozky(
    supabase,
    zakazkaId,
    input.polozky.map((p, i) => ({
      nazev: p.nazev,
      pocet: p.pocet,
      cena_za_kus: p.cena_za_kus,
      cena_celkem: p.cena_celkem,
      poradi: i,
    })),
  );
  if (polozkyError) throw new Error(polozkyError.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath(`${REVALIDATE_PATH}/${zakazkaId}`);
}

/**
 * Fetch položky for a zakázka. Available to any authenticated user.
 */
export async function getPolozkyAction(zakazkaId: string) {
  const { supabase } = await requireAuth();

  const { data, error } = await getPolozkyForZakazka(supabase, zakazkaId);
  if (error) throw new Error(error.message);

  return (data || []).map((r) => ({
    nazev: r.nazev,
    pocet: Number(r.pocet),
    cena_za_kus: Number(r.cena_za_kus),
    cena_celkem: Number(r.cena_celkem),
  }));
}
