"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Types for faktury with relations
type FakturaRow = {
  id: string;
  cislo: string | null;
  castka_bez_dph: number | null;
  castka_s_dph: number | null;
  dph_sazba: number;
  stav: "vytvorena" | "odeslana" | "uhrazena" | "po_splatnosti" | "storno";
  datum_vystaveni: string;
  datum_splatnosti: string | null;
  fakturoid_url: string | null;
  poznamka: string | null;
  created_at: string;
  zakazky: {
    id: string;
    typ: string;
    objekty: {
      nazev: string;
      klienti: {
        id: string;
        nazev: string;
        jmeno: string;
        prijmeni: string;
        ico: string | null;
        typ: string;
      } | null;
    } | null;
  } | null;
  protokoly: {
    id: string;
    cislo_protokolu: string | null;
  } | null;
};

const STAV_LABELS: Record<string, string> = {
  vytvorena: "Vytvořena",
  odeslana: "Odeslána",
  uhrazena: "Uhrazena",
  po_splatnosti: "Po splatnosti",
  storno: "Stornována",
};

const STAV_COLORS: Record<string, string> = {
  vytvorena: "bg-gray-100 text-gray-800",
  odeslana: "bg-blue-100 text-blue-800",
  uhrazena: "bg-green-100 text-green-800",
  po_splatnosti: "bg-red-100 text-red-800",
  storno: "bg-gray-200 text-gray-500",
};

const STAV_FILTERS = [
  { value: "vse", label: "Vše" },
  { value: "vytvorena", label: "Vytvořené" },
  { value: "odeslana", label: "Odeslané" },
  { value: "uhrazena", label: "Uhrazené" },
  { value: "po_splatnosti", label: "Po splatnosti" },
  { value: "storno", label: "Stornované" },
];

function getKlientName(faktura: FakturaRow): string {
  const klient = faktura.zakazky?.objekty?.klienti;
  if (!klient) return "Neznámý klient";
  if (klient.typ === "firma") return klient.nazev || "Firma";
  return `${klient.prijmeni} ${klient.jmeno}`.trim() || klient.nazev || "Klient";
}

function formatCena(cena: number | null): string {
  if (cena === null || cena === undefined) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cena);
}

function formatDatum(datum: string | null): string {
  if (!datum) return "—";
  return new Date(datum).toLocaleDateString("cs-CZ");
}

export function FakturyList({ faktury }: { faktury: FakturaRow[] }) {
  const [search, setSearch] = useState("");
  const [stavFilter, setStavFilter] = useState("vse");

  const filtered = faktury.filter((f) => {
    // Stav filter
    if (stavFilter !== "vse" && f.stav !== stavFilter) return false;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      const klientName = getKlientName(f).toLowerCase();
      const cislo = (f.cislo || "").toLowerCase();
      const protokolCislo =
        (f.protokoly?.cislo_protokolu || "").toLowerCase();
      return (
        klientName.includes(q) ||
        cislo.includes(q) ||
        protokolCislo.includes(q)
      );
    }

    return true;
  });

  return (
    <div className="space-y-3">
      {/* Search */}
      <Input
        placeholder="Hledat dle klienta, čísla faktury..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-base"
      />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {STAV_FILTERS.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setStavFilter(sf.value)}
            className={`min-h-[36px] rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              stavFilter === sf.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {sf.label}
            {sf.value !== "vse" && (
              <span className="ml-1 text-xs">
                ({faktury.filter((f) => f.stav === sf.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {faktury.length === 0
            ? "Zatím žádné faktury"
            : "Žádné faktury neodpovídají filtru"}
        </p>
      )}

      {/* List */}
      {filtered.map((f) => (
        <Link key={f.id} href={`/faktury/${f.id}`}>
          <Card className="transition-colors active:bg-muted/50">
            <CardContent className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {f.cislo || "Bez čísla"}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-xs ${STAV_COLORS[f.stav] || ""}`}
                  >
                    {STAV_LABELS[f.stav] || f.stav}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {getKlientName(f)}
                  {f.zakazky?.objekty?.nazev
                    ? ` — ${f.zakazky.objekty.nazev}`
                    : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDatum(f.datum_vystaveni)}
                  {f.datum_splatnosti
                    ? ` · splatnost ${formatDatum(f.datum_splatnosti)}`
                    : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold">
                  {formatCena(f.castka_s_dph)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCena(f.castka_bez_dph)} bez DPH
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
