import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries/profiles";
import {
  getProtokol,
  getProtokolDeratBody,
} from "@/lib/supabase/queries/protokoly";
import { getOkruhy } from "@/lib/supabase/queries/okruhy";
import { getAktivniPripravky } from "@/lib/supabase/queries/pripravky";
import { notFound, redirect } from "next/navigation";
import { DeratFormView } from "./DeratFormView";
import type { AppRole } from "@/lib/auth";

export default async function ProtokolDetailPage({
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

  // Ověření role technik
  const { data: profile } = await getProfile(supabase, user.id);
  if (
    !profile ||
    !Array.isArray(profile.role) ||
    !profile.role.includes("technik" as AppRole)
  ) {
    redirect("/kalendar");
  }

  // Načtení protokolu
  const { data: protokol, error } = await getProtokol(supabase, id);
  if (error || !protokol) {
    notFound();
  }

  // Ověření vlastnictví
  if (protokol.technik_id !== user.id) {
    redirect("/kalendar");
  }

  // Načtení deratizačních bodů
  const { data: body } = await getProtokolDeratBody(supabase, id);

  // Načtení okruhů pro objekt
  const zasahy = protokol.zasahy as Record<string, unknown> | null;
  const zakazky = zasahy?.zakazky as Record<string, unknown> | null;
  const objekty = zakazky?.objekty as { id: string } | null;
  const objektId = objekty?.id;

  let okruhy: { id: string; nazev: string }[] = [];
  if (objektId) {
    const { data: okruhyData } = await getOkruhy(supabase, objektId);
    okruhy = (okruhyData || []).map((o) => ({ id: o.id, nazev: o.nazev }));
  }

  // Načtení rodenticidů
  const { data: allPripravky } = await getAktivniPripravky(supabase);
  const pripravky = (allPripravky || [])
    .filter((p) => p.typ === "rodenticid")
    .map((p) => ({
      id: p.id,
      nazev: p.nazev,
      ucinna_latka: p.ucinna_latka,
      protilatka: p.protilatka,
    }));

  // Klient info
  const klienti = objekty
    ? ((zakazky?.objekty as Record<string, unknown>)?.klienti as {
        nazev: string;
        jmeno: string;
        prijmeni: string;
      } | null)
    : null;
  const klientName = klienti
    ? klienti.nazev || `${klienti.prijmeni} ${klienti.jmeno}`.trim()
    : "—";
  const objektNazev = (objekty as Record<string, unknown>)?.nazev as string || "";

  return (
    <div className="mx-auto max-w-lg pb-24">
      <DeratFormView
        protokol={{
          id: protokol.id,
          cislo_protokolu: protokol.cislo_protokolu,
          status: protokol.status,
          poznamka: protokol.poznamka,
          zasah_id: protokol.zasah_id,
        }}
        initialBody={(body || []).map((b) => ({
          id: b.id,
          cislo_bodu: b.cislo_bodu,
          okruh_id: b.okruh_id,
          typ_stanicky: b.typ_stanicky,
          pripravek_id: b.pripravek_id,
          pozer_procent: b.pozer_procent,
          stav_stanicky: b.stav_stanicky,
        }))}
        okruhy={okruhy}
        pripravky={pripravky}
        klientName={klientName}
        objektNazev={objektNazev}
      />
    </div>
  );
}
