import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getZakazka } from "@/lib/supabase/queries/zakazky";
import { getProfile } from "@/lib/supabase/queries/profiles";
import { getPolozkyForZakazka } from "@/lib/supabase/queries/zakazka_polozky";
import {
  getCenikObecne,
  getCenikPostriky,
  getCenikGely,
  getCenikSpecialni,
  getCenikDeratizace,
  getCenikDezinfekce,
} from "@/lib/supabase/queries/cenik";
import { ZakazkaDetail } from "./ZakazkaDetail";
import type { CenikData } from "@/lib/kalkulacka/vypocetCeny";

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

  const [
    zakazkaRes,
    profileRes,
    polozkyRes,
    obecneRes,
    postrikyRes,
    gelyRes,
    specialniRes,
    deratizaceRes,
    dezinfekceRes,
  ] = await Promise.all([
    getZakazka(supabase, id),
    getProfile(supabase, user.id),
    getPolozkyForZakazka(supabase, id),
    getCenikObecne(supabase),
    getCenikPostriky(supabase),
    getCenikGely(supabase),
    getCenikSpecialni(supabase),
    getCenikDeratizace(supabase),
    getCenikDezinfekce(supabase),
  ]);

  if (zakazkaRes.error || !zakazkaRes.data) {
    redirect("/zakazky");
  }

  const isAdmin = ["admin", "super_admin"].includes(
    profileRes.data?.aktivni_role as string,
  );

  const cenikData: CenikData = {
    obecne: (obecneRes.data || []).map((r) => ({
      nazev: r.nazev,
      hodnota: Number(r.hodnota),
      jednotka: r.jednotka,
    })),
    postriky: (postrikyRes.data || []).map((r) => ({
      kategorie: r.kategorie,
      plocha_od: r.plocha_od,
      plocha_do: r.plocha_do,
      cena: Number(r.cena),
    })),
    gely: (gelyRes.data || []).map((r) => ({
      kategorie: r.kategorie,
      bytu_od: r.bytu_od,
      bytu_do: r.bytu_do,
      cena: Number(r.cena),
    })),
    specialni: (specialniRes.data || []).map((r) => ({
      nazev: r.nazev,
      cena_od: Number(r.cena_od),
      cena_do: r.cena_do ? Number(r.cena_do) : null,
    })),
    deratizace: (deratizaceRes.data || []).map((r) => ({
      nazev: r.nazev,
      cena_za_kus: Number(r.cena_za_kus),
    })),
    dezinfekce: (dezinfekceRes.data || []).map((r) => ({
      typ: r.typ,
      plocha_od: r.plocha_od,
      plocha_do: r.plocha_do,
      cena_za_m: Number(r.cena_za_m),
    })),
  };

  const existujiciPolozky = polozkyRes.data
    ? polozkyRes.data.map((r) => ({
        nazev: r.nazev,
        pocet: Number(r.pocet),
        cena_za_kus: Number(r.cena_za_kus),
        cena_celkem: Number(r.cena_celkem),
      }))
    : null;

  return (
    <ZakazkaDetail
      zakazka={zakazkaRes.data}
      isAdmin={isAdmin}
      cenikData={cenikData}
      existujiciPolozky={existujiciPolozky}
    />
  );
}
