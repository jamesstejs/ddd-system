import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getZakazka } from "@/lib/supabase/queries/zakazky";
import { ZakazkaDetail } from "./ZakazkaDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ZakazkaDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: zakazka, error } = await getZakazka(supabase, id);

  if (error || !zakazka) {
    redirect("/zakazky");
  }

  return <ZakazkaDetail zakazka={zakazka} />;
}
