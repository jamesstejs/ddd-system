/**
 * Portal slot queries — used by klient portal for viewing available time slots
 * and booking appointments.
 * Sprint 33: Klientský portál: výběr termínu
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type TypedSupabase = SupabaseClient<Database>;

/**
 * Get active zakazky for a klient (via klient_id → objekty → zakazky).
 * Returns only smluvni (contract) zakazky that are still active and have
 * a pripominka_terminu with stav=aktivni (meaning next appointment needs scheduling).
 */
export async function getZakazkyNeedingTermin(
  supabase: TypedSupabase,
  klientId: string,
) {
  return supabase
    .from("pripominky_terminu")
    .select(
      `
      id,
      zakazka_id,
      zasah_id,
      technik_id,
      stav,
      created_at,
      zakazky!pripominky_terminu_zakazka_id_fkey (
        id,
        typ,
        typy_zasahu,
        cetnost_dny,
        objekty!inner (
          id,
          nazev,
          adresa,
          klient_id,
          klienti!inner (
            id
          )
        )
      ),
      profiles!pripominky_terminu_technik_id_fkey (
        id,
        jmeno,
        prijmeni
      )
    `,
    )
    .eq("stav", "aktivni")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/**
 * Get available time slots for a technik in a date range.
 * A "slot" is a dostupnost record minus any existing zasahy overlapping it.
 */
export async function getAvailableSlots(
  supabase: TypedSupabase,
  technikId: string,
  datumOd: string,
  datumDo: string,
) {
  // Get technik's dostupnost
  const { data: dostupnost } = await supabase
    .from("dostupnost")
    .select("id, datum, cas_od, cas_do")
    .eq("technik_id", technikId)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .is("deleted_at", null)
    .order("datum", { ascending: true })
    .order("cas_od", { ascending: true });

  if (!dostupnost || dostupnost.length === 0) return [];

  // Get existing zasahy for this technik in the same range
  const { data: existingZasahy } = await supabase
    .from("zasahy")
    .select("datum, cas_od, cas_do")
    .eq("technik_id", technikId)
    .gte("datum", datumOd)
    .lte("datum", datumDo)
    .not("status", "eq", "zruseno")
    .is("deleted_at", null);

  const zasahyByDate = new Map<string, { cas_od: string; cas_do: string }[]>();
  for (const z of existingZasahy ?? []) {
    const existing = zasahyByDate.get(z.datum) ?? [];
    existing.push({ cas_od: z.cas_od, cas_do: z.cas_do });
    zasahyByDate.set(z.datum, existing);
  }

  // Generate 1-hour slots from dostupnost, excluding times with existing zasahy
  const slots: { datum: string; cas_od: string; cas_do: string }[] = [];

  for (const d of dostupnost) {
    const dayZasahy = zasahyByDate.get(d.datum) ?? [];
    // Generate 1-hour slots within this dostupnost window
    const startHour = parseInt(d.cas_od.substring(0, 2));
    const startMin = parseInt(d.cas_od.substring(3, 5));
    const endHour = parseInt(d.cas_do.substring(0, 2));
    const endMin = parseInt(d.cas_do.substring(3, 5));

    let currentH = startHour;
    let currentM = startMin;

    while (currentH < endHour || (currentH === endHour && currentM + 60 <= endMin + endHour * 60 - currentH * 60)) {
      const slotStart = `${String(currentH).padStart(2, "0")}:${String(currentM).padStart(2, "0")}`;
      const nextH = currentM + 60 >= 60 ? currentH + 1 : currentH;
      const nextM = (currentM + 60) % 60;

      // Don't exceed the end time
      if (nextH > endHour || (nextH === endHour && nextM > endMin)) break;

      const slotEnd = `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;

      // Check for overlap with existing zasahy
      const hasConflict = dayZasahy.some((z) => {
        const zStart = z.cas_od.substring(0, 5);
        const zEnd = z.cas_do.substring(0, 5);
        return slotStart < zEnd && slotEnd > zStart;
      });

      if (!hasConflict) {
        slots.push({ datum: d.datum, cas_od: slotStart, cas_do: slotEnd });
      }

      currentH = nextH;
      currentM = nextM;
    }
  }

  return slots;
}

/**
 * Book a slot — creates a new zasah with status "potvrzeny".
 * Updates the pripominka to "vyreseno".
 */
export async function bookSlot(
  supabase: TypedSupabase,
  input: {
    zakazkaId: string;
    technikId: string;
    datum: string;
    casOd: string;
    casDo: string;
    pripominkaId: string;
  },
) {
  // Create zasah
  const { data: zasah, error: zasahError } = await supabase
    .from("zasahy")
    .insert({
      zakazka_id: input.zakazkaId,
      technik_id: input.technikId,
      datum: input.datum,
      cas_od: input.casOd,
      cas_do: input.casDo,
      status: "potvrzeny" as Database["public"]["Enums"]["status_zasahu"],
      poznamka: "Termín vybrán klientem přes portál",
    })
    .select()
    .single();

  if (zasahError) throw zasahError;

  // Mark pripominka as resolved
  await supabase
    .from("pripominky_terminu")
    .update({ stav: "vyreseno" as Database["public"]["Enums"]["stav_pripominky"] })
    .eq("id", input.pripominkaId)
    .is("deleted_at", null);

  return zasah;
}
