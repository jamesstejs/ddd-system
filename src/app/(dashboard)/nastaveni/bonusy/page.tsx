import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getNastaveniBonusu } from "@/lib/supabase/queries/bonusy";
import { BonusyNastaveni } from "./BonusyNastaveni";

export default async function BonusyNastaveniPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ověření super_admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile || profile.aktivni_role !== "super_admin") {
    redirect("/");
  }

  const nastaveni = await getNastaveniBonusu(supabase);

  return <BonusyNastaveni nastaveni={nastaveni} />;
}
