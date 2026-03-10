import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSablonyPouceni } from "@/lib/supabase/queries/sablony_pouceni";
import { getSkudci } from "@/lib/supabase/queries/skudci";
import SablonyPouceniList from "./SablonyPouceniList";

export default async function PouceniPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Zjistit roli
  const { data: profile } = await supabase
    .from("profiles")
    .select("aktivni_role")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  const isAdmin =
    profile?.aktivni_role === "admin" ||
    profile?.aktivni_role === "super_admin";

  const { data: sablony } = await getSablonyPouceni(supabase);
  const { data: skudci } = await getSkudci(supabase);

  return (
    <SablonyPouceniList
      sablony={sablony || []}
      skudci={skudci || []}
      isAdmin={isAdmin}
    />
  );
}
