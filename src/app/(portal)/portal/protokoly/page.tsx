import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PortalProtokolyPage() {
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

  type ProtokolRow = {
    id: string;
    cislo_protokolu: string | null;
    status: string;
    created_at: string;
    zodpovedny_technik: string | null;
    zasahy: {
      datum: string;
      zakazky: {
        typy_zasahu: string[];
        objekty: {
          nazev: string;
          adresa: string | null;
        };
      };
    } | null;
  };

  let protokoly: ProtokolRow[] = [];
  try {
    const { data } = await supabase
      .from("protokoly")
      .select(
        `id, cislo_protokolu, status, created_at, zodpovedny_technik,
         zasahy!protokoly_zasah_id_fkey (
           datum,
           zakazky ( typy_zasahu,
             objekty ( nazev, adresa )
           )
         )`,
      )
      .in("status", ["schvaleny", "odeslany"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    protokoly = (data ?? []) as ProtokolRow[];
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

  const zasahLabels: Record<string, string> = {
    vnitrni_deratizace: "Deratizace (vnitřní)",
    vnejsi_deratizace: "Deratizace (vnější)",
    vnitrni_dezinsekce: "Dezinsekce (vnitřní)",
    postrik: "Postřik",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Protokoly</h2>

      {protokoly.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Zatím žádné protokoly k zobrazení.
        </p>
      ) : (
        <div className="space-y-2">
          {protokoly.map((p) => {
            const zasah = p.zasahy as ProtokolRow["zasahy"];
            const objekt = (zasah?.zakazky as unknown as { objekty: { nazev: string; adresa: string | null }; typy_zasahu: string[] })?.objekty;
            const typy = (zasah?.zakazky as unknown as { typy_zasahu: string[] })?.typy_zasahu ?? [];

            return (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {p.cislo_protokolu || "Protokol"}
                      </p>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        {p.status === "odeslany" ? "Odeslaný" : "Schválený"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {zasah?.datum ? formatDatum(zasah.datum) : formatDatum(p.created_at)}
                      {objekt?.nazev && ` · ${objekt.nazev}`}
                    </p>
                    {typy.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {typy.map((t: string) => zasahLabels[t] || t).join(", ")}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/api/protokoly/${p.id}/pdf`}
                    target="_blank"
                    className="ml-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                  >
                    PDF
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
