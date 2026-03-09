import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getZakazky } from "@/lib/supabase/queries/zakazky";
import { getKlienti } from "@/lib/supabase/queries/klienti";
import { getSkudci } from "@/lib/supabase/queries/skudci";
import { ZakazkyList } from "./ZakazkyList";

export default async function ZakazkyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [zakazkyRes, klientiRes, skudciRes] = await Promise.all([
    getZakazky(supabase),
    getKlienti(supabase),
    getSkudci(supabase),
  ]);

  return (
    <ZakazkyList
      zakazky={zakazkyRes.data || []}
      klienti={klientiRes.data || []}
      skudci={skudciRes.data || []}
    />
  );
}
