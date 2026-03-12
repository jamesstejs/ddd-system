"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { requireSuperAdmin } from "@/lib/auth/requireSuperAdmin";
import { requireAuth } from "@/lib/auth/requireAuth";
import {
  getBonusyForUser,
  getAllBonusy,
  markBonusyProplaceno,
  createBonus,
  checkFixniBonusExists,
  getNastaveniBonusu,
  getCurrentMonthStart,
} from "@/lib/supabase/queries/bonusy";
import type { AppRole } from "@/lib/auth";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-01$/; // Must be first day of month

/**
 * Načte bonusy pro přihlášeného uživatele.
 */
export async function getBonusyAction(mesic?: string) {
  const { supabase, user } = await requireAuth();
  const m = mesic || getCurrentMonthStart();

  const { data, error } = await getBonusyForUser(supabase, user.id, m, m);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Načte bonusy všech uživatelů za měsíc (admin/super_admin).
 */
export async function getAllBonusyAction(mesic?: string) {
  const { supabase } = await requireAdmin();
  const m = mesic || getCurrentMonthStart();

  const { data, error } = await getAllBonusy(supabase, m);
  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Označí bonusy jako proplacené (super_admin).
 */
export async function markBonusyProplacenoAction(
  bonusIds: string[],
): Promise<{ success: boolean; count: number }> {
  if (!bonusIds.length) return { success: true, count: 0 };
  if (bonusIds.length > 100) throw new Error("Příliš mnoho bonusů najednou");
  if (!bonusIds.every((id) => UUID_REGEX.test(id))) {
    throw new Error("Neplatný formát ID bonusu");
  }

  const { supabase } = await requireSuperAdmin();
  const { error } = await markBonusyProplaceno(supabase, bonusIds);
  if (error) throw new Error(error.message);

  return { success: true, count: bonusIds.length };
}

/**
 * Vygeneruje fixní odměny pro adminy za daný měsíc (super_admin).
 */
export async function createFixniBonusyAction(
  mesic?: string,
): Promise<{ created: number; skipped: number }> {
  const { supabase } = await requireSuperAdmin();
  const m = mesic || getCurrentMonthStart();

  if (!DATE_REGEX.test(m)) {
    throw new Error("Neplatný formát měsíce (očekáváno YYYY-MM-01)");
  }

  // Načíst sazbu
  const nastaveni = await getNastaveniBonusu(supabase);
  if (nastaveni.fixni_odmena_admin <= 0) {
    return { created: 0, skipped: 0 };
  }

  // Načíst všechny adminy
  const { data: admini } = await supabase
    .from("profiles")
    .select("id, jmeno, prijmeni, role")
    .is("deleted_at", null);

  if (!admini) return { created: 0, skipped: 0 };

  const adminProfiles = admini.filter((p) => {
    const roles = p.role as AppRole[];
    return roles.includes("admin") || roles.includes("super_admin");
  });

  let created = 0;
  let skipped = 0;

  for (const admin of adminProfiles) {
    // Deduplikace
    const exists = await checkFixniBonusExists(supabase, admin.id, m);
    if (exists) {
      skipped++;
      continue;
    }

    await createBonus(supabase, {
      uzivatel_id: admin.id,
      typ: "fixni",
      castka: nastaveni.fixni_odmena_admin,
      obdobi_mesic: m,
      poznamka: `Fixní odměna za ${m.substring(0, 7)}`,
    });
    created++;
  }

  return { created, skipped };
}
