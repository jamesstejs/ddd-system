import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth";
import {
  getBonusyForUser,
  getAllBonusy,
  getBonusySummary,
  getCurrentMonthStart,
} from "@/lib/supabase/queries/bonusy";
import PremieList from "./PremieList";

export default async function PremiePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role, role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile) redirect("/login");

  const role = profile.aktivni_role as AppRole;
  const isSuperAdmin = (profile.role as AppRole[]).includes("super_admin");
  const isAdmin =
    isSuperAdmin || (profile.role as AppRole[]).includes("admin");

  const mesic = getCurrentMonthStart();
  const summary = await getBonusySummary(supabase, user.id, mesic);

  // Vlastní bonusy (technik i admin)
  const { data: mojeBonusy } = await getBonusyForUser(
    supabase,
    user.id,
    mesic,
    mesic,
  );

  // Super_admin/admin: všechny bonusy
  let vsechnyBonusy: Awaited<ReturnType<typeof getAllBonusy>>["data"] = null;
  if (isAdmin) {
    const { data } = await getAllBonusy(supabase, mesic);
    vsechnyBonusy = data;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">
        {isSuperAdmin ? "Přehled bonusů" : isAdmin ? "Moje odměny" : "Moje prémie"}
      </h1>
      <PremieList
        mojeBonusy={mojeBonusy ?? []}
        vsechnyBonusy={vsechnyBonusy ?? []}
        summary={summary}
        mesic={mesic}
        role={role}
        isSuperAdmin={isSuperAdmin}
        isAdmin={isAdmin}
      />
    </div>
  );
}
