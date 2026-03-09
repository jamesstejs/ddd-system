import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getZakazky } from "@/lib/supabase/queries/zakazky";
import { getKlienti } from "@/lib/supabase/queries/klienti";
import { getSkudci } from "@/lib/supabase/queries/skudci";
import { getProfile } from "@/lib/supabase/queries/profiles";
import type { AppRole } from "@/lib/auth";
import { ZakazkyList } from "./ZakazkyList";

export default async function ZakazkyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [zakazkyRes, klientiRes, skudciRes, profileRes] = await Promise.all([
    getZakazky(supabase),
    getKlienti(supabase),
    getSkudci(supabase),
    getProfile(supabase, user.id),
  ]);

  const isAdmin = ["admin", "super_admin"].includes(
    profileRes.data?.aktivni_role as string,
  );

  return (
    <ZakazkyList
      zakazky={zakazkyRes.data || []}
      klienti={klientiRes.data || []}
      skudci={skudciRes.data || []}
      isAdmin={isAdmin}
    />
  );
}
