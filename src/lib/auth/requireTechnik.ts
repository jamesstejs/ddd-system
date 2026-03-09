import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";

/**
 * Requires authenticated user with technik role.
 * Use for technik-specific actions (Můj den, status changes).
 */
export async function requireTechnik() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nepřihlášen");

  const { data: profile } = await getProfile(supabase, user.id);
  if (
    !profile ||
    !profile.role.includes("technik" as AppRole)
  ) {
    throw new Error("Nemáte oprávnění technika");
  }
  return { supabase, user, profile };
}
