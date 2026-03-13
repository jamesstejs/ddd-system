"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { AppRole } from "@/lib/auth";

export async function createUserAction(formData: {
  email: string;
  password: string;
  jmeno: string;
  prijmeni: string;
  telefon: string;
  role: AppRole[];
  pobocka?: string | null;
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
    })
    .eq("id", newUser.user.id);

  if (profileError) throw new Error(profileError.message);

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
  }
) {
  const { supabase } = await requireAdmin();

  const updateData: Record<string, unknown> = {};
  if (data.jmeno !== undefined) updateData.jmeno = data.jmeno;
  if (data.prijmeni !== undefined) updateData.prijmeni = data.prijmeni;
  if (data.telefon !== undefined) updateData.telefon = data.telefon;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.pobocka !== undefined) updateData.pobocka = data.pobocka;

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) throw new Error(error.message);
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
