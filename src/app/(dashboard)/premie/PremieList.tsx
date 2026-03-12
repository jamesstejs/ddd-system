"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import {
  markBonusyProplacenoAction,
  createFixniBonusyAction,
} from "./actions";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface BonusRow {
  id: string;
  typ: "zakazka" | "opakovana_zakazka" | "fixni";
  castka: number;
  stav: "pending" | "proplaceno";
  obdobi_mesic: string;
  poznamka: string | null;
  created_at: string;
  zakazky?: {
    id: string;
    objekty?: {
      nazev: string;
      klienti?: { nazev: string; jmeno: string; prijmeni: string; typ: string } | null;
    } | null;
  } | null;
  profiles?: {
    jmeno: string | null;
    prijmeni: string | null;
    role: AppRole[];
  } | null;
}

interface Summary {
  pending: number;
  proplaceno: number;
  celkem: number;
  pocet: number;
}

interface PremieListProps {
  mojeBonusy: BonusRow[];
  vsechnyBonusy: BonusRow[];
  summary: Summary;
  mesic: string;
  role: AppRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const TYP_LABELS: Record<string, string> = {
  zakazka: "Za zakázku",
  opakovana_zakazka: "Za opakovanou",
  fixni: "Fixní odměna",
};

const TYP_COLORS: Record<string, string> = {
  zakazka: "bg-blue-100 text-blue-800",
  opakovana_zakazka: "bg-purple-100 text-purple-800",
  fixni: "bg-gray-100 text-gray-800",
};

function formatCastka(castka: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(castka);
}

function formatMesic(mesic: string): string {
  const [y, m] = mesic.split("-");
  const months = [
    "leden", "únor", "březen", "duben", "květen", "červen",
    "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
  ];
  return `${months[Number(m) - 1]} ${y}`;
}

function formatDatum(datum: string): string {
  const d = new Date(datum);
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

function getKlientName(bonus: BonusRow): string {
  const klient = bonus.zakazky?.objekty?.klienti;
  if (!klient) return "";
  if (klient.typ === "firma") return klient.nazev;
  return `${klient.prijmeni} ${klient.jmeno}`.trim();
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------

export default function PremieList({
  mojeBonusy,
  vsechnyBonusy,
  summary,
  mesic,
  role,
  isSuperAdmin,
  isAdmin,
}: PremieListProps) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(isSuperAdmin);

  const bonusy = showAll && isAdmin ? vsechnyBonusy : mojeBonusy;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPending() {
    const pendingIds = bonusy
      .filter((b) => b.stav === "pending")
      .map((b) => b.id);
    setSelected(new Set(pendingIds));
  }

  function handleProplatit() {
    if (selected.size === 0) return;
    startTransition(async () => {
      try {
        const result = await markBonusyProplacenoAction([...selected]);
        setMessage(`Proplaceno ${result.count} bonusů`);
        setSelected(new Set());
        // Reload to refresh data
        window.location.reload();
      } catch (e) {
        setMessage(`Chyba: ${e instanceof Error ? e.message : "Neznámá chyba"}`);
      }
    });
  }

  function handleGenerovat() {
    startTransition(async () => {
      try {
        const result = await createFixniBonusyAction(mesic);
        setMessage(
          `Vytvořeno ${result.created} fixních odměn` +
            (result.skipped > 0 ? `, ${result.skipped} přeskočeno (duplicita)` : ""),
        );
        window.location.reload();
      } catch (e) {
        setMessage(`Chyba: ${e instanceof Error ? e.message : "Neznámá chyba"}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Sumář */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {formatMesic(mesic)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-4">
            <div>
              <p className="text-2xl font-bold">{formatCastka(summary.celkem)}</p>
              <p className="text-sm text-muted-foreground">
                {summary.pocet} {summary.pocet === 1 ? "bonus" : summary.pocet < 5 ? "bonusy" : "bonusů"}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              {summary.pending > 0 && (
                <span className="text-amber-600">
                  K proplacení: {formatCastka(summary.pending)}
                </span>
              )}
              {summary.proplaceno > 0 && (
                <span className="text-green-600">
                  Proplaceno: {formatCastka(summary.proplaceno)}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin/super_admin: přepínač + akce */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <>
              <Button
                variant={showAll ? "default" : "outline"}
                size="sm"
                className="min-h-[44px]"
                onClick={() => setShowAll(true)}
              >
                Všechny bonusy
              </Button>
              <Button
                variant={!showAll ? "default" : "outline"}
                size="sm"
                className="min-h-[44px]"
                onClick={() => setShowAll(false)}
              >
                Moje odměny
              </Button>
            </>
          )}
          {isSuperAdmin && showAll && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] ml-auto"
                onClick={selectAllPending}
              >
                Vybrat pending
              </Button>
              <Button
                variant="default"
                size="sm"
                className="min-h-[44px]"
                disabled={selected.size === 0 || isPending}
                onClick={handleProplatit}
              >
                {isPending ? "Ukládám…" : `Proplatit (${selected.size})`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px]"
                disabled={isPending}
                onClick={handleGenerovat}
              >
                {isPending ? "Generuji…" : "Generovat fixní odměny"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Message */}
      {message && (
        <p className="text-sm text-center text-muted-foreground">{message}</p>
      )}

      {/* Seznam bonusů */}
      {bonusy.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Žádné bonusy za toto období
        </p>
      ) : (
        <div className="space-y-2">
          {bonusy.map((bonus) => (
            <Card
              key={bonus.id}
              className={`transition-colors ${
                selected.has(bonus.id)
                  ? "border-purple-400 bg-purple-50"
                  : ""
              }`}
              onClick={
                isSuperAdmin && showAll && bonus.stav === "pending"
                  ? () => toggleSelect(bonus.id)
                  : undefined
              }
            >
              <CardContent className="flex items-center gap-3 py-3">
                {/* Checkbox area for super_admin */}
                {isSuperAdmin && showAll && bonus.stav === "pending" && (
                  <input
                    type="checkbox"
                    checked={selected.has(bonus.id)}
                    onChange={() => toggleSelect(bonus.id)}
                    className="size-5 rounded"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className={`text-xs ${TYP_COLORS[bonus.typ] || ""}`}
                      variant="secondary"
                    >
                      {TYP_LABELS[bonus.typ] || bonus.typ}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        bonus.stav === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-green-100 text-green-800"
                      }`}
                      variant="secondary"
                    >
                      {bonus.stav === "pending" ? "K proplacení" : "Proplaceno"}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground truncate">
                    {showAll && bonus.profiles && (
                      <span className="font-medium text-foreground">
                        {bonus.profiles.jmeno} {bonus.profiles.prijmeni}
                        {" · "}
                      </span>
                    )}
                    {getKlientName(bonus) || bonus.poznamka || "—"}
                    <span className="text-xs ml-2">
                      {formatDatum(bonus.created_at)}
                    </span>
                  </div>
                </div>

                <p className="text-base font-semibold whitespace-nowrap">
                  {formatCastka(Number(bonus.castka))}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
