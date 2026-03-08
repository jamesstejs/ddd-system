import { createClient } from "@/lib/supabase/client";

export type AppRole = "super_admin" | "admin" | "technik" | "klient";

export interface SignInData {
  email: string;
  password: string;
}

export async function signIn({ email, password }: SignInData) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/update`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export function hasRole(
  userRoles: AppRole[] | null | undefined,
  requiredRole: AppRole
): boolean {
  if (!userRoles) return false;
  return userRoles.includes(requiredRole);
}

export function hasAnyRole(
  userRoles: AppRole[] | null | undefined,
  requiredRoles: AppRole[]
): boolean {
  if (!userRoles) return false;
  return requiredRoles.some((role) => userRoles.includes(role));
}
