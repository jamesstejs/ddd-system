"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolvePripominkaFromPrehledAction } from "./actions";
import type { PrehledPripominka } from "./types";

type Props = {
  items: PrehledPripominka[];
  onReload: () => void;
};

function getUrgencyColor(pocet: number): {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
} {
  if (pocet >= 7)
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100",
      badgeText: "text-red-700",
    };
  if (pocet >= 4)
    return {
      bg: "bg-orange-50",
      border: "border-orange-200",
      badge: "bg-orange-100",
      badgeText: "text-orange-700",
    };
  return {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100",
    badgeText: "text-amber-700",
  };
}

function getKlientName(item: PrehledPripominka): string {
  const k = item.zakazka?.objekt?.klient;
  if (!k) return "Neznámý klient";
  if (k.typ === "firma" && k.nazev) return k.nazev;
  return `${k.jmeno} ${k.prijmeni}`.trim() || "Neznámý klient";
}

export function PripominkyTab({ items, onReload }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleResolve = (id: string) => {
    startTransition(async () => {
      try {
        await resolvePripominkaFromPrehledAction(id);
        onReload();
      } catch {
        // silently handle
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Žádné připomínky k domluvení
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const colors = getUrgencyColor(item.pocet_upozorneni);
        const klientName = getKlientName(item);
        const objekt = item.zakazka?.objekt;
        const technik = item.technik;
        const telefon = item.zakazka?.objekt?.klient?.telefon;

        return (
          <div
            key={item.id}
            className={`rounded-lg border p-3 ${colors.bg} ${colors.border}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {klientName}
                </p>
                {objekt && (
                  <p className="truncate text-xs text-muted-foreground">
                    {objekt.nazev} — {objekt.adresa}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${colors.badge} ${colors.badgeText}`}
              >
                {item.pocet_upozorneni}× upozornění
              </span>
            </div>

            {/* Info */}
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {technik && (
                <span>
                  Technik: {technik.jmeno} {technik.prijmeni.charAt(0)}.
                </span>
              )}
              {item.zasah && (
                <span>
                  Poslední zásah:{" "}
                  {new Date(item.zasah.datum).toLocaleDateString("cs-CZ")}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-2.5 flex gap-2">
              {telefon && (
                <a
                  href={`tel:${telefon}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-100 px-3 text-sm font-medium text-blue-700 active:bg-blue-200"
                >
                  📞 Volat
                </a>
              )}
              <a
                href="/kalendar"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-green-100 px-3 text-sm font-medium text-green-700 active:bg-green-200"
              >
                📅 Naplánovat
              </a>
              <Button
                variant="outline"
                className="min-h-[44px] flex-1 text-sm"
                onClick={() => handleResolve(item.id)}
                disabled={isPending}
              >
                ✓ Vyřešeno
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
