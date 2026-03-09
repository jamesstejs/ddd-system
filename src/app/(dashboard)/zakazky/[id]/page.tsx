import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getZakazka } from "@/lib/supabase/queries/zakazky";
import { getProfile } from "@/lib/supabase/queries/profiles";
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

  const [zakazkaRes, profileRes] = await Promise.all([
    getZakazka(supabase, id),
    getProfile(supabase, user.id),
  ]);

  if (zakazkaRes.error || !zakazkaRes.data) {
    redirect("/zakazky");
  }

  const isAdmin = ["admin", "super_admin"].includes(
    profileRes.data?.aktivni_role as string,
  );

  return <ZakazkaDetail zakazka={zakazkaRes.data} isAdmin={isAdmin} />;
}
