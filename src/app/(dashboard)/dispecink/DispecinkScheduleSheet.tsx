"use client";

import { useState, useEffect, useTransition } from "react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  quickCreateZakazkaWithZasahAction,
  quickCreateKlientAction,
  getObjektyForKlientAction,
} from "@/app/(dashboard)/rychle-pridani/actions";
import { getCenaOdhadAction } from "./actions";
import type { CenaOdhadResult } from "./types";
import { KlientSearchInput, type KlientResult } from "./KlientSearchInput";
import { SkudceMultiSelect } from "@/components/modules/SkudceMultiSelect";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technikId: string;
  technikName: string;
  datum: string;
  casOd: string;
  casDo: string;
  onCreated: () => void;
  skudciList: { id: string; nazev: string; typ: string }[];
};

type ObjektOption = {
  id: string;
  nazev: string;
  adresa: string;
  typ_objektu: string;
  plocha_m2: number | null;
};

const TYP_ZASAHU_OPTIONS = [
  { value: "vnitrni_deratizace", label: "Deratizace (vnitřní)" },
  { value: "vnejsi_deratizace", label: "Deratizace (vnější)" },
  { value: "vnitrni_dezinsekce", label: "Dezinsekce" },
  { value: "postrik", label: "Postřik" },
];

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatDateCz(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dayNames = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return `${dayNames[dayOfWeek]} ${d}.${m}.${y}`;
}

export function DispecinkScheduleSheet({
  open,
  onOpenChange,
  technikId,
  technikName,
  datum,
  casOd,
  casDo,
  onCreated,
  skudciList,
}: Props) {
  // State
  const [selectedKlient, setSelectedKlient] = useState<KlientResult | null>(
    null,
  );
  const [objekty, setObjekty] = useState<ObjektOption[]>([]);
  const [selectedObjektId, setSelectedObjektId] = useState<string | null>(null);
  const [typZakazky, setTypZakazky] = useState<"jednorazova" | "smluvni">(
    "jednorazova",
  );
  const [jePrvniNavsteva, setJePrvniNavsteva] = useState(true);
  const [typyZasahu, setTypyZasahu] = useState<string[]>([
    "vnitrni_deratizace",
  ]);
  const [selectedSkudci, setSelectedSkudci] = useState<string[]>([]);
  const [poznamka, setPoznamka] = useState("");
  const [showNewKlient, setShowNewKlient] = useState(false);
  const [newKlient, setNewKlient] = useState({
    jmeno: "",
    telefon: "",
    adresa: "",
  });
  const [cenaResult, setCenaResult] = useState<CenaOdhadResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Derived: je deratizace?
  const hasDeratizace = typyZasahu.some(
    (t) => t === "vnitrni_deratizace" || t === "vnejsi_deratizace",
  );

  // Selected object data
  const selectedObj = objekty.find((o) => o.id === selectedObjektId);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedKlient(null);
      setObjekty([]);
      setSelectedObjektId(null);
      setTypZakazky("jednorazova");
      setJePrvniNavsteva(true);
      setTypyZasahu(["vnitrni_deratizace"]);
      setSelectedSkudci([]);
      setPoznamka("");
      setShowNewKlient(false);
      setNewKlient({ jmeno: "", telefon: "", adresa: "" });
      setCenaResult(null);
      setError(null);
    }
  }, [open]);

  // Load objekty when klient is selected
  useEffect(() => {
    if (!selectedKlient) {
      setObjekty([]);
      setSelectedObjektId(null);
      return;
    }
    (async () => {
      try {
        const data = await getObjektyForKlientAction(selectedKlient.id);
        setObjekty(data as ObjektOption[]);
        if (data.length === 1) {
          setSelectedObjektId(data[0].id);
        }
      } catch {
        setObjekty([]);
      }
    })();
  }, [selectedKlient]);

  // Compute price estimate when params change
  useEffect(() => {
    if (typyZasahu.length === 0) {
      setCenaResult(null);
      return;
    }
    const plocha = selectedObj?.plocha_m2 || 100;
    const typObjektu = selectedObj?.typ_objektu || "gastro";

    const timer = setTimeout(async () => {
      try {
        const result = await getCenaOdhadAction({
          typ_zakazky: typZakazky,
          typy_zasahu: typyZasahu,
          skudci: selectedSkudci,
          plocha_m2: plocha,
          doprava_km: 0,
          je_prvni_navsteva: jePrvniNavsteva,
          je_vikend: [0, 6].includes(new Date(datum).getDay()),
          je_nocni: false,
          typ_objektu: typObjektu,
        });
        setCenaResult(result);
      } catch {
        setCenaResult(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [
    typyZasahu,
    selectedSkudci,
    selectedObjektId,
    objekty,
    datum,
    typZakazky,
    jePrvniNavsteva,
    selectedObj?.plocha_m2,
    selectedObj?.typ_objektu,
  ]);

  const handleCreateKlient = async () => {
    if (!newKlient.jmeno || !newKlient.telefon) return;
    try {
      const result = await quickCreateKlientAction(newKlient);
      setSelectedKlient({
        id: result.klient.id,
        nazev: null,
        jmeno: result.klient.jmeno,
        prijmeni: result.klient.prijmeni || "",
        typ: "fyzicka_osoba",
        telefon: result.klient.telefon,
        email: null,
        adresa: result.klient.adresa || null,
      });
      setShowNewKlient(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při vytváření");
    }
  };

  const handleSubmit = () => {
    if (!selectedObjektId) {
      setError("Vyberte objekt");
      return;
    }
    if (typyZasahu.length === 0) {
      setError("Vyberte typ zásahu");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await quickCreateZakazkaWithZasahAction({
          objekt_id: selectedObjektId,
          typ: typZakazky,
          typy_zasahu: typyZasahu,
          skudci: selectedSkudci,
          poznamka: poznamka || undefined,
          technik_id: technikId,
          datum,
          cas_od: casOd,
          cas_do: casDo,
        });
        onCreated();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při vytváření");
      }
    });
  };

  const formatCena = (n: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Naplánovat zásah"
      description={`${technikName} · ${formatDateCz(datum)} · ${formatTime(casOd)}–${formatTime(casDo)}`}
    >
      <div className="space-y-4">
        {/* Fixed info */}
        <div className="flex gap-3 rounded-lg bg-blue-50 p-2.5 text-xs">
          <div>
            <span className="font-medium text-blue-800">Technik:</span>{" "}
            <span className="text-blue-700">{technikName}</span>
          </div>
          <div>
            <span className="font-medium text-blue-800">Čas:</span>{" "}
            <span className="text-blue-700">
              {formatDateCz(datum)} {formatTime(casOd)}–{formatTime(casDo)}
            </span>
          </div>
        </div>

        {/* Klient search */}
        {!showNewKlient && !selectedKlient && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Klient</Label>
            <KlientSearchInput
              onSelect={setSelectedKlient}
              onCreateNew={() => setShowNewKlient(true)}
            />
          </div>
        )}

        {/* Selected klient display */}
        {selectedKlient && (
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
            <div className="text-sm">
              <span className="font-medium">
                {selectedKlient.typ === "firma"
                  ? selectedKlient.nazev
                  : `${selectedKlient.jmeno} ${selectedKlient.prijmeni}`}
              </span>
              {selectedKlient.telefon && (
                <span className="ml-2 text-muted-foreground">
                  {selectedKlient.telefon}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedKlient(null)}
              className="text-xs text-blue-600"
            >
              Změnit
            </button>
          </div>
        )}

        {/* New klient form */}
        {showNewKlient && (
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-medium">Nový klient</Label>
            <Input
              placeholder="Jméno *"
              value={newKlient.jmeno}
              onChange={(e) =>
                setNewKlient({ ...newKlient, jmeno: e.target.value })
              }
              className="min-h-[44px] text-base"
            />
            <Input
              placeholder="Telefon *"
              value={newKlient.telefon}
              onChange={(e) =>
                setNewKlient({ ...newKlient, telefon: e.target.value })
              }
              className="min-h-[44px] text-base"
            />
            <Input
              placeholder="Adresa"
              value={newKlient.adresa}
              onChange={(e) =>
                setNewKlient({ ...newKlient, adresa: e.target.value })
              }
              className="min-h-[44px] text-base"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewKlient(false)}
                className="min-h-[44px] flex-1"
              >
                Zrušit
              </Button>
              <Button
                type="button"
                onClick={handleCreateKlient}
                disabled={!newKlient.jmeno || !newKlient.telefon}
                className="min-h-[44px] flex-1 bg-blue-600 text-white"
              >
                Vytvořit
              </Button>
            </div>
          </div>
        )}

        {/* Objekt select */}
        {selectedKlient && objekty.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Objekt</Label>
            <Select
              value={selectedObjektId || "__none__"}
              onValueChange={(v) =>
                setSelectedObjektId(v === "__none__" ? null : v)
              }
            >
              <SelectTrigger className="min-h-[44px] text-base">
                <SelectValue placeholder="Vyberte objekt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>
                  Vyberte objekt
                </SelectItem>
                {objekty.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.nazev} — {o.adresa}
                    {o.plocha_m2 ? ` (${o.plocha_m2} m²)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Show object info when selected */}
            {selectedObj && (
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Typ: {selectedObj.typ_objektu}</span>
                {selectedObj.plocha_m2 && (
                  <span>· Plocha: {selectedObj.plocha_m2} m²</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Typ zakázky — jednorázová / smluvní */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Typ zakázky</Label>
          <div className="flex gap-1.5">
            {(
              [
                { value: "jednorazova", label: "Jednorázová" },
                { value: "smluvni", label: "Smluvní (monitoring)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypZakazky(opt.value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  typZakazky === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-foreground active:bg-muted/70"
                }`}
                style={{ minHeight: 44 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zavedení / Kontrola — only for smluvní */}
        {typZakazky === "smluvni" && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Typ návštěvy</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setJePrvniNavsteva(true)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  jePrvniNavsteva
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-foreground active:bg-muted/70"
                }`}
                style={{ minHeight: 44 }}
              >
                Zavedení bodů
                <span className="block text-[10px] font-normal opacity-80">
                  první návštěva — cena staniček
                </span>
              </button>
              <button
                type="button"
                onClick={() => setJePrvniNavsteva(false)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  !jePrvniNavsteva
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-foreground active:bg-muted/70"
                }`}
                style={{ minHeight: 44 }}
              >
                Kontrola
                <span className="block text-[10px] font-normal opacity-80">
                  follow-up — jen náplň
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Typ zásahu */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Typ zásahu</Label>
          <div className="flex flex-wrap gap-1.5">
            {TYP_ZASAHU_OPTIONS.map((opt) => {
              const isActive = typyZasahu.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setTypyZasahu((prev) =>
                      isActive
                        ? prev.filter((v) => v !== opt.value)
                        : [...prev, opt.value],
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-muted text-foreground active:bg-muted/70"
                  }`}
                  style={{ minHeight: 36 }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Škůdci */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Škůdci</Label>
          <SkudceMultiSelect
            skudciList={skudciList}
            selected={selectedSkudci}
            onSelectedChange={setSelectedSkudci}
          />
        </div>

        {/* Poznámka */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Poznámka</Label>
          <Input
            placeholder="Volitelná poznámka"
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Price estimate — full breakdown */}
        {cenaResult && (
          <div className="space-y-2 rounded-lg bg-green-50 p-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-green-800">
                Odhad ceny
              </span>
              <span className="text-lg font-bold text-green-900">
                {formatCena(cenaResult.cena_s_dph)}
              </span>
            </div>

            {/* Monitorovací body info — for smluvní deratizace */}
            {typZakazky === "smluvni" &&
              hasDeratizace &&
              cenaResult.pocty_bodu &&
              (cenaResult.pocty_bodu.mys > 0 ||
                cenaResult.pocty_bodu.potkan > 0 ||
                cenaResult.pocty_bodu.zivolovna_mys > 0) && (
                <div className="rounded-md bg-blue-50 p-2 text-xs">
                  <div className="mb-1 font-medium text-blue-800">
                    Kalkulačka bodů ({selectedObj?.typ_objektu || "—"},{" "}
                    {selectedObj?.plocha_m2 || 100} m²)
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-blue-700">
                    {cenaResult.pocty_bodu.mys > 0 && (
                      <span>Myš: {cenaResult.pocty_bodu.mys}×</span>
                    )}
                    {cenaResult.pocty_bodu.potkan > 0 && (
                      <span>Potkan: {cenaResult.pocty_bodu.potkan}×</span>
                    )}
                    {cenaResult.pocty_bodu.zivolovna_mys > 0 && (
                      <span>
                        Živolovná: {cenaResult.pocty_bodu.zivolovna_mys}×
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[10px] text-blue-600">
                    {jePrvniNavsteva
                      ? "Zavedení = cena staniček × počet"
                      : "Kontrola = 99 Kč/bod (náplň)"}
                  </div>
                </div>
              )}

            {/* Line items */}
            <div className="space-y-0.5 border-t border-green-200 pt-1.5">
              {cenaResult.polozky.map((p, i) => (
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
            </div>

            {/* Totals */}
            <div className="border-t border-green-200 pt-1.5">
              <div className="flex items-center justify-between text-xs text-green-700">
                <span>Základ</span>
                <span className="font-medium">
                  {formatCena(cenaResult.cena_zaklad)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-green-800">
                  Celkem s DPH ({cenaResult.dph_sazba}%)
                </span>
                <span className="text-green-900">
                  {formatCena(cenaResult.cena_s_dph)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit */}
        <Button
          className="min-h-[48px] w-full bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
          onClick={handleSubmit}
          disabled={isPending || !selectedObjektId}
        >
          {isPending ? "Vytvářím..." : "Vytvořit zakázku + zásah"}
        </Button>
      </div>
    </BottomSheet>
  );
}
