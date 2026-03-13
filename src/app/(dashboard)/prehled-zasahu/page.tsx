import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";
import { getPrehledDataAction } from "./actions";
import { PrehledZasahuView } from "./PrehledZasahuView";

export default async function PrehledZasahuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (
    !profile ||
    !["admin", "super_admin"].some((r) =>
      profile.role.includes(r as AppRole),
    )
  ) {
    redirect("/");
  }

  const initialData = await getPrehledDataAction();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-bold">Přehled zásahů</h1>
      <PrehledZasahuView initialData={initialData} />
    </div>
  );
}
