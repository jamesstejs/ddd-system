import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/queries/profiles";
import { getZasahy, getZasahyForTechnik, getTechnici } from "@/lib/supabase/queries/zasahy";
import { getAllDostupnost } from "@/lib/supabase/queries/dostupnost";
import { getZakazky } from "@/lib/supabase/queries/zakazky";
import { getKontaktniOsobyByKlientIds } from "@/lib/supabase/queries/kontaktni_osoby";
import { toDateString } from "@/lib/utils/dateUtils";
import { KalendarView } from "./KalendarView";
import { MujDenView } from "./MujDenView";
import type { ZasahRow, DostupnostRow, TechnikRow, ZakazkaOption } from "./KalendarView";
import type { TechnikZasahRow, KontaktniOsobaRow } from "./MujDenView";

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

  const aktivniRole = profile.aktivni_role;

  // ── Technik "Můj den" ─────────────────────────────
  if (aktivniRole === "technik") {
    const today = toDateString(new Date());

    const { data: zasahy } = await getZasahyForTechnik(
      supabase,
      user.id,
      today,
      today,
    );
    const zasahyData = (zasahy || []) as TechnikZasahRow[];

    // Batch-load kontaktní osoby for all klient IDs in today's zasahy
    const klientIds = [
      ...new Set(
        zasahyData
          .map((z) => z.zakazky?.objekty?.klient_id)
          .filter(Boolean) as string[],
      ),
    ];

    const { data: kontaktyData } =
      klientIds.length > 0
        ? await getKontaktniOsobyByKlientIds(supabase, klientIds)
        : { data: [] as KontaktniOsobaRow[] };

    return (
      <MujDenView
        initialZasahy={zasahyData}
        initialKontakty={(kontaktyData || []) as KontaktniOsobaRow[]}
        initialDate={today}
      />
    );
  }

  // ── Admin/Super_admin — plný kalendář ─────────────
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
