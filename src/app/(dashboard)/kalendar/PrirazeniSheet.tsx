"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { formatDatumCzLong, formatCasCz } from "@/lib/utils/dostupnostUtils";
import { odhadDelkyZasahu, formatDelka, getTechnikColor } from "@/lib/utils/zasahUtils";
import { createZasahAction } from "./actions";
import type { TechnikRow, ZakazkaOption, DostupnostRow } from "./KalendarView";

interface PrirazeniSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datum: string;
  technici: TechnikRow[];
  zakazky: ZakazkaOption[];
  dostupnostByDate: Map<string, DostupnostRow[]>;
  onDone: () => void;
}

function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function PrirazeniSheet({
  open,
  onOpenChange,
  datum,
  technici,
  zakazky,
  dostupnostByDate,
  onDone,
}: PrirazeniSheetProps) {
  const [zakazkaId, setZakazkaId] = useState("");
  const [technikId, setTechnikId] = useState("");
  const [casOd, setCasOd] = useState("08:00");
  const [casDo, setCasDo] = useState("10:00");
  const [poznamka, setPoznamka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dostupnost for selected date
  const dostupnostDen = dostupnostByDate.get(datum) || [];

  // Available technics on this day (who have availability)
  const dostupniTechnici = useMemo(() => {
    const dostupnostTechnikIds = new Set(
      dostupnostDen.map((d) => d.technik_id),
    );
    return technici.map((t) => ({
      ...t,
      jeDostupny: dostupnostTechnikIds.has(t.id),
      dostupnost: dostupnostDen.find((d) => d.technik_id === t.id),
    }));
  }, [technici, dostupnostDen, datum]);

  // Selected zakazka details
  const selectedZakazka = useMemo(
    () => zakazky.find((z) => z.id === zakazkaId) || null,
    [zakazky, zakazkaId],
  );

  // Selected technik details
  const selectedTechnik = useMemo(
    () => technici.find((t) => t.id === technikId) || null,
    [technici, technikId],
  );

  // Odhad délky
  const odhadDelky = useMemo(() => {
    if (!selectedZakazka) return null;
    const typyZasahu = Array.isArray(selectedZakazka.typy_zasahu)
      ? (selectedZakazka.typy_zasahu as string[])
      : [];
    const plochaM2 = selectedZakazka.objekty?.plocha_m2 || 0;
    const koeficient = selectedTechnik?.koeficient_rychlosti || 1.0;

    return odhadDelkyZasahu(typyZasahu, 0, plochaM2, koeficient);
  }, [selectedZakazka, selectedTechnik]);

  // Auto-fill cas_do when odhad changes
  function handleAutoFill() {
    if (odhadDelky && casOd) {
      const [h, m] = casOd.split(":").map(Number);
      const endMinutes = h * 60 + m + odhadDelky;

      if (endMinutes >= 24 * 60) {
        setError("Zásah by přesáhl konec dne (24:00). Upravte čas od.");
        return;
      }

      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      setCasDo(
        `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      );
    }
  }

  // Get klient name
  function getKlientLabel(z: ZakazkaOption): string {
    const klient = z.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  async function handleSave() {
    setError(null);

    if (!zakazkaId) {
      setError("Vyberte zakázku");
      return;
    }
    if (!technikId) {
      setError("Vyberte technika");
      return;
    }
    if (!datum) {
      setError("Datum není nastaveno");
      return;
    }
    if (casOd >= casDo) {
      setError("Čas od musí být menší než čas do");
      return;
    }

    setIsSaving(true);
    try {
      await createZasahAction({
        zakazka_id: zakazkaId,
        technik_id: technikId,
        datum,
        cas_od: casOd,
        cas_do: casDo,
        poznamka: poznamka || undefined,
        odhadovana_delka_min: odhadDelky || undefined,
      });

      // Reset form
      setZakazkaId("");
      setTechnikId("");
      setCasOd("08:00");
      setCasDo("10:00");
      setPoznamka("");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Přiřadit zásah"
      description={datum ? formatDatumCzLong(parseDateLocal(datum)) : ""}
    >
      <div className="space-y-4">
        {/* Dostupnost pro tento den */}
        {dostupnostDen.length > 0 && (
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Dostupní technici:
            </p>
            <div className="flex flex-wrap gap-1">
              {dostupnostDen.map((d) => (
                <Badge key={d.id} variant="outline" className="text-xs">
                  {d.profiles?.jmeno} {d.profiles?.prijmeni}:{" "}
                  {formatCasCz(d.cas_od.substring(0, 5))}–
                  {formatCasCz(d.cas_do.substring(0, 5))}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Zakázka */}
        <div>
          <Label htmlFor="zakazka" className="text-sm">
            Zakázka
          </Label>
          <Select value={zakazkaId} onValueChange={setZakazkaId}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Vyberte zakázku..." />
            </SelectTrigger>
            <SelectContent>
              {zakazky.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {getKlientLabel(z)} — {z.objekty?.nazev || "?"}
                  {z.objekty?.adresa ? ` (${z.objekty.adresa})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Technik */}
        <div>
          <Label htmlFor="technik" className="text-sm">
            Technik
          </Label>
          <Select value={technikId} onValueChange={setTechnikId}>
            <SelectTrigger className="mt-1 w-full">
              <SelectValue placeholder="Vyberte technika..." />
            </SelectTrigger>
            <SelectContent>
              {dostupniTechnici.map((t, i) => {
                const color = getTechnikColor(i);
                return (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-block size-2 rounded-full ${color.dot}`}
                      />
                      {t.jmeno} {t.prijmeni}
                      {t.jeDostupny ? (
                        <Badge variant="outline" className="ml-1 text-xs px-1 py-0 text-green-700">
                          dostupný
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-1 text-xs px-1 py-0 text-red-500">
                          bez směny
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Časy */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cas_od_zasah" className="text-sm">
              Čas od
            </Label>
            <Input
              id="cas_od_zasah"
              type="time"
              value={casOd}
              onChange={(e) => setCasOd(e.target.value)}
              className="mt-1 text-base"
            />
          </div>
          <div>
            <Label htmlFor="cas_do_zasah" className="text-sm">
              Čas do
            </Label>
            <Input
              id="cas_do_zasah"
              type="time"
              value={casDo}
              onChange={(e) => setCasDo(e.target.value)}
              className="mt-1 text-base"
            />
          </div>
        </div>

        {/* Odhad délky */}
        {odhadDelky && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 p-2">
            <span className="text-sm text-blue-800">
              Odhad: <strong>{formatDelka(odhadDelky)}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] text-sm"
              onClick={handleAutoFill}
            >
              Nastavit čas do
            </Button>
          </div>
        )}

        {/* Poznámka */}
        <div>
          <Label htmlFor="poznamka_zasah" className="text-sm">
            Poznámka
          </Label>
          <Textarea
            id="poznamka_zasah"
            value={poznamka}
            onChange={(e) => setPoznamka(e.target.value)}
            placeholder="Volitelná poznámka..."
            className="mt-1 text-base"
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-h-[44px] w-full"
        >
          {isSaving ? "Ukládám..." : "Přiřadit zásah"}
        </Button>
      </div>
    </BottomSheet>
  );
}
