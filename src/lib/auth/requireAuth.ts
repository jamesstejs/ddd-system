import { createClient } from "@/lib/supabase/server";

/**
 * Requires any authenticated user (all roles: admin, super_admin, technik, klient).
 * Use when the action needs no specific role, just authentication.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nepřihlášen");

  return { supabase, user };
}
