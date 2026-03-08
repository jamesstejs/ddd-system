import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getSkudci } from "@/lib/supabase/queries/skudci";
import { SkudciList } from "./SkudciList";

export default async function SkudciPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: skudci } = await getSkudci(supabase);

  return <SkudciList skudci={skudci || []} />;
}
