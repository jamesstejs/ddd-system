"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { fetchAres } from "@/lib/ares";
import { softDeleteKlient } from "@/lib/supabase/queries/klienti";
import { softDeleteKontaktniOsoba } from "@/lib/supabase/queries/kontaktni_osoby";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";

type KlientInsert = Database["public"]["Tables"]["klienti"]["Insert"];
type KontaktniOsobaInsert = Database["public"]["Tables"]["kontaktni_osoby"]["Insert"];

// --- Klienti CRUD ---

export async function createKlientAction(
  data: Omit<KlientInsert, "id" | "created_at" | "updated_at" | "deleted_at">
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("klienti").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/klienti");
}

export async function updateKlientAction(
  id: string,
  data: Partial<Omit<KlientInsert, "id" | "created_at" | "updated_at" | "deleted_at">>
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("klienti")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/klienti");
  revalidatePath(`/klienti/${id}`);
}

export async function deleteKlientAction(id: string) {
  const { supabase } = await requireAdmin();

  const { error } = await softDeleteKlient(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath("/klienti");
}

// --- ARES ---

export async function fetchAresAction(ico: string) {
  await requireAdmin();
  const data = await fetchAres(ico);
  if (!data) throw new Error("Subjekt nebyl nalezen v ARES");
  return data;
}

export async function checkDuplicateIcoAction(ico: string) {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("klienti")
    .select("id, nazev")
    .eq("ico", ico)
    .is("deleted_at", null)
    .limit(1);

  return data && data.length > 0 ? data[0] : null;
}

// --- Kontaktní osoby CRUD ---

export async function createKontaktniOsobaAction(
  data: Omit<KontaktniOsobaInsert, "id" | "created_at" | "updated_at" | "deleted_at">
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase.from("kontaktni_osoby").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath(`/klienti/${data.klient_id}`);
}

export async function updateKontaktniOsobaAction(
  id: string,
  klientId: string,
  data: Partial<Omit<KontaktniOsobaInsert, "id" | "klient_id" | "created_at" | "updated_at" | "deleted_at">>
) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("kontaktni_osoby")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/klienti/${klientId}`);
}

export async function deleteKontaktniOsobaAction(id: string, klientId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await softDeleteKontaktniOsoba(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath(`/klienti/${klientId}`);
}
