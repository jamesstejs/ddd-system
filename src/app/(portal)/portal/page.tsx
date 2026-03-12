import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toDateString } from "@/lib/utils/dateUtils";

export default async function PortalPage() {
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

  const klientId = profile?.klient_id;

  // Get recent protocols (last 5)
  let recentProtokoly: { id: string; cislo_protokolu: string | null; status: string; created_at: string }[] = [];
  if (klientId) {
    try {
      const { data } = await supabase
        .from("protokoly")
        .select("id, cislo_protokolu, status, created_at")
        .in("status", ["schvaleny", "odeslany"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      recentProtokoly = (data ?? []) as typeof recentProtokoly;
    } catch {
      // fallback
    }
  }

  // Get unpaid invoices
  let unpaidFaktury: { id: string; cislo: string | null; castka_s_dph: number | null; stav: string }[] = [];
  if (klientId) {
    try {
      const { data } = await supabase
        .from("faktury")
        .select("id, cislo, castka_s_dph, stav")
        .in("stav", ["vytvorena", "odeslana", "po_splatnosti"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      unpaidFaktury = (data ?? []) as typeof unpaidFaktury;
    } catch {
      // fallback
    }
  }

  // Get upcoming appointments
  const dnes = toDateString(new Date());
  type ZasahRow = {
    id: string;
    datum: string;
    cas_od: string;
    cas_do: string;
    status: string;
    profiles: { jmeno: string | null; prijmeni: string | null } | null;
  };
  let upcomingZasahy: ZasahRow[] = [];
  if (klientId) {
    try {
      const { data } = await supabase
        .from("zasahy")
        .select(
          `id, datum, cas_od, cas_do, status,
           profiles!zasahy_technik_id_fkey ( jmeno, prijmeni )`,
        )
        .gte("datum", dnes)
        .not("status", "eq", "zruseno")
        .is("deleted_at", null)
        .order("datum", { ascending: true })
        .limit(5);
      upcomingZasahy = (data ?? []) as ZasahRow[];
    } catch {
      // fallback
    }
  }

  const formatDatum = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCas = (c: string) => c?.substring(0, 5) || "";

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

  if (!klientId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Váš účet zatím není propojen s klientským profilem. Kontaktujte nás na{" "}
              <a href="tel:800130303" className="font-medium underline">
                800 130 303
              </a>{" "}
              nebo{" "}
              <a href="mailto:info@deraplus.cz" className="font-medium underline">
                info@deraplus.cz
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upcoming appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nadcházející termíny</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingZasahy.length > 0 ? (
            <div className="space-y-3">
              {upcomingZasahy.map((z) => (
                <div key={z.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{formatDatum(z.datum)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCas(z.cas_od)} – {formatCas(z.cas_do)}
                      {z.profiles && ` · Technik: ${z.profiles.jmeno} ${z.profiles.prijmeni}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {z.status === "potvrzeny" ? "Potvrzený" : "Naplánovaný"}
                  </Badge>
                </div>
              ))}
              <Link
                href="/portal/terminy"
                className="block text-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Zobrazit všechny termíny →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Žádné nadcházející termíny.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Unpaid invoices */}
      {unpaidFaktury.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">Neuhrazené faktury</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpaidFaktury.map((f) => (
                <div key={f.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{f.cislo || "—"}</p>
                    <Badge className={`text-xs ${stavColors[f.stav] || ""}`} variant="secondary">
                      {stavLabels[f.stav] || f.stav}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">{formatCastka(Number(f.castka_s_dph ?? 0))}</p>
                </div>
              ))}
            </div>
            <Link
              href="/portal/faktury"
              className="mt-3 block text-center text-sm text-amber-700 underline-offset-4 hover:underline"
            >
              Zobrazit faktury →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Recent protocols */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Poslední protokoly</CardTitle>
        </CardHeader>
        <CardContent>
          {recentProtokoly.length > 0 ? (
            <div className="space-y-2">
              {recentProtokoly.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{p.cislo_protokolu || "Protokol"}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDatum(p.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/api/protokoly/${p.id}/pdf`}
                    target="_blank"
                    className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    PDF
                  </Link>
                </div>
              ))}
              <Link
                href="/portal/protokoly"
                className="block text-center text-sm text-primary underline-offset-4 hover:underline"
              >
                Zobrazit všechny protokoly →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Zatím žádné protokoly.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
