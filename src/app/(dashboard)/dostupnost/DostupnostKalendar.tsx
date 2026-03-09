"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BottomSheet } from "@/components/layout/BottomSheet";
import {
  generateDateRange,
  groupByWeeks,
  isWorkDay,
  formatDatumCz,
  formatDatumCzLong,
  formatCasCz,
} from "@/lib/utils/dostupnostUtils";
import {
  saveDostupnostAction,
  updateDostupnostAction,
  deleteDostupnostAction,
} from "./actions";

type DostupnostRow = {
  id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  poznamka: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

interface DostupnostKalendarProps {
  dostupnost: DostupnostRow[];
  datumOd: string;
  datumDo: string;
  filledDays: number;
  totalWorkDays: number;
  status: "ok" | "warning" | "critical";
}

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

export function DostupnostKalendar({
  dostupnost,
  datumOd,
  datumDo,
  filledDays,
  totalWorkDays,
  status,
}: DostupnostKalendarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // BottomSheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingSlot, setEditingSlot] = useState<DostupnostRow | null>(null);

  // Formulář
  const [casOd, setCasOd] = useState("08:00");
  const [casDo, setCasDo] = useState("16:00");
  const [poznamka, setPoznamka] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Vytvoř datumy z stringu
  const od = parseDateLocal(datumOd);
  const doDate = parseDateLocal(datumDo);
  const dates = generateDateRange(od, doDate);
  const weeks = groupByWeeks(dates);

  // Mapa dostupnosti per datum
  const dostupnostMap = new Map<string, DostupnostRow[]>();
  for (const d of dostupnost) {
    const key = d.datum;
    if (!dostupnostMap.has(key)) dostupnostMap.set(key, []);
    dostupnostMap.get(key)!.push(d);
  }

  // Klik na den
  function handleDayClick(date: Date) {
    if (!isWorkDay(date)) return;

    const dateStr = toDateString(date);
    const existing = dostupnostMap.get(dateStr);

    if (existing && existing.length > 0) {
      // Edit mód — zobrazí první slot
      setSheetMode("edit");
      setEditingSlot(existing[0]);
      setSelectedDate(dateStr);
      setCasOd(existing[0].cas_od.substring(0, 5));
      setCasDo(existing[0].cas_do.substring(0, 5));
      setPoznamka(existing[0].poznamka || "");
    } else {
      // Add mód
      setSheetMode("add");
      setEditingSlot(null);
      setSelectedDate(dateStr);
      setCasOd("08:00");
      setCasDo("16:00");
      setPoznamka("");
    }
    setError(null);
    setSheetOpen(true);
  }

  // Uložit
  async function handleSave() {
    setError(null);
    setIsSaving(true);
    try {
      if (sheetMode === "add") {
        await saveDostupnostAction({
          datum: selectedDate,
          cas_od: casOd,
          cas_do: casDo,
          poznamka: poznamka || undefined,
        });
      } else if (editingSlot) {
        await updateDostupnostAction(editingSlot.id, {
          cas_od: casOd,
          cas_do: casDo,
          poznamka: poznamka || null,
        });
      }
      setSheetOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setIsSaving(false);
    }
  }

  // Smazat
  async function handleDelete() {
    if (!editingSlot) return;
    setError(null);
    setIsSaving(true);
    try {
      await deleteDostupnostAction(editingSlot.id);
      setSheetOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při mazání");
    } finally {
      setIsSaving(false);
    }
  }

  const statusBadge = {
    ok: { label: "Vyplněno", className: "bg-green-100 text-green-800" },
    warning: { label: "Částečně", className: "bg-yellow-100 text-yellow-800" },
    critical: { label: "Chybí", className: "bg-red-100 text-red-800" },
  };

  const badgeInfo = statusBadge[status];

  return (
    <div className="space-y-4">
      {/* Statistika */}
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Vyplněno{" "}
              <span className="font-bold text-foreground">
                {filledDays} z {totalWorkDays}
              </span>{" "}
              pracovních dní
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Období {formatDatumCz(od)} – {formatDatumCz(doDate)}
            </p>
          </div>
          <Badge className={badgeInfo.className}>{badgeInfo.label}</Badge>
        </CardContent>
      </Card>

      {/* Kalendář */}
      {weeks.map((week, weekIdx) => {
        // Zjistit měsíc(e) v tomto týdnu pro label
        const weekMonthLabel = getWeekMonthLabel(week, weekIdx === 0);

        return (
        <Card key={weekIdx}>
          <CardContent className="p-3">
            {/* Měsíční label pokud je začátek nového měsíce */}
            {weekMonthLabel && (
              <p className="mb-2 text-sm font-semibold text-foreground">
                {weekMonthLabel}
              </p>
            )}
            {/* Hlavička dnů */}
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {DAY_NAMES.map((name) => (
                <div key={name} className="font-medium">
                  {name}
                </div>
              ))}
            </div>

            {/* Dny */}
            <div className="grid grid-cols-7 gap-1">
              {week.map((date, dayIdx) => {
                if (!date) {
                  return <div key={dayIdx} className="min-h-[52px]" />;
                }

                const dateStr = toDateString(date);
                const slots = dostupnostMap.get(dateStr) || [];
                const workDay = isWorkDay(date);
                const hasDostupnost = slots.length > 0;

                return (
                  <button
                    key={dayIdx}
                    disabled={!workDay}
                    onClick={() => handleDayClick(date)}
                    className={`flex min-h-[52px] min-w-[44px] flex-col items-center justify-center rounded-lg p-1 text-xs transition-colors ${
                      !workDay
                        ? "cursor-default bg-muted/30 text-muted-foreground/50"
                        : hasDostupnost
                          ? "bg-green-100 text-green-800 hover:bg-green-200 active:bg-green-300"
                          : "bg-orange-50 text-orange-700 hover:bg-orange-100 active:bg-orange-200"
                    }`}
                  >
                    <span className="font-semibold">{date.getDate()}</span>
                    {workDay && hasDostupnost && (
                      <span className="mt-0.5 text-xs leading-tight">
                        {formatCasCz(slots[0].cas_od.substring(0, 5))}–
                        {formatCasCz(slots[0].cas_do.substring(0, 5))}
                      </span>
                    )}
                    {workDay && !hasDostupnost && (
                      <span className="mt-0.5 text-xs leading-tight opacity-60">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        );
      })}

      {/* BottomSheet formulář */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={
          sheetMode === "add"
            ? "Přidat dostupnost"
            : "Upravit dostupnost"
        }
        description={
          selectedDate
            ? formatDatumCzLong(parseDateLocal(selectedDate))
            : ""
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cas_od" className="text-sm">
                Čas od
              </Label>
              <Input
                id="cas_od"
                type="time"
                value={casOd}
                onChange={(e) => setCasOd(e.target.value)}
                className="mt-1 text-base"
              />
            </div>
            <div>
              <Label htmlFor="cas_do" className="text-sm">
                Čas do
              </Label>
              <Input
                id="cas_do"
                type="time"
                value={casDo}
                onChange={(e) => setCasDo(e.target.value)}
                className="mt-1 text-base"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="poznamka" className="text-sm">
              Poznámka
            </Label>
            <Textarea
              id="poznamka"
              value={poznamka}
              onChange={(e) => setPoznamka(e.target.value)}
              placeholder="Volitelná poznámka..."
              className="mt-1 text-base"
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || isPending}
              className="min-h-[44px] flex-1"
            >
              {isSaving || isPending
                ? "Ukládám..."
                : sheetMode === "add"
                  ? "Uložit"
                  : "Aktualizovat"}
            </Button>

            {sheetMode === "edit" && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || isPending}
                className="min-h-[44px]"
              >
                {isSaving ? "Mažu..." : "Smazat"}
              </Button>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

/** Vrátí label měsíce pro týden (zobrazí se u prvního týdne a při změně měsíce) */
function getWeekMonthLabel(
  week: (Date | null)[],
  isFirst: boolean,
): string | null {
  const dates = week.filter((d): d is Date => d !== null);
  if (dates.length === 0) return null;

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  // První týden vždy ukáže měsíc
  if (isFirst) {
    if (firstDate.getMonth() !== lastDate.getMonth()) {
      return `${MONTH_NAMES[firstDate.getMonth()]} / ${MONTH_NAMES[lastDate.getMonth()]} ${lastDate.getFullYear()}`;
    }
    return `${MONTH_NAMES[firstDate.getMonth()]} ${firstDate.getFullYear()}`;
  }

  // Další týdny: ukáže label jen pokud obsahuje 1. den měsíce
  const hasFirstOfMonth = dates.some((d) => d.getDate() === 1);
  if (hasFirstOfMonth) {
    const newMonthDate = dates.find((d) => d.getDate() === 1)!;
    return `${MONTH_NAMES[newMonthDate.getMonth()]} ${newMonthDate.getFullYear()}`;
  }

  return null;
}

/** Parse "YYYY-MM-DD" jako lokální datum (bez UTC shift) */
function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date → "YYYY-MM-DD" */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
