import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSablonyBodu } from "@/lib/supabase/queries/sablony_bodu";
import { SablonyBoduAdmin } from "./SablonyBoduAdmin";

export default async function SablonyBoduPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: sablony } = await getSablonyBodu(supabase);

  return <SablonyBoduAdmin sablony={sablony || []} />;
}
