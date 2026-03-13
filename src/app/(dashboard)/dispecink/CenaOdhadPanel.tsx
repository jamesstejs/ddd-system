"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCenaOdhadAction } from "./actions";
import type { CenaOdhadResult } from "./types";

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

const TYP_ZASAHU_OPTIONS = [
  { value: "vnitrni_deratizace", label: "Deratizace (vnitřní)" },
  { value: "vnejsi_deratizace", label: "Deratizace (vnější)" },
  { value: "vnitrni_dezinsekce", label: "Dezinsekce" },
  { value: "postrik", label: "Postřik" },
];

const TYP_OBJEKTU_OPTIONS = [
  { value: "gastro", label: "Gastro" },
  { value: "sklad_nevyzivocisna", label: "Sklad (neživočišný)" },
  { value: "sklad_zivocisna", label: "Sklad (živočišný)" },
  { value: "domacnost", label: "Domácnost" },
  { value: "kancelar", label: "Kancelář" },
  { value: "hotel", label: "Hotel" },
  { value: "vyrobni_hala", label: "Výrobní hala" },
];

export function CenaOdhadPanel({ expanded, onToggle }: Props) {
  const [typZakazky, setTypZakazky] = useState<"jednorazova" | "smluvni">(
    "jednorazova",
  );
  const [jePrvniNavsteva, setJePrvniNavsteva] = useState(true);
  const [typZasahu, setTypZasahu] = useState<string[]>([
    "vnitrni_deratizace",
  ]);
  const [typObjektu, setTypObjektu] = useState("gastro");
  const [plochaM2, setPlochaM2] = useState(100);
  const [jeVikend, setJeVikend] = useState(false);
  const [jeNocni, setJeNocni] = useState(false);
  const [result, setResult] = useState<CenaOdhadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasDeratizace = typZasahu.some(
    (t) => t === "vnitrni_deratizace" || t === "vnejsi_deratizace",
  );

  const fetchCena = useCallback(async () => {
    if (typZasahu.length === 0) {
      setResult(null);
      return;
    }
    setLoading(true);
    try {
      const data = await getCenaOdhadAction({
        typ_zakazky: typZakazky,
        typy_zasahu: typZasahu,
        skudci: [],
        plocha_m2: plochaM2,
        doprava_km: 0,
        je_prvni_navsteva: jePrvniNavsteva,
        je_vikend: jeVikend,
        je_nocni: jeNocni,
        typ_objektu: typObjektu,
      });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [typZasahu, plochaM2, jeVikend, jeNocni, typZakazky, jePrvniNavsteva, typObjektu]);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchCena, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchCena]);

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
        {/* Header — always visible */}
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={onToggle}
        >
          <span className="text-sm font-semibold text-green-800">
            Odhad ceny
          </span>
          <div className="flex items-center gap-2">
            {loading && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            )}
            {result && (
              <span className="text-lg font-bold text-green-900">
                {formatCena(result.cena_s_dph)}
              </span>
            )}
            <span className="text-xs text-green-600">
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </button>

        {/* Expanded controls */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-green-200 pt-3">
            {/* Typ zakázky */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-green-800">
                Typ zakázky
              </Label>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: "jednorazova", label: "Jednorázová" },
                    { value: "smluvni", label: "Smluvní" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTypZakazky(opt.value)}
                    className={`flex-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      typZakazky === opt.value
                        ? "bg-green-600 text-white"
                        : "bg-green-100 text-green-700 active:bg-green-200"
                    }`}
                    style={{ minHeight: 32 }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zavedení / Kontrola — only for smluvní */}
            {typZakazky === "smluvni" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-green-800">
                  Návštěva
                </Label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setJePrvniNavsteva(true)}
                    className={`flex-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      jePrvniNavsteva
                        ? "bg-amber-500 text-white"
                        : "bg-green-100 text-green-700 active:bg-green-200"
                    }`}
                    style={{ minHeight: 32 }}
                  >
                    Zavedení
                  </button>
                  <button
                    type="button"
                    onClick={() => setJePrvniNavsteva(false)}
                    className={`flex-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                      !jePrvniNavsteva
                        ? "bg-amber-500 text-white"
                        : "bg-green-100 text-green-700 active:bg-green-200"
                    }`}
                    style={{ minHeight: 32 }}
                  >
                    Kontrola
                  </button>
                </div>
              </div>
            )}

            {/* Typ zásahu */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-green-800">
                Typ zásahu
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {TYP_ZASAHU_OPTIONS.map((opt) => {
                  const isActive = typZasahu.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTypZasahu((prev) =>
                          isActive
                            ? prev.filter((v) => v !== opt.value)
                            : [...prev, opt.value],
                        );
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-green-600 text-white"
                          : "bg-green-100 text-green-700 active:bg-green-200"
                      }`}
                      style={{ minHeight: 32 }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typ objektu — for smluvní with deratizace */}
            {typZakazky === "smluvni" && hasDeratizace && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-green-800">
                  Typ objektu
                </Label>
                <div className="flex flex-wrap gap-1">
                  {TYP_OBJEKTU_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTypObjektu(opt.value)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                        typObjektu === opt.value
                          ? "bg-green-600 text-white"
                          : "bg-green-100 text-green-700 active:bg-green-200"
                      }`}
                      style={{ minHeight: 28 }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plocha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-green-800">
                Plocha (m²)
              </Label>
              <Input
                type="number"
                min={1}
                max={10000}
                value={plochaM2}
                onChange={(e) =>
                  setPlochaM2(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="min-h-[44px] bg-white text-base"
              />
            </div>

            {/* Příplatky */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setJeVikend(!jeVikend)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  jeVikend
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-muted bg-white text-muted-foreground"
                }`}
                style={{ minHeight: 36 }}
              >
                Víkend +10%
              </button>
              <button
                type="button"
                onClick={() => setJeNocni(!jeNocni)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-all ${
                  jeNocni
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-muted bg-white text-muted-foreground"
                }`}
                style={{ minHeight: 36 }}
              >
                Noční +20%
              </button>
            </div>

            {/* Monitorovací body info */}
            {typZakazky === "smluvni" &&
              hasDeratizace &&
              result?.pocty_bodu &&
              (result.pocty_bodu.mys > 0 ||
                result.pocty_bodu.potkan > 0 ||
                result.pocty_bodu.zivolovna_mys > 0) && (
                <div className="rounded-md bg-blue-50 p-2 text-xs">
                  <div className="mb-1 font-medium text-blue-800">
                    Kalkulačka bodů ({typObjektu}, {plochaM2} m²)
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-blue-700">
                    {result.pocty_bodu.mys > 0 && (
                      <span>Myš: {result.pocty_bodu.mys}× staničky</span>
                    )}
                    {result.pocty_bodu.potkan > 0 && (
                      <span>
                        Potkan: {result.pocty_bodu.potkan}× stanice
                      </span>
                    )}
                    {result.pocty_bodu.zivolovna_mys > 0 && (
                      <span>
                        Živolovná: {result.pocty_bodu.zivolovna_mys}×
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-blue-600">
                    {jePrvniNavsteva
                      ? "Zavedení = cena staničky × počet bodů"
                      : "Kontrola = 99 Kč × celkový počet bodů (pouze náplň)"}
                  </div>
                </div>
              )}

            {/* Výsledek — line items */}
            {result && (
              <div className="space-y-1 border-t border-green-200 pt-2">
                {result.polozky.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-green-800">
                      {p.nazev}
                      {p.pocet && p.pocet > 1 && p.cena_za_kus ? (
                        <span className="ml-1 text-green-600">
                          ({p.pocet}× {formatCena(p.cena_za_kus)})
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium text-green-900">
                      {formatCena(p.cena)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-green-200 pt-1 text-xs">
                  <span className="text-green-700">Základ</span>
                  <span className="font-medium">
                    {formatCena(result.cena_zaklad)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-green-800">
                    Celkem s DPH ({result.dph_sazba}%)
                  </span>
                  <span className="text-green-900">
                    {formatCena(result.cena_s_dph)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
