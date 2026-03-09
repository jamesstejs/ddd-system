import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/queries/profiles";
import { getZasahy, getTechnici } from "@/lib/supabase/queries/zasahy";
import { getAllDostupnost } from "@/lib/supabase/queries/dostupnost";
import { getZakazky } from "@/lib/supabase/queries/zakazky";
import { toDateString } from "@/lib/utils/dateUtils";
import { KalendarView } from "./KalendarView";
import type { ZasahRow, DostupnostRow, TechnikRow, ZakazkaOption } from "./KalendarView";

export default async function KalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check role
  const { data: profile } = await getProfile(supabase, user.id);
  if (
    !profile ||
    !["admin", "super_admin", "technik"].some((r) =>
      profile.role.includes(r as "admin" | "super_admin" | "technik"),
    )
  ) {
    redirect("/");
  }

  // Date range: current month ± buffer for navigation
  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  rangeEnd.setDate(rangeEnd.getDate() + 14);

  const datumOd = toDateString(rangeStart);
  const datumDo = toDateString(rangeEnd);

  // Fetch data in parallel
  const [zasahyResult, dostupnostResult, techniciResult, zakazkyAktivni, zakazkyNove] =
    await Promise.all([
      getZasahy(supabase, datumOd, datumDo),
      getAllDostupnost(supabase, datumOd, datumDo),
      getTechnici(supabase),
      getZakazky(supabase, { status: "aktivni" }),
      getZakazky(supabase, { status: "nova" }),
    ]);

  const zasahy = zasahyResult.data || [];
  const dostupnost = dostupnostResult.data || [];
  const technici = techniciResult.data || [];
  const zakazky = [...(zakazkyAktivni.data || []), ...(zakazkyNove.data || [])];

  return (
    <KalendarView
      initialZasahy={zasahy as ZasahRow[]}
      initialDostupnost={dostupnost as DostupnostRow[]}
      technici={technici as TechnikRow[]}
      zakazky={zakazky as ZakazkaOption[]}
      initialDate={toDateString(today)}
    />
  );
}
