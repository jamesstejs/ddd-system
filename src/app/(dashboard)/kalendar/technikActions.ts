"use server";

import { requireTechnik } from "@/lib/auth/requireTechnik";
import { revalidatePath } from "next/cache";
import {
  getZasahyForTechnik,
  createZasah,
  updateZasah,
} from "@/lib/supabase/queries/zasahy";
import { getKontaktniOsobyByKlientIds } from "@/lib/supabase/queries/kontaktni_osoby";
import { createPripominka } from "@/lib/supabase/queries/pripominky";
import { TECHNIK_STATUS_TRANSITIONS } from "@/lib/utils/zasahUtils";
import type { Database } from "@/lib/supabase/database.types";
import { sendZasahPredEmail } from "@/lib/email/sendZasahPredEmail";
import {
  createBonusZaZakazku,
  createBonusZaOpakovanou,
} from "@/lib/supabase/queries/bonusy";

const REVALIDATE_PATH = "/kalendar";
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_KLIENT_IDS = 100;

/**
 * Načte zásahy přihlášeného technika pro daný den.
 */
export async function getMojeZasahyAction(datum: string) {
  if (!DATE_REGEX.test(datum)) {
    throw new Error("Neplatný formát data (očekáváno YYYY-MM-DD)");
  }

  const { supabase, user } = await requireTechnik();

  const { data, error } = await getZasahyForTechnik(
    supabase,
    user.id,
    datum,
    datum,
  );
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Načte kontaktní osoby pro dané klient IDs.
 */
export async function getKontaktniOsobyAction(klientIds: string[]) {
  if (klientIds.length === 0) return [];
  if (klientIds.length > MAX_KLIENT_IDS) {
    throw new Error(`Příliš mnoho klient IDs (max ${MAX_KLIENT_IDS})`);
  }
  if (!klientIds.every((id) => UUID_REGEX.test(id))) {
    throw new Error("Neplatný formát klient ID");
  }

  const { supabase } = await requireTechnik();

  const { data, error } = await getKontaktniOsobyByKlientIds(
    supabase,
    klientIds,
  );
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Změní status zásahu (technik může: naplánováno/potvrzený → probíhá → hotovo).
 * Ověřuje vlastnictví a validitu přechodu.
 */
export async function updateZasahStatusTechnikAction(
  id: string,
  newStatus: Database["public"]["Enums"]["status_zasahu"],
) {
  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví: načíst zásah, zkontrolovat technik_id === user.id
  const { data: zasah } = await supabase
    .from("zasahy")
    .select("technik_id, status, zakazka_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }

  // Validace přechodu statusu
  const allowed = TECHNIK_STATUS_TRANSITIONS[zasah.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Nelze změnit status z "${zasah.status}" na "${newStatus}"`,
    );
  }

  const { error } = await updateZasah(supabase, id, { status: newStatus });
  if (error) throw new Error(error.message);

  // Sprint 30: Auto-bonus za dokončenou zakázku (fire-and-forget)
  if (newStatus === "hotovo" && zasah.zakazka_id) {
    createBonusZaZakazku(supabase, user.id, zasah.zakazka_id, id).catch(
      () => {},
    );
  }

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}

const TIME_REGEX = /^\d{2}:\d{2}$/;

/**
 * Technik naplánuje další termín (follow-up zásah) po dokončení.
 * Vytvoří nový zásah se statusem "potvrzeny" pro stejnou zakázku.
 */
export async function createDalsiTerminAction(input: {
  zasahId: string;
  zakazkaId: string;
  datum: string;
  casOd: string;
  casDo: string;
}) {
  // Validace vstupů
  if (!UUID_REGEX.test(input.zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }
  if (!UUID_REGEX.test(input.zakazkaId)) {
    throw new Error("Neplatný formát ID zakázky");
  }
  if (!DATE_REGEX.test(input.datum)) {
    throw new Error("Neplatný formát data (očekáváno YYYY-MM-DD)");
  }
  if (!TIME_REGEX.test(input.casOd) || !TIME_REGEX.test(input.casDo)) {
    throw new Error("Neplatný formát času (očekáváno HH:MM)");
  }
  if (input.casOd >= input.casDo) {
    throw new Error("Čas od musí být menší než čas do");
  }

  // Datum musí být v budoucnosti (>= zítra)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = input.datum.split("-").map(Number);
  const targetDate = new Date(y, m - 1, d);
  if (targetDate <= today) {
    throw new Error("Datum dalšího termínu musí být v budoucnosti");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví původního zásahu a že je hotovo
  const { data: zasah } = await supabase
    .from("zasahy")
    .select("technik_id, status, zakazka_id")
    .eq("id", input.zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }
  if (zasah.status !== "hotovo") {
    throw new Error("Další termín lze nastavit pouze po dokončení zásahu");
  }
  if (zasah.zakazka_id !== input.zakazkaId) {
    throw new Error("Nesouhlasí zakázka");
  }

  // Vytvořit nový zásah (follow-up)
  const { data: novyZasah, error } = await createZasah(supabase, {
    zakazka_id: input.zakazkaId,
    technik_id: user.id,
    datum: input.datum,
    cas_od: input.casOd,
    cas_do: input.casDo,
    status: "potvrzeny",
    poznamka: null,
    odhadovana_delka_min: null,
  });

  if (error) throw new Error(error.message);

  // Sprint 25: Odeslat BL + poučení klientovi (fire-and-forget)
  if (novyZasah?.id) {
    sendZasahPredEmail(supabase, novyZasah.id).catch(() => {
      // Email failure should not block zasah creation
    });

    // Sprint 30: Auto-bonus za domluvenou opakovanou zakázku (fire-and-forget)
    createBonusZaOpakovanou(
      supabase,
      user.id,
      input.zakazkaId,
      novyZasah.id,
    ).catch(() => {});
  }

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
  return novyZasah;
}

/**
 * Technik přeskočí nastavení dalšího termínu → vytvoří se připomínka pro admina.
 */
export async function skipDalsiTerminAction(input: {
  zasahId: string;
  zakazkaId: string;
}) {
  // Validace vstupů
  if (!UUID_REGEX.test(input.zasahId)) {
    throw new Error("Neplatný formát ID zásahu");
  }
  if (!UUID_REGEX.test(input.zakazkaId)) {
    throw new Error("Neplatný formát ID zakázky");
  }

  const { supabase, user } = await requireTechnik();

  // Ověření vlastnictví původního zásahu a že je hotovo
  const { data: zasah } = await supabase
    .from("zasahy")
    .select("technik_id, status, zakazka_id")
    .eq("id", input.zasahId)
    .is("deleted_at", null)
    .single();

  if (!zasah || zasah.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění k tomuto zásahu");
  }
  if (zasah.status !== "hotovo") {
    throw new Error("Přeskočení lze provést pouze po dokončení zásahu");
  }
  if (zasah.zakazka_id !== input.zakazkaId) {
    throw new Error("Nesouhlasí zakázka");
  }

  // Vytvořit připomínku
  const { error } = await createPripominka(supabase, {
    zakazka_id: input.zakazkaId,
    zasah_id: input.zasahId,
    technik_id: user.id,
    typ: "technik_nenastavil",
    stav: "aktivni",
  });

  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}
