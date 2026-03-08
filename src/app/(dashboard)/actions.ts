"use server";

import { createClient } from "@/lib/supabase/server";
import { updateAktivniRole } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function switchRoleAction(newRole: AppRole) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nepřihlášen");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile || !profile.role.includes(newRole)) {
    throw new Error("Nemáte oprávnění pro tuto roli");
  }

  const { error } = await updateAktivniRole(supabase, user.id, newRole);
  if (error) throw new Error("Nepodařilo se přepnout roli");

  revalidatePath("/", "layout");
}
