"use server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import {
  getDostupnostForTechnik,
  createDostupnost,
  updateDostupnost,
  softDeleteDostupnost,
  getTechniciWithoutDostupnost,
  countDaysWithDostupnost,
} from "@/lib/supabase/queries/dostupnost";
import {
  getAvailableDateRange,
  countWorkDays,
  getDostupnostStatus,
} from "@/lib/utils/dostupnostUtils";

const REVALIDATE_PATH = "/dostupnost";

/**
 * Vrátí dostupnost aktuálního technika v rozsahu +14 až +60 dní.
 */
export async function getDostupnostAction() {
  const { supabase, user } = await requireAuth();

  const { od, do: doDate } = getAvailableDateRange();
  const datumOd = toDateString(od);
  const datumDo = toDateString(doDate);

  const { data, error } = await getDostupnostForTechnik(
    supabase,
    user.id,
    datumOd,
    datumDo,
  );

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Uloží nový slot dostupnosti. Kontroluje rozsah 14-60 dní a roli technika.
 */
export async function saveDostupnostAction(input: {
  datum: string;
  cas_od: string;
  cas_do: string;
  poznamka?: string;
}) {
  const { supabase, user } = await requireAuth();

  // Ověřit že je technik
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile || !profile.role.includes("technik")) {
    throw new Error("Nemáte oprávnění technika");
  }

  // Ověřit rozsah datumu
  const { od, do: doDate } = getAvailableDateRange();
  const datumDate = new Date(input.datum + "T00:00:00");
  if (datumDate < od || datumDate > doDate) {
    throw new Error("Datum musí být v rozsahu 14–60 dní od dnes");
  }

  // Ověřit časy
  if (input.cas_od >= input.cas_do) {
    throw new Error("Čas od musí být menší než čas do");
  }

  const { data, error } = await createDostupnost(supabase, {
    technik_id: user.id,
    datum: input.datum,
    cas_od: input.cas_od,
    cas_do: input.cas_do,
    poznamka: input.poznamka || null,
  });

  if (error) {
    if (error.message.includes("idx_dostupnost_unique_slot")) {
      throw new Error("Pro tento den a čas již existuje záznam");
    }
    throw new Error(error.message);
  }

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
  return data;
}

/**
 * Aktualizuje existující slot dostupnosti.
 */
export async function updateDostupnostAction(
  id: string,
  input: {
    cas_od?: string;
    cas_do?: string;
    poznamka?: string | null;
  },
) {
  const { supabase, user } = await requireAuth();

  // Ověřit vlastnictví + načíst aktuální časy pro validaci
  const { data: existing } = await supabase
    .from("dostupnost")
    .select("technik_id, cas_od, cas_do")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!existing || existing.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění editovat tento záznam");
  }

  // Validace časů — pokud přijde jen jeden, doplnit z DB
  const effectiveCasOd = input.cas_od ?? existing.cas_od;
  const effectiveCasDo = input.cas_do ?? existing.cas_do;

  if (effectiveCasOd && effectiveCasDo && effectiveCasOd >= effectiveCasDo) {
    throw new Error("Čas od musí být menší než čas do");
  }

  const { error } = await updateDostupnost(supabase, id, input);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}

/**
 * Soft-delete záznamu dostupnosti.
 */
export async function deleteDostupnostAction(id: string) {
  const { supabase, user } = await requireAuth();

  // Ověřit vlastnictví
  const { data: existing } = await supabase
    .from("dostupnost")
    .select("technik_id")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!existing || existing.technik_id !== user.id) {
    throw new Error("Nemáte oprávnění smazat tento záznam");
  }

  const { error } = await softDeleteDostupnost(supabase, id);
  if (error) throw new Error(error.message);

  revalidatePath(REVALIDATE_PATH);
  revalidatePath("/");
}

/**
 * Pro admin widget: techniky bez dostupnosti na následujících 14 dní.
 */
export async function getTechniciBezSmenAction() {
  const { supabase } = await requireAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const za14 = new Date(today);
  za14.setDate(za14.getDate() + 14);

  const datumOd = toDateString(today);
  const datumDo = toDateString(za14);

  const { data, error } = await getTechniciWithoutDostupnost(
    supabase,
    datumOd,
    datumDo,
  );

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Pro technik widget: statistiky dostupnosti.
 */
export async function getDostupnostStatsAction() {
  const { supabase, user } = await requireAuth();

  const { od, do: doDate } = getAvailableDateRange();
  const datumOd = toDateString(od);
  const datumDo = toDateString(doDate);

  const filledDays = await countDaysWithDostupnost(
    supabase,
    user.id,
    datumOd,
    datumDo,
  );

  const totalWorkDays = countWorkDays(od, doDate);
  const status = getDostupnostStatus(filledDays, totalWorkDays);

  return { filledDays, totalWorkDays, status };
}

/** Helper: Date → "YYYY-MM-DD" */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
