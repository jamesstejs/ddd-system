"use server";

import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import {
  getNastaveniBonusu,
  updateNastaveniBonusu,
} from "@/lib/supabase/queries/bonusy";
import type { NastaveniBonusu } from "@/lib/supabase/queries/bonusy";

const VALID_KEYS = [
  "bonus_za_zakazku",
  "bonus_za_opakovanou",
  "fixni_odmena_admin",
];

/**
 * Načte aktuální nastavení bonusů.
 */
export async function getNastaveniBonusuAction(): Promise<NastaveniBonusu> {
  const { supabase } = await requireSuperAdmin();
  return getNastaveniBonusu(supabase);
}

/**
 * Aktualizuje jednu sazbu bonusu.
 */
export async function updateBonusNastaveniAction(
  klic: string,
  hodnota: number,
): Promise<{ success: boolean }> {
  if (!VALID_KEYS.includes(klic)) {
    throw new Error(`Neplatný klíč nastavení: ${klic}`);
  }
  if (hodnota < 0 || hodnota > 100000) {
    throw new Error("Hodnota musí být mezi 0 a 100 000 Kč");
  }

  const { supabase } = await requireSuperAdmin();
  const { error } = await updateNastaveniBonusu(supabase, klic, hodnota);
  if (error) throw new Error(error.message);

  return { success: true };
}

/**
 * Batch update všech sazeb najednou.
 */
export async function updateAllBonusNastaveniAction(
  data: Partial<NastaveniBonusu>,
): Promise<{ success: boolean }> {
  const { supabase } = await requireSuperAdmin();

  for (const [klic, hodnota] of Object.entries(data)) {
    if (!VALID_KEYS.includes(klic)) continue;
    if (typeof hodnota !== "number" || hodnota < 0 || hodnota > 100000) {
      throw new Error(`Neplatná hodnota pro ${klic}: ${hodnota}`);
    }
    const { error } = await updateNastaveniBonusu(supabase, klic, hodnota);
    if (error) throw new Error(error.message);
  }

  return { success: true };
}
