"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import { setPobockyForTechnik, getPobockyForTechnik } from "@/lib/supabase/queries/technik_pobocky";
import {
  getDostupnostForTechnik,
  createDostupnost,
  softDeleteDostupnost,
} from "@/lib/supabase/queries/dostupnost";
import type { AppRole } from "@/lib/auth";

export async function createUserAction(formData: {
  email: string;
  password: string;
  jmeno: string;
  prijmeni: string;
  telefon: string;
  role: AppRole[];
  pobocka?: string | null;
  pobocky?: string[];
  koeficient_rychlosti?: number;
  pozadovane_hodiny_tyden?: number | null;
  pozadovane_dny_tyden?: number | null;
}) {
  await requireAdmin();

  const adminClient = createAdminClient();
  const { data: newUser, error: authError } =
    await adminClient.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true,
      user_metadata: {
        jmeno: formData.jmeno,
        prijmeni: formData.prijmeni,
      },
    });

  if (authError || !newUser.user) {
    throw new Error(authError?.message || "Nepodařilo se vytvořit uživatele");
  }

  // Profile is auto-created by trigger, update with full data
  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      role: formData.role,
      aktivni_role: formData.role[0],
      jmeno: formData.jmeno,
      prijmeni: formData.prijmeni,
      telefon: formData.telefon || null,
      pobocka: formData.pobocka || null,
      koeficient_rychlosti: formData.koeficient_rychlosti ?? 1.0,
      pozadovane_hodiny_tyden: formData.pozadovane_hodiny_tyden ?? null,
      pozadovane_dny_tyden: formData.pozadovane_dny_tyden ?? null,
    })
    .eq("id", newUser.user.id);

  if (profileError) throw new Error(profileError.message);

  // Sync junction table for multi-region
  if (formData.pobocky && formData.pobocky.length > 0) {
    await setPobockyForTechnik(adminClient, newUser.user.id, formData.pobocky);
  } else if (formData.pobocka) {
    await setPobockyForTechnik(adminClient, newUser.user.id, [formData.pobocka]);
  }

  revalidatePath("/uzivatele");
}

export async function updateUserAction(
  userId: string,
  data: {
    jmeno?: string;
    prijmeni?: string;
    telefon?: string;
    role?: AppRole[];
    pobocka?: string | null;
    pobocky?: string[];
    koeficient_rychlosti?: number;
    pozadovane_hodiny_tyden?: number | null;
    pozadovane_dny_tyden?: number | null;
  },
) {
  const { supabase } = await requireAdmin();

  const updateData: Record<string, unknown> = {};
  if (data.jmeno !== undefined) updateData.jmeno = data.jmeno;
  if (data.prijmeni !== undefined) updateData.prijmeni = data.prijmeni;
  if (data.telefon !== undefined) updateData.telefon = data.telefon;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.pobocka !== undefined) updateData.pobocka = data.pobocka;
  if (data.koeficient_rychlosti !== undefined)
    updateData.koeficient_rychlosti = data.koeficient_rychlosti;
  if (data.pozadovane_hodiny_tyden !== undefined)
    updateData.pozadovane_hodiny_tyden = data.pozadovane_hodiny_tyden;
  if (data.pozadovane_dny_tyden !== undefined)
    updateData.pozadovane_dny_tyden = data.pozadovane_dny_tyden;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) throw new Error(error.message);

  // Sync junction table for multi-region
  if (data.pobocky !== undefined) {
    await setPobockyForTechnik(supabase, userId, data.pobocky);
  }

  revalidatePath("/uzivatele");
}

export async function deleteUserAction(userId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/uzivatele");
}

// ---------------------------------------------------------------
// Dostupnost (shift) management actions
// ---------------------------------------------------------------

export async function getDostupnostForTechnikAction(
  technikId: string,
  datumOd: string,
  datumDo: string,
) {
  const { supabase } = await requireAdmin();
  const { data, error } = await getDostupnostForTechnik(
    supabase,
    technikId,
    datumOd,
    datumDo,
  );
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createDostupnostAction(
  technikId: string,
  datum: string,
  casOd: string,
  casDo: string,
  poznamka?: string,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createDostupnost(supabase, {
    technik_id: technikId,
    datum,
    cas_od: casOd,
    cas_do: casDo,
    poznamka: poznamka || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/uzivatele");
}

export async function deleteDostupnostAction(dostupnostId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await softDeleteDostupnost(supabase, dostupnostId);
  if (error) throw new Error(error.message);
  revalidatePath("/uzivatele");
}

export async function bulkCreateDostupnostAction(
  technikId: string,
  slots: { datum: string; cas_od: string; cas_do: string }[],
) {
  const { supabase } = await requireAdmin();

  for (const slot of slots) {
    const { error } = await createDostupnost(supabase, {
      technik_id: technikId,
      datum: slot.datum,
      cas_od: slot.cas_od,
      cas_do: slot.cas_do,
      poznamka: null,
    });
    // Skip duplicate key errors (slot already exists)
    if (error && !error.message.includes("duplicate key")) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/uzivatele");
}

export async function getPobockyForTechnikAction(technikId: string) {
  const { supabase } = await requireAdmin();
  const { data, error } = await getPobockyForTechnik(supabase, technikId);
  if (error) throw new Error(error.message);
  return (data || []).map((r) => r.pobocka);
}
