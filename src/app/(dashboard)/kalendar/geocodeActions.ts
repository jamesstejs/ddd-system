"use server";

import { requireTechnik } from "@/lib/auth/requireTechnik";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { geocodeAddress } from "@/lib/geocoding/nominatim";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH_SIZE = 20;

/**
 * Geocoduje objekty bez souřadnic pro zásahy daného technika (dnešní den).
 * Vrací počet geocodovaných objektů.
 * Volitelný — pokud geocoding selže, systém funguje bez něj.
 *
 * Poznámka: Používá admin client pro UPDATE (technik nemá UPDATE RLS na objekty).
 * Auth je ověřen přes requireTechnik().
 */
export async function geocodeMissingObjektyTechnikAction(
  objektIds: string[],
): Promise<number> {
  if (objektIds.length === 0) return 0;
  if (objektIds.length > MAX_BATCH_SIZE) {
    throw new Error(`Příliš mnoho objektů (max ${MAX_BATCH_SIZE})`);
  }
  if (!objektIds.every((id) => UUID_REGEX.test(id))) {
    throw new Error("Neplatný formát objekt ID");
  }

  // Auth check — only authenticated technik can trigger geocoding
  await requireTechnik();

  // Use admin client for read+write (technik has SELECT but not UPDATE on objekty)
  const adminSupabase = createAdminClient();

  // Fetch objects without coordinates
  const { data: objekty } = await adminSupabase
    .from("objekty")
    .select("id, adresa, lat, lng")
    .in("id", objektIds)
    .is("deleted_at", null);

  if (!objekty) return 0;

  const missing = objekty.filter((o) => o.lat == null || o.lng == null);
  let geocoded = 0;

  for (let i = 0; i < missing.length; i++) {
    const obj = missing[i];
    const result = await geocodeAddress(obj.adresa);
    if (result) {
      const { error } = await adminSupabase
        .from("objekty")
        .update({ lat: result.lat, lng: result.lng })
        .eq("id", obj.id);
      if (!error) {
        geocoded++;
      }
    }

    // Rate limit: 1.1s between calls (Nominatim requires 1 req/s)
    if (i < missing.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return geocoded;
}

/**
 * Admin: geocoduje všechny objekty bez souřadnic (max batch).
 * Vrací { geocoded, total } — kolik se povedlo / kolik zbývá.
 */
export async function geocodeMissingObjektyAdminAction(): Promise<{
  geocoded: number;
  total: number;
}> {
  const { supabase } = await requireAdmin();

  // Fetch up to MAX_BATCH_SIZE objects without coordinates
  const { data: objekty, count } = await supabase
    .from("objekty")
    .select("id, adresa", { count: "exact" })
    .is("lat", null)
    .is("deleted_at", null)
    .limit(MAX_BATCH_SIZE);

  if (!objekty || objekty.length === 0) {
    return { geocoded: 0, total: count ?? 0 };
  }

  let geocoded = 0;

  for (let i = 0; i < objekty.length; i++) {
    const obj = objekty[i];
    const result = await geocodeAddress(obj.adresa);
    if (result) {
      const { error } = await supabase
        .from("objekty")
        .update({ lat: result.lat, lng: result.lng })
        .eq("id", obj.id);
      if (!error) {
        geocoded++;
      }
    }

    // Rate limit
    if (i < objekty.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return { geocoded, total: count ?? 0 };
}
