import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getKlient } from "@/lib/supabase/queries/klienti";
import { getKontaktniOsoby } from "@/lib/supabase/queries/kontaktni_osoby";
import { getObjekty } from "@/lib/supabase/queries/objekty";
import { KlientDetail } from "./KlientDetail";

export default async function KlientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: klient } = await getKlient(supabase, id);
  if (!klient) notFound();

  const [{ data: kontaktniOsoby }, { data: objekty }] = await Promise.all([
    getKontaktniOsoby(supabase, id),
    getObjekty(supabase, id),
  ]);

  return (
    <KlientDetail
      klient={klient}
      kontaktniOsoby={kontaktniOsoby || []}
      objekty={objekty || []}
    />
  );
}
