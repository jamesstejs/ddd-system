import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toDateString } from "@/lib/utils/dateUtils";
import { getZakazkyNeedingTermin } from "@/lib/supabase/queries/portalSlots";
import { PostponementCard } from "./PostponementCard";

export default async function PortalTerminyPage() {
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

  const dnes = toDateString(new Date());

  type ZasahRow = {
    id: string;
    datum: string;
    cas_od: string;
    cas_do: string;
    status: string;
    puvodni_datum: string | null;
    profiles: { jmeno: string | null; prijmeni: string | null; telefon: string | null } | null;
    zakazky: {
      typy_zasahu: string[];
      objekty: { nazev: string; adresa: string | null };
    } | null;
  };

  let zasahy: ZasahRow[] = [];
  try {
    const { data } = await supabase
      .from("zasahy")
      .select(
        `id, datum, cas_od, cas_do, status, puvodni_datum,
         profiles!zasahy_technik_id_fkey ( jmeno, prijmeni, telefon ),
         zakazky!zasahy_zakazka_id_fkey (
           typy_zasahu,
           objekty ( nazev, adresa )
         )`,
      )
      .gte("datum", dnes)
      .not("status", "eq", "zruseno")
      .is("deleted_at", null)
      .order("datum", { ascending: true })
      .order("cas_od", { ascending: true })
      .limit(50);
    zasahy = (data ?? []) as ZasahRow[];
  } catch {
    // fallback
  }

  const formatDatum = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCas = (c: string) => c?.substring(0, 5) || "";

  const statusLabels: Record<string, string> = {
    naplanovano: "Naplánovaný",
    potvrzeny: "Potvrzený",
    probiha: "Probíhá",
  };

  const statusColors: Record<string, string> = {
    naplanovano: "bg-blue-100 text-blue-800",
    potvrzeny: "bg-green-100 text-green-800",
    probiha: "bg-amber-100 text-amber-800",
  };

  const zasahLabels: Record<string, string> = {
    vnitrni_deratizace: "Deratizace",
    vnejsi_deratizace: "Deratizace (vnější)",
    vnitrni_dezinsekce: "Dezinsekce",
    postrik: "Postřik",
  };

  // Check if there are pripominky needing termin selection
  let needsSelection = false;
  try {
    const { data: pripominky } = await getZakazkyNeedingTermin(supabase, profile.klient_id);
    type PripominkaRow = {
      zakazky: { objekty: { klient_id: string } } | null;
    };
    const myPripominky = ((pripominky ?? []) as unknown as PripominkaRow[]).filter(
      (p) => p.zakazky?.objekty?.klient_id === profile.klient_id,
    );
    needsSelection = myPripominky.length > 0;
  } catch {
    // fallback
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Nadcházející termíny</h2>

      {needsSelection && (
        <Link href="/portal/terminy/vyber">
          <Card className="border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
            <CardContent className="py-4 text-center">
              <p className="text-sm font-semibold text-primary">
                Máte zakázky čekající na výběr termínu
              </p>
              <p className="mt-1 text-xs text-primary/80">
                Klikněte pro výběr volného termínu →
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      {zasahy.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Žádné nadcházející termíny. Budete informováni emailem o novém termínu.
        </p>
      ) : (
        <div className="space-y-3">
          {zasahy.map((z) => {
            const zak = z.zakazky as ZasahRow["zakazky"];
            const objekt = zak?.objekty;
            const typy = zak?.typy_zasahu ?? [];

            return (
              <Card key={z.id}>
                <CardContent className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{formatDatum(z.datum)}</p>
                    <Badge
                      className={`text-xs ${statusColors[z.status] || ""}`}
                      variant="secondary"
                    >
                      {statusLabels[z.status] || z.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCas(z.cas_od)} – {formatCas(z.cas_do)}
                  </p>
                  {objekt && (
                    <p className="text-sm text-muted-foreground">
                      {objekt.nazev}
                      {objekt.adresa && ` · ${objekt.adresa}`}
                    </p>
                  )}
                  {typy.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {typy.map((t: string) => zasahLabels[t] || t).join(", ")}
                    </p>
                  )}
                  {z.profiles && (
                    <p className="text-xs text-muted-foreground">
                      Technik: {z.profiles.jmeno} {z.profiles.prijmeni}
                      {z.profiles.telefon && (
                        <a
                          href={`tel:${z.profiles.telefon}`}
                          className="ml-1 text-primary underline"
                        >
                          {z.profiles.telefon}
                        </a>
                      )}
                    </p>
                  )}
                  {/* Postponement option for upcoming scheduled/confirmed zasahy */}
                  {["naplanovano", "potvrzeny"].includes(z.status) && (
                    <PostponementCard
                      zasahId={z.id}
                      currentDatum={z.datum}
                      puvodni_datum={z.puvodni_datum}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
