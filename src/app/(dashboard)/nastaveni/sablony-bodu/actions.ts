"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { revalidatePath } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import {
  createSablonaBodu,
  updateSablonaBodu,
  deleteSablonaBodu,
} from "@/lib/supabase/queries/sablony_bodu";

type SablonaInsert = Database["public"]["Tables"]["sablony_bodu"]["Insert"];
type SablonaUpdate = Database["public"]["Tables"]["sablony_bodu"]["Update"];

export async function createSablonAction(
  data: Omit<SablonaInsert, "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await createSablonaBodu(supabase, data);
  if (error) throw new Error(error.message);
  revalidatePath("/nastaveni/sablony-bodu");
}

export async function updateSablonAction(
  id: string,
  data: Omit<SablonaUpdate, "id" | "created_at" | "updated_at" | "deleted_at">,
) {
  const { supabase } = await requireAdmin();
  const { error } = await updateSablonaBodu(supabase, id, data);
  if (error) throw new Error(error.message);
  revalidatePath("/nastaveni/sablony-bodu");
}

export async function deleteSablonAction(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await deleteSablonaBodu(supabase, id);
  if (error) throw new Error(error.message);
  revalidatePath("/nastaveni/sablony-bodu");
}
