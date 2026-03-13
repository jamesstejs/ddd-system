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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technikId: string;
  technikName: string;
  datum: string;
  casOd: string;
  casDo: string;
  onCreated: () => void;
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
}: Props) {
  // State
  const [selectedKlient, setSelectedKlient] = useState<KlientResult | null>(
    null,
  );
  const [objekty, setObjekty] = useState<ObjektOption[]>([]);
  const [selectedObjektId, setSelectedObjektId] = useState<string | null>(null);
  const [typyZasahu, setTypyZasahu] = useState<string[]>([
    "vnitrni_deratizace",
  ]);
  const [skudci, setSkudci] = useState("");
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

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedKlient(null);
      setObjekty([]);
      setSelectedObjektId(null);
      setTypyZasahu(["vnitrni_deratizace"]);
      setSkudci("");
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
    const selectedObj = objekty.find((o) => o.id === selectedObjektId);
    const plocha = selectedObj?.plocha_m2 || 100;

    const timer = setTimeout(async () => {
      try {
        const result = await getCenaOdhadAction({
          typ_zakazky: "jednorazova",
          typy_zasahu: typyZasahu,
          skudci: skudci
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          plocha_m2: plocha,
          doprava_km: 0,
          je_prvni_navsteva: true,
          je_vikend: [0, 6].includes(new Date(datum).getDay()),
          je_nocni: false,
        });
        setCenaResult(result);
      } catch {
        setCenaResult(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [typyZasahu, skudci, selectedObjektId, objekty, datum]);

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
          typ: "jednorazova",
          typy_zasahu: typyZasahu,
          skudci: skudci
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
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
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Input
            placeholder="např. Potkan, Myš"
            value={skudci}
            onChange={(e) => setSkudci(e.target.value)}
            className="min-h-[44px] text-base"
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

        {/* Price estimate */}
        {cenaResult && (
          <div className="rounded-lg bg-green-50 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-800">
                Odhad ceny
              </span>
              <span className="text-lg font-bold text-green-900">
                {formatCena(cenaResult.cena_s_dph)}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-green-700">
              Základ: {formatCena(cenaResult.cena_zaklad)} + DPH{" "}
              {cenaResult.dph_sazba}%
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
