"use client";

import { useState } from "react";
import { PostponementSheet } from "./PostponementSheet";
import type { PrehledOverdue } from "./types";

type Props = {
  items: PrehledOverdue[];
  onReload: () => void;
};

function getEscalationColor(dny: number): {
  bg: string;
  border: string;
  badge: string;
  badgeText: string;
} {
  if (dny >= 14)
    return {
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100",
      badgeText: "text-red-700",
    };
  if (dny >= 7)
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

function getKlientName(item: PrehledOverdue): string {
  const k = item.zakazka?.objekt?.klient;
  if (!k) return "Neznámý klient";
  if (k.typ === "firma" && k.nazev) return k.nazev;
  return `${k.jmeno} ${k.prijmeni}`.trim() || "Neznámý klient";
}

export function ZpozdeneTab({ items, onReload }: Props) {
  const [postponeItem, setPostponeItem] = useState<PrehledOverdue | null>(
    null,
  );

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Žádné zpožděné zásahy
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const colors = getEscalationColor(item.dny_zpozdeni);
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
                  {item.dny_zpozdeni} dní zpoždění
                </span>
              </div>

              {/* Info */}
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {technik && (
                  <span>
                    Technik: {technik.jmeno} {technik.prijmeni.charAt(0)}.
                  </span>
                )}
                <span>
                  Plánováno:{" "}
                  {new Date(item.datum).toLocaleDateString("cs-CZ")}
                </span>
                {item.puvodni_datum && (
                  <span>
                    Původně:{" "}
                    {new Date(item.puvodni_datum).toLocaleDateString("cs-CZ")}
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
                <button
                  type="button"
                  onClick={() => setPostponeItem(item)}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-amber-100 px-3 text-sm font-medium text-amber-700 active:bg-amber-200"
                >
                  📅 Posunout
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Postponement sheet */}
      <PostponementSheet
        open={!!postponeItem}
        onOpenChange={(open) => {
          if (!open) setPostponeItem(null);
        }}
        zasahId={postponeItem?.id || ""}
        klientName={postponeItem ? getKlientName(postponeItem) : ""}
        objektNazev={postponeItem?.zakazka?.objekt?.nazev || ""}
        currentDatum={postponeItem?.datum || ""}
        onPostponed={() => {
          setPostponeItem(null);
          onReload();
        }}
      />
    </>
  );
}
