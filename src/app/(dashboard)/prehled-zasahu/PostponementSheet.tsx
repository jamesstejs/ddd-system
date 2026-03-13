"use client";

import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postponeZasahAction } from "./actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zasahId: string;
  klientName: string;
  objektNazev: string;
  currentDatum: string;
  onPostponed: () => void;
};

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

const QUICK_OPTIONS = [
  { label: "+1 týden", fn: (d: string) => addDays(d, 7) },
  { label: "+2 týdny", fn: (d: string) => addDays(d, 14) },
  { label: "+1 měsíc", fn: (d: string) => addMonths(d, 1) },
];

export function PostponementSheet({
  open,
  onOpenChange,
  zasahId,
  klientName,
  objektNazev,
  currentDatum,
  onPostponed,
}: Props) {
  const [selectedDate, setSelectedDate] = useState("");
  const [duvod, setDuvod] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset on open
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setSelectedDate("");
      setDuvod("");
      setError(null);
    }
    onOpenChange(v);
  };

  const handleQuickSelect = (fn: (d: string) => string) => {
    // Use today as base for quick options (since the zasah is overdue)
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(fn(today));
    setError(null);
  };

  const handleSubmit = () => {
    if (!selectedDate) {
      setError("Vyberte nový datum");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (selectedDate <= today) {
      setError("Datum musí být v budoucnosti");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await postponeZasahAction(
          zasahId,
          selectedDate,
          duvod || null,
        );
        onPostponed();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Chyba při posunutí",
        );
      }
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Posunout termín"
      description={`${klientName} · ${objektNazev}`}
    >
      <div className="space-y-4">
        {/* Current info */}
        <div className="rounded-lg bg-blue-50 p-2.5 text-sm">
          <span className="font-medium text-blue-800">Aktuální datum: </span>
          <span className="text-blue-700">
            {currentDatum
              ? new Date(currentDatum).toLocaleDateString("cs-CZ")
              : "—"}
          </span>
        </div>

        {/* Quick shortcuts */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Rychlá volba</Label>
          <div className="flex gap-2">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleQuickSelect(opt.fn)}
                className={`min-h-[44px] flex-1 rounded-lg px-3 text-sm font-medium transition-all ${
                  selectedDate === opt.fn(new Date().toISOString().split("T")[0])
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-foreground active:bg-muted/70"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Vlastní datum</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setError(null);
            }}
            min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
            className="min-h-[44px] text-base"
          />
          {selectedDate && (
            <p className="text-sm font-medium text-green-700">
              Nový termín:{" "}
              {new Date(selectedDate).toLocaleDateString("cs-CZ")}
            </p>
          )}
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Důvod <span className="text-muted-foreground">(volitelné)</span>
          </Label>
          <Input
            placeholder="Např. Na žádost klienta"
            value={duvod}
            onChange={(e) => setDuvod(e.target.value)}
            className="min-h-[44px] text-base"
          />
        </div>

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
          disabled={isPending || !selectedDate}
        >
          {isPending ? "Posunuji..." : "Posunout termín"}
        </Button>
      </div>
    </BottomSheet>
  );
}
