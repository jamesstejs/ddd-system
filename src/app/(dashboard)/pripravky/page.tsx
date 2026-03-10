import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPripravky } from "@/lib/supabase/queries/pripravky";
import PripravkyList from "./PripravkyList";

export default async function PripravkyPage() {
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

  const { data: pripravky } = await getPripravky(supabase);

  return <PripravkyList pripravky={pripravky || []} isAdmin={isAdmin} />;
}
