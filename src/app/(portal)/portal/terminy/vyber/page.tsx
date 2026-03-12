import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { toDateString } from "@/lib/utils/dateUtils";
import { getZakazkyNeedingTermin } from "@/lib/supabase/queries/portalSlots";
import SlotPicker from "./SlotPicker";

export default async function VyberTerminuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("klient_id")
    .eq("id", user.id)
    .is("deleted_at", null)
    .single();

  if (!profile?.klient_id) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Váš účet není propojen s klientským profilem.
      </div>
    );
  }

  // Get pripominky for this klient's zakazky
  const { data: pripominky } = await getZakazkyNeedingTermin(supabase, profile.klient_id);

  type PripominkaRow = {
    id: string;
    zakazka_id: string;
    zasah_id: string;
    technik_id: string;
    stav: string;
    zakazky: {
      id: string;
      typ: string;
      typy_zasahu: string[];
      cetnost_dny: number | null;
      objekty: {
        id: string;
        nazev: string;
        adresa: string | null;
        klient_id: string;
      };
    } | null;
    profiles: {
      id: string;
      jmeno: string;
      prijmeni: string;
    } | null;
  };

  // Filter to only this klient's pripominky
  const myPripominky = ((pripominky ?? []) as unknown as PripominkaRow[]).filter(
    (p) => p.zakazky?.objekty?.klient_id === profile.klient_id,
  );

  const zasahLabels: Record<string, string> = {
    vnitrni_deratizace: "Deratizace",
    vnejsi_deratizace: "Deratizace (vnější)",
    vnitrni_dezinsekce: "Dezinsekce",
    postrik: "Postřik",
  };

  if (myPripominky.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Výběr termínu</h2>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Momentálně nemáte žádné zakázky čekající na výběr termínu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Výběr termínu</h2>
      <p className="text-sm text-muted-foreground">
        Vyberte si termín pro vaši další návštěvu. Zobrazujeme dostupné termíny na 1 měsíc dopředu.
      </p>

      {myPripominky.map((p) => (
        <div key={p.id} className="space-y-3">
          <div className="rounded-lg border bg-white p-3">
            <p className="text-sm font-medium">
              {p.zakazky?.objekty?.nazev || "Objekt"}
              {p.zakazky?.objekty?.adresa && (
                <span className="text-muted-foreground"> · {p.zakazky.objekty.adresa}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {(p.zakazky?.typy_zasahu ?? [])
                .map((t: string) => zasahLabels[t] || t)
                .join(", ")}
            </p>
            {p.profiles && (
              <p className="text-xs text-muted-foreground">
                Technik: {p.profiles.jmeno} {p.profiles.prijmeni}
              </p>
            )}
          </div>

          <SlotPicker
            pripominkaId={p.id}
            zakazkaId={p.zakazka_id}
            technikId={p.technik_id}
            objektNazev={p.zakazky?.objekty?.nazev || "Objekt"}
          />
        </div>
      ))}
    </div>
  );
}
