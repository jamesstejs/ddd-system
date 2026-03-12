import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nepřihlášen");

  const { data: profile } = await getProfile(supabase, user.id);
  if (
    !profile ||
    !profile.role.includes("super_admin" as AppRole)
  ) {
    throw new Error("Nemáte oprávnění (vyžadován super_admin)");
  }
  return { supabase, user, profile };
}
