import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getCenikObecne,
  getCenikPostriky,
  getCenikGely,
  getCenikSpecialni,
  getCenikDeratizace,
  getCenikDezinfekce,
} from "@/lib/supabase/queries/cenik";
import { CenikAdmin } from "./CenikAdmin";

export default async function CenikPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch all 6 tables in parallel
  const [obecne, postriky, gely, specialni, deratizace, dezinfekce] =
    await Promise.all([
      getCenikObecne(supabase),
      getCenikPostriky(supabase),
      getCenikGely(supabase),
      getCenikSpecialni(supabase),
      getCenikDeratizace(supabase),
      getCenikDezinfekce(supabase),
    ]);

  return (
    <CenikAdmin
      obecne={obecne.data || []}
      postriky={postriky.data || []}
      gely={gely.data || []}
      specialni={specialni.data || []}
      deratizace={deratizace.data || []}
      dezinfekce={dezinfekce.data || []}
    />
  );
}
