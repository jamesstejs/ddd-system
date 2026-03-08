"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Bug,
  Bird,
  Rat,
  CircleHelp,
  ListFilter,
  Calendar,
  Repeat,
} from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

type Skudce = Tables<"skudci">;
type TypSkudce = Database["public"]["Enums"]["typ_skudce"];
type TypFilter = "all" | TypSkudce;

const PAGE_SIZE = 20;

const TYP_LABELS: Record<TypFilter, string> = {
  all: "Všichni",
  hlodavec: "Hlodavci",
  lezouci_hmyz: "Lezoucí hmyz",
  letajici_hmyz: "Létající hmyz",
  ostatni: "Ostatní",
};

const TYP_ICONS: Record<TypFilter, React.ReactNode> = {
  all: <ListFilter className="size-4" />,
  hlodavec: <Rat className="size-4" />,
  lezouci_hmyz: <Bug className="size-4" />,
  letajici_hmyz: <Bird className="size-4" />,
  ostatni: <CircleHelp className="size-4" />,
};

const TYP_BADGE_COLORS: Record<TypSkudce, string> = {
  hlodavec: "bg-amber-100 text-amber-800 border-amber-200",
  lezouci_hmyz: "bg-red-100 text-red-800 border-red-200",
  letajici_hmyz: "bg-blue-100 text-blue-800 border-blue-200",
  ostatni: "bg-gray-100 text-gray-800 border-gray-200",
};

function matchesSearch(s: Skudce, query: string): boolean {
  const q = query.toLowerCase();
  return [s.nazev, s.latinsky_nazev, s.kategorie]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(q));
}

function formatCetnost(dny: number | null): string | null {
  if (!dny) return null;
  if (dny < 7) return `${dny} dní`;
  if (dny === 7) return "1 týden";
  if (dny === 14) return "2 týdny";
  if (dny === 21) return "3 týdny";
  if (dny === 28) return "4 týdny";
  if (dny === 30) return "1 měsíc";
  if (dny === 42) return "6 týdnů";
  if (dny === 60) return "2 měsíce";
  if (dny === 90) return "3 měsíce";
  return `${dny} dní`;
}

export function SkudciList({ skudci }: { skudci: Skudce[] }) {
  const [search, setSearch] = useState("");
  const [typFilter, setTypFilter] = useState<TypFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let result = skudci;
    if (typFilter !== "all") {
      result = result.filter((s) => s.typ === typFilter);
    }
    if (search.trim()) {
      result = result.filter((s) => matchesSearch(s, search.trim()));
    }
    return result;
  }, [skudci, typFilter, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat škůdce..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="min-h-[44px] pl-9"
        />
      </div>

      {/* Type filter */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            "all",
            "hlodavec",
            "lezouci_hmyz",
            "letajici_hmyz",
            "ostatni",
          ] as TypFilter[]
        ).map((typ) => (
          <button
            key={typ}
            onClick={() => {
              setTypFilter(typ);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
              typFilter === typ
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {TYP_ICONS[typ]}
            {TYP_LABELS[typ]}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1
          ? "škůdce"
          : filtered.length >= 2 && filtered.length <= 4
            ? "škůdci"
            : "škůdců"}
      </p>

      {/* List */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {skudci.length === 0
                ? "Žádní škůdci v databázi"
                : "Žádní škůdci neodpovídají filtru"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {TYP_ICONS[s.typ]}
                      </span>
                      <p className="font-medium">{s.nazev}</p>
                    </div>
                    {s.latinsky_nazev && (
                      <p className="mt-0.5 text-sm italic text-muted-foreground">
                        {s.latinsky_nazev}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-xs ${TYP_BADGE_COLORS[s.typ]}`}
                      >
                        {TYP_LABELS[s.typ]}
                      </Badge>
                      {s.kategorie && (
                        <Badge variant="secondary" className="text-xs">
                          {s.kategorie}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                      {s.doporucena_cetnost_dny && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 shrink-0" />
                          Četnost: {formatCetnost(s.doporucena_cetnost_dny)}
                        </p>
                      )}
                      {s.pocet_zasahu && (
                        <p className="flex items-center gap-1.5">
                          <Repeat className="size-3.5 shrink-0" />
                          {s.pocet_zasahu}
                        </p>
                      )}
                    </div>
                    {s.poznamka && (
                      <p className="mt-1.5 text-xs text-muted-foreground/70">
                        {s.poznamka}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Zobrazit další ({filtered.length - visibleCount} zbývá)
        </Button>
      )}
    </div>
  );
}
