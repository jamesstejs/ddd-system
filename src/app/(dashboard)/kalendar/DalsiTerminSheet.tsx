"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { formatDatumCzLong } from "@/lib/utils/dostupnostUtils";
import {
  computeSuggestedDate,
  odhadDelkyZasahu,
  formatDelka,
} from "@/lib/utils/zasahUtils";
import { toDateString } from "@/lib/utils/dateUtils";
import {
  createDalsiTerminAction,
  skipDalsiTerminAction,
} from "./technikActions";
import type { TechnikZasahRow } from "./MujDenView";

interface DalsiTerminSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zasah: TechnikZasahRow | null;
  onScheduled: () => void;
  onSkipped: () => void;
}

function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toDateString(d);
}

export function DalsiTerminSheet({
  open,
  onOpenChange,
  zasah,
  onScheduled,
  onSkipped,
}: DalsiTerminSheetProps) {
  const [datum, setDatum] = useState("");
  const [casOd, setCasOd] = useState("08:00");
  const [casDo, setCasDo] = useState("10:00");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute suggested date from cetnost_dny
  const suggestedDate = useMemo(() => {
    if (!zasah?.zakazky?.cetnost_dny || !zasah.datum) return null;
    return computeSuggestedDate(zasah.datum, zasah.zakazky.cetnost_dny);
  }, [zasah]);

  // Compute estimated duration
  const odhadDelky = useMemo(() => {
    if (!zasah?.zakazky) return null;
    const typyZasahu = Array.isArray(zasah.zakazky.typy_zasahu)
      ? (zasah.zakazky.typy_zasahu as string[])
      : [];
    const plochaM2 = zasah.zakazky.objekty?.plocha_m2 || 0;
    return odhadDelkyZasahu(typyZasahu, 0, plochaM2, 1.0);
  }, [zasah]);

  // Reset form on open
  useEffect(() => {
    if (open && zasah) {
      const tomorrow = getTomorrow();
      const suggested = suggestedDate || tomorrow;
      // Use suggested date, but ensure it's not in the past
      setDatum(suggested >= tomorrow ? suggested : tomorrow);
      setCasOd("08:00");
      // Auto-fill cas_do based on estimate
      if (odhadDelky) {
        const endMinutes = 8 * 60 + odhadDelky;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        setCasDo(
          `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        );
      } else {
        setCasDo("10:00");
      }
      setError(null);
    }
  }, [open, zasah, suggestedDate, odhadDelky]);

  if (!zasah) return null;

  function getKlientName(): string {
    const klient = zasah?.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  function getObjektNazev(): string {
    return zasah?.zakazky?.objekty?.nazev || "—";
  }

  // Auto-fill cas_do when casOd changes — accepts the NEW value directly
  // to avoid stale state closure issues (React setState is async)
  function handleAutoFillCasDo(newCasOd: string) {
    if (odhadDelky && newCasOd) {
      const [h, m] = newCasOd.split(":").map(Number);
      const endMinutes = h * 60 + m + odhadDelky;
      if (endMinutes < 24 * 60) {
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        setCasDo(
          `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        );
      }
    }
  }

  async function handleSchedule() {
    if (!zasah?.zakazky) return;
    setError(null);

    if (!datum) {
      setError("Vyplňte datum");
      return;
    }
    if (!casOd || !casDo) {
      setError("Vyplňte čas od a do");
      return;
    }
    if (casOd >= casDo) {
      setError("Čas od musí být menší než čas do");
      return;
    }

    setIsPending(true);
    try {
      await createDalsiTerminAction({
        zasahId: zasah.id,
        zakazkaId: zasah.zakazky.id,
        datum,
        casOd,
        casDo,
      });
      onScheduled();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při vytváření termínu");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSkip() {
    if (!zasah?.zakazky) return;
    setError(null);
    setIsPending(true);
    try {
      await skipDalsiTerminAction({
        zasahId: zasah.id,
        zakazkaId: zasah.zakazky.id,
      });
      onSkipped();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při přeskočení");
    } finally {
      setIsPending(false);
    }
  }

  const isSmlouva = zasah.zakazky?.typ === "smluvni";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Další termín — ${getKlientName()}`}
      description={`Zásah pro ${getObjektNazev()} dokončen.`}
    >
      <div className="space-y-4">
        {/* Suggested date info */}
        {suggestedDate && isSmlouva && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs text-green-700">Doporučený termín</p>
            <p className="text-sm font-semibold text-green-800">
              {formatDatumCzLong(parseDateLocal(suggestedDate))}
            </p>
            <p className="text-xs text-green-600">
              (četnost: {zasah.zakazky?.cetnost_dny} dní)
            </p>
          </div>
        )}

        {/* Duration estimate */}
        {odhadDelky && (
          <p className="text-xs text-muted-foreground">
            Odhadovaná délka: {formatDelka(odhadDelky)}
          </p>
        )}

        {/* Date input */}
        <div>
          <Label htmlFor="dalsi-datum" className="text-sm">
            Datum
          </Label>
          <Input
            id="dalsi-datum"
            type="date"
            value={datum}
            min={getTomorrow()}
            onChange={(e) => setDatum(e.target.value)}
            className="mt-1 min-h-[44px] text-base"
          />
        </div>

        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dalsi-cas-od" className="text-sm">
              Čas od
            </Label>
            <Input
              id="dalsi-cas-od"
              type="time"
              value={casOd}
              onChange={(e) => {
                const newVal = e.target.value;
                setCasOd(newVal);
                handleAutoFillCasDo(newVal);
              }}
              className="mt-1 min-h-[44px] text-base"
            />
          </div>
          <div>
            <Label htmlFor="dalsi-cas-do" className="text-sm">
              Čas do
            </Label>
            <Input
              id="dalsi-cas-do"
              type="time"
              value={casDo}
              onChange={(e) => setCasDo(e.target.value)}
              className="mt-1 min-h-[44px] text-base"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <Button
            className="min-h-[44px] w-full bg-green-600 text-white hover:bg-green-700"
            disabled={isPending}
            onClick={handleSchedule}
          >
            {isPending ? "Ukládám..." : "Naplánovat další termín"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-muted-foreground/20" />
            <span className="text-xs text-muted-foreground">nebo</span>
            <div className="h-px flex-1 bg-muted-foreground/20" />
          </div>

          <Button
            variant="outline"
            className="min-h-[44px] w-full"
            disabled={isPending}
            onClick={handleSkip}
          >
            Přeskočit (připomene admin)
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
