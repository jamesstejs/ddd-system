"use server";

import { requireAuth } from "@/lib/auth/requireAuth";
import { getSablonyBodu } from "@/lib/supabase/queries/sablony_bodu";
import {
  vypocetBodu,
  type SablonaBodu,
  type VysledekKalkulacky,
} from "@/lib/kalkulacka/vypocetBodu";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Server action that fetches templates from DB and calculates recommended
 * monitoring point counts for a given object type, area and intervention type.
 */
export async function vypocitejBodyAction(
  typ_objektu: string,
  plocha_m2: number,
  typ_zasahu: string,
): Promise<VysledekKalkulacky | null> {
  const { supabase } = await requireAuth();

  const { data, error } = await getSablonyBodu(supabase);
  if (error) throw new Error(error.message);
  if (!data) return null;

  // Map DB rows to SablonaBodu interface
  const sablony: SablonaBodu[] = data.map((row) => ({
    typ_objektu: row.typ_objektu,
    typ_zasahu: row.typ_zasahu,
    rozsah_m2_od: row.rozsah_m2_od,
    rozsah_m2_do: row.rozsah_m2_do,
    bod_s_mys: row.bod_s_mys,
    bod_l_potkan: row.bod_l_potkan,
    zivolovna: row.zivolovna,
    letajici: row.letajici,
    lezouci: row.lezouci,
    vzorec_nad_max: parseVzorec(row.vzorec_nad_max),
  }));

  return vypocetBodu(sablony, typ_objektu, plocha_m2, typ_zasahu);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVzorec(json: Json | null): SablonaBodu["vzorec_nad_max"] {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json as any;
}
