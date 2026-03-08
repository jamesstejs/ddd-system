import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getKlienti } from "@/lib/supabase/queries/klienti";
import { KlientiList } from "./KlientiList";

export default async function KlientiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: klienti } = await getKlienti(supabase);

  return <KlientiList klienti={klienti || []} />;
}
