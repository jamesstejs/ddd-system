import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DostupnostKalendar } from "./DostupnostKalendar";
import { getDostupnostForTechnik } from "@/lib/supabase/queries/dostupnost";
import {
  getAvailableDateRange,
  countWorkDays,
  getDostupnostStatus,
} from "@/lib/utils/dostupnostUtils";

export default async function DostupnostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Rozsah +14 až +60 dní
  const { od, do: doDate } = getAvailableDateRange();
  const datumOd = toDateString(od);
  const datumDo = toDateString(doDate);

  // Načíst existující dostupnost
  const { data: dostupnost } = await getDostupnostForTechnik(
    supabase,
    user.id,
    datumOd,
    datumDo,
  );

  // Statistiky
  const totalWorkDays = countWorkDays(od, doDate);
  const uniqueDays = new Set((dostupnost ?? []).map((d) => d.datum));
  const filledDays = uniqueDays.size;
  const status = getDostupnostStatus(filledDays, totalWorkDays);

  return (
    <DostupnostKalendar
      dostupnost={dostupnost ?? []}
      datumOd={datumOd}
      datumDo={datumDo}
      filledDays={filledDays}
      totalWorkDays={totalWorkDays}
      status={status}
    />
  );
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
