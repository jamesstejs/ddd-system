import { createClient } from "@/lib/supabase/client";

// Re-export AppRole from canonical source
import type { AppRole } from "@/types/roles";
export type { AppRole } from "@/types/roles";

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
