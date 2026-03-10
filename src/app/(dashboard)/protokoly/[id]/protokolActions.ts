"use server";

import { requireTechnik } from "@/lib/auth/requireTechnik";
import { revalidatePath } from "next/cache";
import {
  createProtokol,
  updateProtokol,
  getProtokolByZasah,
  getProtokol,
  getProtokolDeratBody,
  createProtokolDeratBod,
  updateProtokolDeratBod,
  deleteProtokolDeratBod,
  getLatestProtokolForObjekt,
} from "@/lib/supabase/queries/protokoly";
import { getOkruhy } from "@/lib/supabase/queries/okruhy";
import { getAktivniPripravky } from "@/lib/supabase/queries/pripravky";
import { prefillBodyFromPrevious } from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeratBodInput = {
  id?: string;
  _deleted?: boolean;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: Database["public"]["Enums"]["typ_stanicky"];
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: Database["public"]["Enums"]["stav_stanicky"];
};

// ============================================================
// Init — vytvoření protokolu + generování čísla
// ============================================================

/**
 * Inicializuje nový protokol pro daný zásah.
 * Pokud už protokol pro zásah existuje, vrátí existující.
 * Generuje cislo_protokolu přes DB funkci.
 */
export async function initProtokolAction(zasahId: string) {
  if (!UUID_REGEX.test(zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví zásahu
  const { data: zasah } = await supabase
    .from("zasahy")
    .select("id, technik_id, status, zakazka_id")
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }

  // Pokud už protokol existuje → vrátit ho
  const { data: existing } = await getProtokolByZasah(supabase, zasahId);
  if (existing) {
    return existing;
  }

  // Vytvořit nový protokol
  const { data: protokol, error: createErr } = await createProtokol(supabase, {
    zasah_id: zasahId,
    technik_id: user.id,
    status: "rozpracovany",
  });

  if (createErr || !protokol) {
    throw new Error(createErr?.message || "Nepodařilo se vytvořit protokol");
  }

  // Vygenerovat číslo protokolu přes DB funkci
  const { data: cislo } = await supabase.rpc("generate_cislo_protokolu", {
    p_zasah_id: zasahId,
  });

  if (cislo) {
    await updateProtokol(supabase, protokol.id, {
      cislo_protokolu: cislo,
    });
  }

  revalidatePath("/protokoly");
  revalidatePath("/kalendar");

  return { ...protokol, cislo_protokolu: cislo || null };
}

// ============================================================
// Pre-fill body z předchozího protokolu
// ============================================================

/**
 * Načte předvyplněné body z předchozího protokolu pro daný zásah.
 * Hledá poslední schválený/odeslaný protokol pro stejný objekt.
 */
export async function getPrefilledBodyAction(zasahId: string) {
  if (!UUID_REGEX.test(zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }

  const { supabase, user } = await requireTechnik();

  // Najdi objekt přes zasah → zakazka → objekt
  const { data: zasah } = await supabase
    .from("zasahy")
    .select(`
      id, technik_id,
      zakazky (
        id,
        objekty (
          id
        )
      )
    `)
    .eq("id", zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }

  const objektId = (zasah.zakazky as Record<string, unknown>)?.objekty as
    | { id: string }
    | null;
  if (!objektId?.id) {
    return [];
  }

  // Najdi poslední dokončený protokol pro tento objekt
  const { data: recentProtokoly } = await getLatestProtokolForObjekt(
    supabase,
    objektId.id,
  );

  if (!recentProtokoly || recentProtokoly.length === 0) {
    return [];
  }

  // Filtruj v aplikačním kódu (PostgREST nefiltruje nested relations)
  const matchingProtokol = recentProtokoly.find((p) => {
    const zasahy = p.zasahy as Record<string, unknown> | null;
    const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
    const objekty = zakazky?.objekty as { id: string } | null;
    return objekty?.id === objektId.id;
  });

  if (!matchingProtokol) {
    return [];
  }

  // Načti body předchozího protokolu
  const { data: prevBody } = await getProtokolDeratBody(
    supabase,
    matchingProtokol.id,
  );

  if (!prevBody || prevBody.length === 0) {
    return [];
  }

  return prefillBodyFromPrevious(prevBody);
}

// ============================================================
// Uložení deratizačních bodů (batch)
// ============================================================

/**
 * Uloží deratizační body protokolu.
 * - Nové body (bez id) → createProtokolDeratBod
 * - Existující body (s id) → updateProtokolDeratBod
 * - Smazané body (_deleted: true) → deleteProtokolDeratBod
 */
export async function saveDeratBodyAction(
  protokolId: string,
  body: DeratBodInput[],
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví + status
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) {
    throw new Error("Protokol nenalezen");
  }
  if (protokol.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto protokolu");
  }
  if (protokol.status !== "rozpracovany") {
    throw new Error("Protokol nelze editovat (status: " + protokol.status + ")");
  }

  // Zpracování bodů
  const errors: string[] = [];

  for (const bod of body) {
    if (bod._deleted && bod.id) {
      // Smazat existující bod
      const { error } = await deleteProtokolDeratBod(supabase, bod.id);
      if (error) errors.push(`Chyba při mazání bodu ${bod.cislo_bodu}: ${error.message}`);
    } else if (bod.id) {
      // Aktualizovat existující bod
      const { error } = await updateProtokolDeratBod(supabase, bod.id, {
        cislo_bodu: bod.cislo_bodu,
        okruh_id: bod.okruh_id,
        typ_stanicky: bod.typ_stanicky,
        pripravek_id: bod.pripravek_id,
        pozer_procent: bod.pozer_procent,
        stav_stanicky: bod.stav_stanicky,
      });
      if (error) errors.push(`Chyba při ukládání bodu ${bod.cislo_bodu}: ${error.message}`);
    } else {
      // Vytvořit nový bod
      const { error } = await createProtokolDeratBod(supabase, {
        protokol_id: protokolId,
        cislo_bodu: bod.cislo_bodu,
        okruh_id: bod.okruh_id,
        typ_stanicky: bod.typ_stanicky,
        pripravek_id: bod.pripravek_id,
        pozer_procent: bod.pozer_procent,
        stav_stanicky: bod.stav_stanicky,
      });
      if (error) errors.push(`Chyba při vytváření bodu ${bod.cislo_bodu}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }

  revalidatePath("/protokoly");
  revalidatePath(`/protokoly/${protokolId}`);
}

// ============================================================
// Uložení poznámky
// ============================================================

/**
 * Uloží poznámku k protokolu.
 */
export async function saveProtokolPoznamkaAction(
  protokolId: string,
  poznamka: string,
) {
  if (!UUID_REGEX.test(protokolId)) {
    throw new Error("Neplatný formát ID protokolu");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví + status
  const { data: protokol } = await getProtokol(supabase, protokolId);
  if (!protokol) {
    throw new Error("Protokol nenalezen");
  }
  if (protokol.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto protokolu");
  }
  if (protokol.status !== "rozpracovany") {
    throw new Error("Protokol nelze editovat");
  }

  const { error } = await updateProtokol(supabase, protokolId, {
    poznamka: poznamka || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/protokoly");
  revalidatePath(`/protokoly/${protokolId}`);
}

// ============================================================
// Data loading pro formulář
// ============================================================

/**
 * Načte aktivní rodenticidy pro výběr v protokolu.
 */
export async function getPripravkyForProtokolAction() {
  const { supabase } = await requireTechnik();

  const { data, error } = await getAktivniPripravky(supabase);
  if (error) throw new Error(error.message);

  // Filtr na rodenticidy
  return (data || []).filter((p) => p.typ === "rodenticid");
}

/**
 * Načte okruhy pro daný objekt.
 */
export async function getOkruhyForObjektAction(objektId: string) {
  if (!UUID_REGEX.test(objektId)) {
    throw new Error("Neplatný formát ID objektu");
  }

  const { supabase } = await requireTechnik();

  const { data, error } = await getOkruhy(supabase, objektId);
  if (error) throw new Error(error.message);
  return data || [];
}
