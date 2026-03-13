"use client";

import Link from "next/link";
import type { PrehledFakturace } from "./types";

type Props = {
  items: PrehledFakturace[];
};

function getFakturaStatus(item: PrehledFakturace): {
  label: string;
  bg: string;
  text: string;
} {
  if (!item.protokol) {
    return { label: "Bez protokolu", bg: "bg-gray-100", text: "text-gray-700" };
  }
  if (!item.faktura) {
    return {
      label: "Bez faktury",
      bg: "bg-red-100",
      text: "text-red-700",
    };
  }
  if (item.faktura.stav === "vytvorena") {
    return {
      label: "Neodeslána",
      bg: "bg-amber-100",
      text: "text-amber-700",
    };
  }
  if (item.faktura.stav === "odeslana") {
    // Check if past due
    if (
      item.faktura.datum_splatnosti &&
      new Date(item.faktura.datum_splatnosti) < new Date()
    ) {
      return {
        label: "Po splatnosti",
        bg: "bg-red-100",
        text: "text-red-700",
      };
    }
    return {
      label: "Odeslána",
      bg: "bg-blue-100",
      text: "text-blue-700",
    };
  }
  if (item.faktura.stav === "po_splatnosti") {
    return {
      label: "Po splatnosti",
      bg: "bg-red-100",
      text: "text-red-700",
    };
  }
  return { label: item.faktura.stav, bg: "bg-gray-100", text: "text-gray-700" };
}

function getKlientName(item: PrehledFakturace): string {
  const k = item.zakazka?.objekt?.klient;
  if (!k) return "Neznámý klient";
  if (k.typ === "firma" && k.nazev) return k.nazev;
  return `${k.jmeno} ${k.prijmeni}`.trim() || "Neznámý klient";
}

function formatCena(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function FakturaceTab({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Žádné zásahy k fakturaci
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const status = getFakturaStatus(item);
        const klientName = getKlientName(item);
        const objekt = item.zakazka?.objekt;
        const technik = item.technik;

        return (
          <div
            key={item.id}
            className="rounded-lg border bg-card p-3"
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
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${status.bg} ${status.text}`}
              >
                {status.label}
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
                Zásah:{" "}
                {new Date(item.datum).toLocaleDateString("cs-CZ")}
              </span>
              {item.protokol && (
                <span>
                  Protokol: {item.protokol.cislo_protokolu || item.protokol.status}
                </span>
              )}
              {item.faktura?.castka_s_dph != null && (
                <span className="font-medium text-foreground">
                  {formatCena(item.faktura.castka_s_dph)}
                </span>
              )}
              {item.faktura?.datum_splatnosti && (
                <span>
                  Splatnost:{" "}
                  {new Date(item.faktura.datum_splatnosti).toLocaleDateString(
                    "cs-CZ",
                  )}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-2.5 flex gap-2">
              {!item.faktura && item.protokol && (
                <Link
                  href={`/faktury?zasah=${item.id}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-green-100 px-3 text-sm font-medium text-green-700 active:bg-green-200"
                >
                  Vystavit fakturu
                </Link>
              )}
              {item.faktura && (
                <Link
                  href={`/faktury?id=${item.faktura.id}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-blue-100 px-3 text-sm font-medium text-blue-700 active:bg-blue-200"
                >
                  Detail faktury
                </Link>
              )}
              {!item.protokol && (
                <Link
                  href={`/protokoly?zasah=${item.id}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-amber-100 px-3 text-sm font-medium text-amber-700 active:bg-amber-200"
                >
                  Vytvořit protokol
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
