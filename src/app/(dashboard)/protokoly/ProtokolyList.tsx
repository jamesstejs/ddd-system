"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/supabase/database.types";

type StatusProtokolu = Database["public"]["Enums"]["status_protokolu"];

type ProtokolRow = {
  id: string;
  cislo_protokolu: string | null;
  status: StatusProtokolu;
  created_at: string;
  poznamka: string | null;
  profiles: { id: string; jmeno: string | null; prijmeni: string | null } | null;
  zasahy: {
    id: string;
    datum: string | null;
    zakazky: {
      id: string;
      objekty: {
        id: string;
        nazev: string | null;
        adresa: string | null;
        klienti: {
          id: string;
          nazev: string | null;
          jmeno: string | null;
          prijmeni: string | null;
        } | null;
      } | null;
    } | null;
  } | null;
};

type StatusFilter = StatusProtokolu | "all";

const STATUS_LABELS: Record<StatusProtokolu, string> = {
  rozpracovany: "Rozpracovan\u00fd",
  ke_schvaleni: "Ke schv\u00e1len\u00ed",
  schvaleny: "Schv\u00e1len\u00fd",
  odeslany: "Odeslan\u00fd",
};

const STATUS_VARIANTS: Record<StatusProtokolu, "default" | "secondary" | "outline" | "destructive"> = {
  rozpracovany: "outline",
  ke_schvaleni: "default",
  schvaleny: "secondary",
  odeslany: "secondary",
};

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ke_schvaleni", label: "Ke schv\u00e1len\u00ed" },
  { value: "schvaleny", label: "Schv\u00e1len\u00fd" },
  { value: "odeslany", label: "Odeslan\u00fd" },
  { value: "rozpracovany", label: "Rozpracovan\u00fd" },
  { value: "all", label: "V\u0161e" },
];

const PAGE_SIZE = 20;

function getKlientName(p: ProtokolRow): string {
  const klient = p.zasahy?.zakazky?.objekty?.klienti;
  if (!klient) return "\u2014";
  return klient.nazev || `${klient.prijmeni ?? ""} ${klient.jmeno ?? ""}`.trim() || "\u2014";
}

function getTechnikName(p: ProtokolRow): string {
  if (!p.profiles) return "\u2014";
  return `${p.profiles.jmeno ?? ""} ${p.profiles.prijmeni ?? ""}`.trim() || "\u2014";
}

function getObjektNazev(p: ProtokolRow): string {
  return p.zasahy?.zakazky?.objekty?.nazev || "";
}

function formatDatum(datum: string | null): string {
  if (!datum) return "\u2014";
  const [y, m, d] = datum.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

type Props = {
  protokoly: ProtokolRow[];
};

export function ProtokolyList({ protokoly }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ke_schvaleni");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let result = protokoly;

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => {
        const cislo = (p.cislo_protokolu || "").toLowerCase();
        const klient = getKlientName(p).toLowerCase();
        const technik = getTechnikName(p).toLowerCase();
        const objekt = getObjektNazev(p).toLowerCase();
        return (
          cislo.includes(q) ||
          klient.includes(q) ||
          technik.includes(q) ||
          objekt.includes(q)
        );
      });
    }

    return result;
  }, [protokoly, statusFilter, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="space-y-4 p-4">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <Input
          placeholder="Hledat protokol..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="min-h-[44px] pl-9 text-base"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setStatusFilter(opt.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`min-h-[44px] rounded-full px-4 text-sm font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length === 0
          ? "\u017d\u00e1dn\u00e9 protokoly"
          : `${filtered.length} protokol${filtered.length === 1 ? "" : filtered.length >= 2 && filtered.length <= 4 ? "y" : "\u016f"}`}
      </p>

      {/* List */}
      <div className="space-y-2">
        {visible.map((p) => (
          <Link key={p.id} href={`/protokoly/${p.id}`}>
            <Card className="transition-colors active:bg-muted/50">
              <CardContent className="flex items-start justify-between p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.cislo_protokolu || "Bez \u010d\u00edsla"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {getKlientName(p)}
                    {getObjektNazev(p) ? ` \u2013 ${getObjektNazev(p)}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getTechnikName(p)} &middot; {formatDatum(p.zasahy?.datum ?? p.created_at?.slice(0, 10) ?? null)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[p.status]} className="ml-2 shrink-0 text-xs">
                  {STATUS_LABELS[p.status]}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
        >
          Zobrazit dal\u0161\u00ed ({filtered.length - visibleCount} zb\u00fdv\u00e1)
        </Button>
      )}
    </div>
  );
}
