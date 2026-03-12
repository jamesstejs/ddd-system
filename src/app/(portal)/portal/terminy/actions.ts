"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { bookSlot, getAvailableSlots } from "@/lib/supabase/queries/portalSlots";
import { toDateString } from "@/lib/utils/dateUtils";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

/**
 * Get available slots for a technik — called from portal UI.
 */
export async function getAvailableSlotsAction(technikId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify user is klient
  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role, klient_id")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile || profile.aktivni_role !== "klient" || !profile.klient_id) {
    throw new Error("Nemáte oprávnění");
  }

  const dnes = toDateString(new Date());
  const zaMesic = toDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const slots = await getAvailableSlots(supabase, technikId, dnes, zaMesic);
  return slots;
}

/**
 * Book a slot — klient selects a time slot for their appointment.
 */
export async function bookSlotAction(input: {
  pripominkaId: string;
  zakazkaId: string;
  technikId: string;
  datum: string;
  casOd: string;
  casDo: string;
}) {
  // Validate
  if (!UUID_REGEX.test(input.pripominkaId)) throw new Error("Neplatný formát ID připomínky");
  if (!UUID_REGEX.test(input.zakazkaId)) throw new Error("Neplatný formát ID zakázky");
  if (!UUID_REGEX.test(input.technikId)) throw new Error("Neplatný formát ID technika");
  if (!DATE_REGEX.test(input.datum)) throw new Error("Neplatný formát data");
  if (!TIME_REGEX.test(input.casOd) || !TIME_REGEX.test(input.casDo)) throw new Error("Neplatný formát času");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify user is klient
  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role, klient_id")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile || profile.aktivni_role !== "klient" || !profile.klient_id) {
    throw new Error("Nemáte oprávnění");
  }

  // Verify the pripominka exists and belongs to klient's zakazka
  const { data: pripominka } = await supabase
    .from("pripominky_terminu")
    .select(`
      id, zakazka_id, technik_id, stav,
      zakazky!pripominky_terminu_zakazka_id_fkey (
        objekty!inner (
          klient_id
        )
      )
    `)
    .eq("id", input.pripominkaId)
    .eq("stav", "aktivni")
    .is("deleted_at", null)
    .single();

  if (!pripominka) {
    throw new Error("Připomínka nenalezena nebo již vyřešena");
  }

  // Verify klient owns this zakazka
  type PripominkaWithZakazky = {
    zakazky: { objekty: { klient_id: string } } | null;
  };
  const pz = pripominka as unknown as PripominkaWithZakazky;
  if (pz.zakazky?.objekty?.klient_id !== profile.klient_id) {
    throw new Error("Nemáte oprávnění k této zakázce");
  }

  // Verify the slot is still available
  const dnes = toDateString(new Date());
  const zaMesic = toDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const availableSlots = await getAvailableSlots(supabase, input.technikId, dnes, zaMesic);

  const slotExists = availableSlots.some(
    (s) => s.datum === input.datum && s.cas_od === input.casOd && s.cas_do === input.casDo,
  );

  if (!slotExists) {
    throw new Error("Vybraný termín již není dostupný. Vyberte prosím jiný.");
  }

  // Book the slot
  const zasah = await bookSlot(supabase, {
    zakazkaId: input.zakazkaId,
    technikId: input.technikId,
    datum: input.datum,
    casOd: input.casOd,
    casDo: input.casDo,
    pripominkaId: input.pripominkaId,
  });

  return { success: true, zasahId: zasah.id };
}
