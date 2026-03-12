import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PortalFakturyPage() {
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

  type FakturaRow = {
    id: string;
    cislo: string | null;
    castka_bez_dph: number | null;
    castka_s_dph: number | null;
    stav: string;
    created_at: string;
    datum_vystaveni: string;
    datum_splatnosti: string | null;
    fakturoid_id: number | null;
  };

  let faktury: FakturaRow[] = [];
  try {
    const { data } = await supabase
      .from("faktury")
      .select("id, cislo, castka_bez_dph, castka_s_dph, stav, created_at, datum_vystaveni, datum_splatnosti, fakturoid_id")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    faktury = (data ?? []) as FakturaRow[];
  } catch {
    // fallback
  }

  const formatDatum = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCastka = (n: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const stavLabels: Record<string, string> = {
    vytvorena: "Vystavena",
    odeslana: "Odeslaná",
    uhrazena: "Uhrazena",
    po_splatnosti: "Po splatnosti",
  };

  const stavColors: Record<string, string> = {
    vytvorena: "bg-blue-100 text-blue-800",
    odeslana: "bg-amber-100 text-amber-800",
    uhrazena: "bg-green-100 text-green-800",
    po_splatnosti: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Faktury</h2>

      {faktury.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Zatím žádné faktury k zobrazení.
        </p>
      ) : (
        <div className="space-y-2">
          {faktury.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{f.cislo || "Faktura"}</p>
                    <Badge
                      className={`text-xs ${stavColors[f.stav] || ""}`}
                      variant="secondary"
                    >
                      {stavLabels[f.stav] || f.stav}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vystaveno: {formatDatum(f.datum_vystaveni)}
                    {f.datum_splatnosti && ` · Splatnost: ${formatDatum(f.datum_splatnosti)}`}
                  </p>
                </div>
                <p className="text-base font-semibold whitespace-nowrap ml-2">
                  {formatCastka(Number(f.castka_s_dph ?? f.castka_bez_dph ?? 0))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
