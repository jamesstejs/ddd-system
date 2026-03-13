"use client";

import { useState, useEffect, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListTodo, ChevronRight } from "lucide-react";
import { getUnscheduledZakazkyAction } from "@/app/(dashboard)/rychle-pridani/actions";
import QuickAddSheet from "./QuickAddSheet";

interface UnscheduledZakazka {
  id: string;
  typ: string;
  typy_zasahu: string[];
  skudci: string[];
  poznamka: string | null;
  objekty: {
    id: string;
    nazev: string;
    adresa: string;
    plocha_m2: number | null;
    typ_objektu: string;
    klient_id: string;
    klienti: {
      id: string;
      nazev: string | null;
      jmeno: string | null;
      prijmeni: string | null;
      typ: string;
      telefon: string | null;
      email: string | null;
    };
  };
}

export default function DispatcherQueueWidget() {
  const [zakazky, setZakazky] = useState<UnscheduledZakazka[]>([]);
  const [isPending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedKlient, setSelectedKlient] = useState<{
    id: string;
    nazev: string | null;
    jmeno: string | null;
    prijmeni: string | null;
    typ: string;
    telefon: string | null;
    email: string | null;
    adresa: string | null;
    ico: string | null;
  } | null>(null);
  const [selectedObjekty, setSelectedObjekty] = useState<
    Array<{ id: string; nazev: string; adresa: string; typ_objektu: string; plocha_m2: number | null }>
  >([]);

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getUnscheduledZakazkyAction();
        setZakazky((data ?? []) as UnscheduledZakazka[]);
      } catch {
        // fallback
      }
    });
  }, []);

  const handleZakazkaClick = (z: UnscheduledZakazka) => {
    const klient = z.objekty?.klienti;
    if (!klient) return;

    setSelectedKlient({
      id: klient.id,
      nazev: klient.nazev,
      jmeno: klient.jmeno,
      prijmeni: klient.prijmeni,
      typ: klient.typ,
      telefon: klient.telefon,
      email: klient.email,
      adresa: z.objekty?.adresa || null,
      ico: null,
    });
    setSelectedObjekty([
      {
        id: z.objekty.id,
        nazev: z.objekty.nazev || "",
        adresa: z.objekty.adresa || "",
        typ_objektu: z.objekty.typ_objektu || "domacnost",
        plocha_m2: z.objekty.plocha_m2,
      },
    ]);
    setSheetOpen(true);
  };

  const getKlientName = (z: UnscheduledZakazka) => {
    const k = z.objekty?.klienti;
    if (!k) return "—";
    if (k.typ === "firma") return k.nazev || "Bez názvu";
    return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
  };

  const getTypLabel = (typy: string[]) => {
    const labels: Record<string, string> = {
      postrik: "Postřik",
      vnitrni_deratizace: "Derat.",
      vnejsi_deratizace: "Ext. derat.",
      vnitrni_dezinsekce: "Dezinsekce",
    };
    return typy.map((t) => labels[t] || t).join(", ");
  };

  const count = zakazky.length;

  return (
    <>
      <Card className={count > 0 ? "border-orange-200 bg-orange-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            K naplánování
          </CardTitle>
          {count > 0 && (
            <span className="text-xs text-orange-600 font-medium">
              {count} {count === 1 ? "zakázka" : count < 5 ? "zakázky" : "zakázek"}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {isPending ? (
            <p className="text-sm text-muted-foreground">Načítám...</p>
          ) : count === 0 ? (
            <p className="text-sm text-muted-foreground">
              Žádné zakázky čekající na naplánování
            </p>
          ) : (
            <div className="space-y-1.5">
              {zakazky.slice(0, 3).map((z) => (
                <button
                  key={z.id}
                  onClick={() => handleZakazkaClick(z)}
                  className="w-full flex items-center justify-between text-left p-2.5 rounded-lg hover:bg-orange-100/50 transition-colors min-h-[44px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {getKlientName(z)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {getTypLabel(z.typy_zasahu || [])}
                      {z.skudci?.length > 0 && ` — ${z.skudci.join(", ")}`}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                </button>
              ))}
              {count > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{count - 3} dalších
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <QuickAddSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        preselectedKlient={selectedKlient}
        preselectedObjekty={selectedObjekty}
      />
    </>
  );
}
