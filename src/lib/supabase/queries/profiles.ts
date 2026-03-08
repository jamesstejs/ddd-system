import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type { AppRole } from "@/lib/auth";

type TypedSupabase = SupabaseClient<Database>;

export async function getProfile(supabase: TypedSupabase, userId: string) {
  return supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .is("deleted_at", null)
    .single();
}

export async function getProfiles(supabase: TypedSupabase) {
  return supabase
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("prijmeni", { ascending: true });
}

export async function updateAktivniRole(
  supabase: TypedSupabase,
  userId: string,
  role: AppRole
) {
  return supabase
    .from("profiles")
    .update({ aktivni_role: role })
    .eq("id", userId);
}

export async function softDeleteProfile(
  supabase: TypedSupabase,
  userId: string
) {
  return supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", userId);
}
