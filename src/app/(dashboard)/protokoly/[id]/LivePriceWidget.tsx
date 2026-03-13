"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  computeLivePriceAction,
  type LivePriceResult,
} from "./protokolActions";

type Props = {
  protokolId: string;
  /** Triggers recalculation when this value changes (e.g. body.length) */
  bodCountTrigger: number;
  isReadonly: boolean;
};

export function LivePriceWidget({
  protokolId,
  bodCountTrigger,
  isReadonly,
}: Props) {
  const [data, setData] = useState<LivePriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchPrice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await computeLivePriceAction(protokolId);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Chyba výpočtu");
      }
    } catch {
      setError("Nepodařilo se načíst cenu");
    } finally {
      setLoading(false);
    }
  }, [protokolId]);

  // Initial load
  useEffect(() => {
    fetchPrice();
  }, [fetchPrice]);

  // Recalculate when bod count changes (debounced)
  useEffect(() => {
    if (bodCountTrigger === 0) return;
    const timer = setTimeout(fetchPrice, 2000);
    return () => clearTimeout(timer);
  }, [bodCountTrigger, fetchPrice]);

  if (error && !data) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-3">
          <p className="text-sm text-amber-800">Kalkulace: {error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 min-h-[36px]"
            onClick={fetchPrice}
          >
            Zkusit znovu
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data && loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Počítám cenu...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalBodu =
    data.pocet_bodu_mys +
    data.pocet_bodu_potkan +
    data.pocet_bodu_zivolovna +
    data.pocet_bodu_sklopna_mys +
    data.pocet_bodu_sklopna_potkan;

  const formatCena = (n: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="p-3">
        {/* Main price line */}
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-800">
              💰 Cena zásahu
            </span>
            {loading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            )}
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-green-900">
              {formatCena(data.cena_s_dph)}
            </span>
            <span className="ml-1 text-xs text-green-700">s DPH</span>
          </div>
        </button>

        {/* Subtitle */}
        <div className="mt-1 flex items-center justify-between text-xs text-green-700">
          <span>
            {totalBodu} {totalBodu === 1 ? "bod" : totalBodu < 5 ? "body" : "bodů"}{" "}
            · základ {formatCena(data.cena_zaklad)}
          </span>
          <span className="text-green-600">
            {expanded ? "▲ Skrýt" : "▼ Detail"}
          </span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-green-200 pt-3">
            {/* Bod counts */}
            <div className="flex flex-wrap gap-2 text-xs">
              {data.pocet_bodu_mys > 0 && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  Myš: {data.pocet_bodu_mys}
                </span>
              )}
              {data.pocet_bodu_potkan > 0 && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  Potkan: {data.pocet_bodu_potkan}
                </span>
              )}
              {data.pocet_bodu_zivolovna > 0 && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  Živolovná: {data.pocet_bodu_zivolovna}
                </span>
              )}
              {data.pocet_bodu_sklopna_mys > 0 && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  Sklopná myš: {data.pocet_bodu_sklopna_mys}
                </span>
              )}
              {data.pocet_bodu_sklopna_potkan > 0 && (
                <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">
                  Sklopná potkan: {data.pocet_bodu_sklopna_potkan}
                </span>
              )}
            </div>

            {/* Line items */}
            <div className="space-y-1">
              {data.polozky.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-green-800">
                    {p.nazev}
                    {p.pocet > 1 && ` ×${p.pocet}`}
                  </span>
                  <span className="font-medium text-green-900">
                    {formatCena(p.cena_celkem)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-green-200 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700">Základ bez DPH</span>
                <span className="font-medium text-green-900">
                  {formatCena(data.cena_zaklad)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700">
                  DPH {data.dph_sazba}%
                </span>
                <span className="font-medium text-green-900">
                  {formatCena(data.cena_s_dph - data.cena_zaklad)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm font-bold">
                <span className="text-green-800">Celkem s DPH</span>
                <span className="text-green-900">
                  {formatCena(data.cena_s_dph)}
                </span>
              </div>
            </div>

            {/* Refresh */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 min-h-[36px] w-full text-xs"
              onClick={fetchPrice}
              disabled={loading}
            >
              {loading ? "Počítám..." : "🔄 Přepočítat cenu"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
