import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFaktury } from "@/lib/supabase/queries/faktury";
import { FakturyList } from "./FakturyList";

export default async function FakturyPage() {
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

  if (
    !profile ||
    (profile.aktivni_role !== "admin" && profile.aktivni_role !== "super_admin")
  ) {
    redirect("/");
  }

  const { data: faktury } = await getFaktury(supabase);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Faktury</h1>
      <FakturyList faktury={faktury || []} />
    </div>
  );
}
