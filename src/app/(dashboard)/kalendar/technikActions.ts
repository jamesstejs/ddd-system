"use server";

import { requireTechnik } from "@/lib/auth/requireTechnik";
import { revalidatePath } from "next/cache";
import {
  getZasahyForTechnik,
  updateZasah,
} from "@/lib/supabase/queries/zasahy";
import { getKontaktniOsobyByKlientIds } from "@/lib/supabase/queries/kontaktni_osoby";
import { TECHNIK_STATUS_TRANSITIONS } from "@/lib/utils/zasahUtils";
import type { Database } from "@/lib/supabase/database.types";

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
    .select("technik_id, status")
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

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}
