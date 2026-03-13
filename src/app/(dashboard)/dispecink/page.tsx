import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";
import { POBOCKY, type Pobocka } from "@/types/pobocky";
import { getTechniciByPobocka, getZasahyForTechniciRange } from "@/lib/supabase/queries/zasahy";
import { getDostupnostForTechniciRange } from "@/lib/supabase/queries/dostupnost";
import { getSkudci } from "@/lib/supabase/queries/skudci";
import { DispecinkView } from "./DispecinkView";
import type { DispecinkData } from "./types";

/** Get Monday of the current week */
function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default async function DispecinkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (
    !profile ||
    !["admin", "super_admin"].some((r) =>
      profile.role.includes(r as AppRole),
    )
  ) {
    redirect("/");
  }

  // Default to first region (Praha)
  const defaultPobocka: Pobocka = "praha";
  const weekStart = getCurrentMonday();
  const weekEnd = new Date(
    new Date(weekStart + "T00:00:00").getTime() + 6 * 86400000,
  )
    .toISOString()
    .split("T")[0];

  // Load initial data
  const { data: technici } = await getTechniciByPobocka(
    supabase,
    defaultPobocka,
  );
  const technikIds = (technici || []).map((t: { id: string }) => t.id);

  const [dostupnostRes, zasahyRes, skudciRes] = await Promise.all([
    getDostupnostForTechniciRange(supabase, technikIds, weekStart, weekEnd),
    getZasahyForTechniciRange(supabase, technikIds, weekStart, weekEnd),
    getSkudci(supabase),
  ]);

  const skudciList = (skudciRes.data || []).map((s) => ({
    id: s.id,
    nazev: s.nazev,
    typ: s.typ,
  }));

  const initialData: DispecinkData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    technici: (technici || []).map((t: any) => ({
      id: t.id,
      jmeno: t.jmeno,
      prijmeni: t.prijmeni,
      email: t.email,
      koeficient_rychlosti: t.koeficient_rychlosti,
      pobocka: t.pobocka,
    })),
    dostupnost: (dostupnostRes.data || []).map((d) => ({
      id: d.id,
      technik_id: d.technik_id,
      datum: d.datum,
      cas_od: d.cas_od,
      cas_do: d.cas_do,
    })),
    zasahy: (zasahyRes.data || []).map((z) => ({
      id: z.id,
      technik_id: z.technik_id,
      datum: z.datum,
      cas_od: z.cas_od,
      cas_do: z.cas_do,
      status: z.status,
      poznamka: z.poznamka,
      zakazky: z.zakazky as DispecinkData["zasahy"][number]["zakazky"],
    })),
    weekStart,
    weekEnd,
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Dispečink</h1>
      <DispecinkView
        initialData={initialData}
        initialPobocka={defaultPobocka}
        initialWeekStart={weekStart}
        skudciList={skudciList}
      />
    </div>
  );
}
