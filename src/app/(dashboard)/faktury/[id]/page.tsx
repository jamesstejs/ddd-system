import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getFaktura } from "@/lib/supabase/queries/faktury";
import { getPolozkyForZakazka } from "@/lib/supabase/queries/zakazka_polozky";
import { FakturaDetail } from "./FakturaDetail";

export default async function FakturaPage({
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

  const { data: faktura } = await getFaktura(supabase, id);
  if (!faktura) notFound();

  // Load polozky for the zakazka
  const zakazkaId = (faktura.zakazky as Record<string, unknown> | null)?.id as string | undefined;
  let polozky: Array<{
    id: string;
    nazev: string;
    pocet: number;
    cena_za_kus: number;
    cena_celkem: number;
    poradi: number;
  }> = [];

  if (zakazkaId) {
    const { data } = await getPolozkyForZakazka(supabase, zakazkaId);
    if (data) polozky = data;
  }

  return <FakturaDetail faktura={faktura} polozky={polozky} />;
}
