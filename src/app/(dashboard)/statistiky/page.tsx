import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth";
import { toDateString } from "@/lib/utils/dateUtils";
import {
  getZasahyCountByTechnik,
  getFakturyByMonth,
} from "@/lib/supabase/queries/statistiky";
import StatistikyCharts from "./StatistikyCharts";
import ExportSection from "./ExportSection";

export default async function StatistikyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  const role = (profile?.aktivni_role || "technik") as AppRole;

  // Only admin/super_admin can see full stats
  if (role !== "admin" && role !== "super_admin") {
    redirect("/");
  }

  // Date ranges: last 6 months
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const datumOd = toDateString(sixMonthsAgo);
  const datumDo = toDateString(now);

  // Fetch data
  const { data: zasahyData } = await getZasahyCountByTechnik(supabase, datumOd, datumDo);
  const { data: fakturyData } = await getFakturyByMonth(supabase, datumOd, datumDo);

  // Process zasahy into monthly per-technik counts
  type ZasahRow = {
    id: string;
    datum: string;
    technik_id: string;
    profiles: { jmeno: string; prijmeni: string } | null;
  };

  const technikMap = new Map<string, string>();
  const monthlyZasahy = new Map<string, Map<string, number>>();

  for (const z of (zasahyData ?? []) as unknown as ZasahRow[]) {
    const monthKey = z.datum.substring(0, 7); // YYYY-MM
    const technikName = z.profiles
      ? `${z.profiles.jmeno} ${z.profiles.prijmeni}`
      : z.technik_id.substring(0, 8);
    technikMap.set(z.technik_id, technikName);

    if (!monthlyZasahy.has(monthKey)) monthlyZasahy.set(monthKey, new Map());
    const month = monthlyZasahy.get(monthKey)!;
    month.set(z.technik_id, (month.get(z.technik_id) ?? 0) + 1);
  }

  // Build chart data for zasahy
  const technikIds = [...technikMap.keys()];
  const zasahyChartData = [...monthlyZasahy.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => {
      const entry: Record<string, string | number> = {
        mesic: formatMonth(month),
      };
      for (const tid of technikIds) {
        entry[technikMap.get(tid) ?? tid] = counts.get(tid) ?? 0;
      }
      return entry;
    });

  const technikNames = [...technikMap.values()];

  // Process faktury into monthly revenue
  type FakturaRow = {
    castka_bez_dph: number | null;
    castka_s_dph: number | null;
    datum_vystaveni: string;
    stav: string;
  };

  const monthlyRevenue = new Map<string, { bezDph: number; sDph: number }>();
  for (const f of (fakturyData ?? []) as unknown as FakturaRow[]) {
    const monthKey = f.datum_vystaveni.substring(0, 7);
    const existing = monthlyRevenue.get(monthKey) ?? { bezDph: 0, sDph: 0 };
    existing.bezDph += f.castka_bez_dph ?? 0;
    existing.sDph += f.castka_s_dph ?? 0;
    monthlyRevenue.set(monthKey, existing);
  }

  const revenueChartData = [...monthlyRevenue.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, sums]) => ({
      mesic: formatMonth(month),
      bezDph: Math.round(sums.bezDph),
      sDph: Math.round(sums.sDph),
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">Statistiky</h1>

      <StatistikyCharts
        zasahyChartData={zasahyChartData}
        technikNames={technikNames}
        revenueChartData={revenueChartData}
      />

      {role === "super_admin" && <ExportSection />}
    </div>
  );
}

function formatMonth(yyyymm: string): string {
  const [year, month] = yyyymm.split("-").map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("cs-CZ", { month: "short", year: "2-digit" });
}
