"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/layout/BottomSheet";
import {
  getDostupnostForTechnikAction,
  createDostupnostAction,
  deleteDostupnostAction,
  bulkCreateDostupnostAction,
} from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import { Trash2, Plus, Copy } from "lucide-react";

type Profile = Tables<"profiles">;
type DostupnostRow = {
  id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  poznamka: string | null;
};

const DAY_NAMES = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const WEEKDAY_NAMES_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technik: Profile;
};

export function DostupnostSheet({ open, onOpenChange, technik }: Props) {
  const [isPending, startTransition] = useTransition();
  const [dostupnost, setDostupnost] = useState<DostupnostRow[]>([]);
  const [showAddSlot, setShowAddSlot] = useState<string | null>(null); // datum
  const [showBulk, setShowBulk] = useState(false);
  const [newCasOd, setNewCasOd] = useState("08:00");
  const [newCasDo, setNewCasDo] = useState("16:00");

  // Bulk pattern state
  const [bulkDays, setBulkDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [bulkCasOd, setBulkCasOd] = useState("08:00");
  const [bulkCasDo, setBulkCasDo] = useState("16:00");
  const [bulkWeeks, setBulkWeeks] = useState(2);

  // Compute 4-week range from current Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + mondayOffset);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 27); // 4 weeks

  const datumOd = startDate.toISOString().split("T")[0];
  const datumDo = endDate.toISOString().split("T")[0];

  const loadDostupnost = useCallback(async () => {
    try {
      const data = await getDostupnostForTechnikAction(
        technik.id,
        datumOd,
        datumDo,
      );
      setDostupnost(data as DostupnostRow[]);
    } catch {
      // ignore
    }
  }, [technik.id, datumOd, datumDo]);

  useEffect(() => {
    if (open) loadDostupnost();
  }, [open, loadDostupnost]);

  // Generate days array
  const days: { date: string; label: string; dayName: string; isToday: boolean }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      label: `${d.getDate()}.${d.getMonth() + 1}.`,
      dayName: DAY_NAMES[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }

  // Group by weeks
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const getSlotsForDate = (date: string) =>
    dostupnost.filter((d) => d.datum === date);

  // Capacity calculation
  const totalHours = dostupnost.reduce((sum, d) => {
    const [hOd, mOd] = d.cas_od.split(":").map(Number);
    const [hDo, mDo] = d.cas_do.split(":").map(Number);
    return sum + (hDo + mDo / 60) - (hOd + mOd / 60);
  }, 0);
  const totalDays = new Set(dostupnost.map((d) => d.datum)).size;
  // Weekly averages (over 4 weeks)
  const avgHoursPerWeek = totalHours / 4;
  const avgDaysPerWeek = totalDays / 4;

  const reqHours = technik.pozadovane_hodiny_tyden;
  const reqDays = technik.pozadovane_dny_tyden;

  function handleAddSlot(datum: string) {
    startTransition(async () => {
      await createDostupnostAction(technik.id, datum, newCasOd, newCasDo);
      await loadDostupnost();
      setShowAddSlot(null);
    });
  }

  function handleDeleteSlot(slotId: string) {
    startTransition(async () => {
      await deleteDostupnostAction(slotId);
      await loadDostupnost();
    });
  }

  function handleBulkCreate() {
    const slots: { datum: string; cas_od: string; cas_do: string }[] = [];

    for (let w = 0; w < bulkWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        if (!bulkDays[d]) continue;
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const dateStr = date.toISOString().split("T")[0];

        // Skip if slot already exists
        const existing = getSlotsForDate(dateStr);
        if (existing.some((s) => s.cas_od === bulkCasOd && s.cas_do === bulkCasDo)) continue;

        slots.push({ datum: dateStr, cas_od: bulkCasOd, cas_do: bulkCasDo });
      }
    }

    if (slots.length === 0) return;

    startTransition(async () => {
      await bulkCreateDostupnostAction(technik.id, slots);
      await loadDostupnost();
      setShowBulk(false);
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Směny — ${technik.jmeno} ${technik.prijmeni}`}
      description="Správa dostupnosti technika"
    >
      <div className="space-y-4">
        {/* Capacity summary */}
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Kapacita (průměr za 4 týdny)
          </p>
          <div className="flex gap-4">
            <div>
              <span className="text-lg font-bold">
                {avgHoursPerWeek.toFixed(1)}h
              </span>
              {reqHours ? (
                <span className={`text-xs ml-1 ${avgHoursPerWeek >= reqHours ? "text-green-600" : "text-red-600"}`}>
                  / {reqHours}h
                </span>
              ) : (
                <span className="text-xs ml-1 text-muted-foreground">/týden</span>
              )}
            </div>
            <div>
              <span className="text-lg font-bold">
                {avgDaysPerWeek.toFixed(1)}
              </span>
              <span className="text-xs ml-1">
                {reqDays ? (
                  <span className={avgDaysPerWeek >= reqDays ? "text-green-600" : "text-red-600"}>
                    / {reqDays} dnů
                  </span>
                ) : (
                  <span className="text-muted-foreground">dnů/týden</span>
                )}
              </span>
            </div>
          </div>
          {reqHours && (
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  avgHoursPerWeek >= reqHours
                    ? "bg-green-500"
                    : avgHoursPerWeek >= reqHours * 0.5
                      ? "bg-amber-500"
                      : "bg-red-500"
                }`}
                style={{
                  width: `${Math.min(100, (avgHoursPerWeek / reqHours) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Bulk pattern button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full min-h-[44px] gap-2"
          onClick={() => setShowBulk(!showBulk)}
        >
          <Copy className="size-4" />
          Přidat týdenní vzor
        </Button>

        {/* Bulk pattern form */}
        {showBulk && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-3">
            <p className="text-xs font-medium text-blue-800">Týdenní vzor</p>
            <div className="flex flex-wrap gap-1">
              {WEEKDAY_NAMES_SHORT.map((name, i) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    const next = [...bulkDays];
                    next[i] = !next[i];
                    setBulkDays(next);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium min-h-[36px] ${
                    bulkDays[i]
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Od</Label>
                <Input
                  type="time"
                  value={bulkCasOd}
                  onChange={(e) => setBulkCasOd(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Do</Label>
                <Input
                  type="time"
                  value={bulkCasDo}
                  onChange={(e) => setBulkCasDo(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="w-20">
                <Label className="text-xs">Týdnů</Label>
                <Input
                  type="number"
                  min={1}
                  max={4}
                  value={bulkWeeks}
                  onChange={(e) => setBulkWeeks(parseInt(e.target.value) || 1)}
                  className="bg-white"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full min-h-[44px]"
              onClick={handleBulkCreate}
              disabled={isPending}
            >
              {isPending ? "Vytvářím..." : `Aplikovat na ${bulkWeeks} týdn${bulkWeeks === 1 ? "e" : "ů"}`}
            </Button>
          </div>
        )}

        {/* Weekly calendar */}
        <div className="space-y-4">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Týden {weekIdx + 1} ({week[0].label} – {week[6].label})
              </p>
              <div className="space-y-1">
                {week.map((day) => {
                  const slots = getSlotsForDate(day.date);
                  const isWeekend = day.dayName === "So" || day.dayName === "Ne";
                  return (
                    <div
                      key={day.date}
                      className={`rounded-lg border px-3 py-2 ${
                        day.isToday
                          ? "border-blue-400 bg-blue-50"
                          : isWeekend
                            ? "bg-muted/30"
                            : "bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-medium ${
                            isWeekend ? "text-muted-foreground" : ""
                          }`}
                        >
                          {day.dayName} {day.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSlot(
                              showAddSlot === day.date ? null : day.date,
                            );
                            setNewCasOd("08:00");
                            setNewCasDo("16:00");
                          }}
                          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      {/* Existing slots */}
                      {slots.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {slots.map((slot) => (
                            <Badge
                              key={slot.id}
                              variant="secondary"
                              className="gap-1 text-xs"
                            >
                              {slot.cas_od.slice(0, 5)}–{slot.cas_do.slice(0, 5)}
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="ml-0.5 text-muted-foreground hover:text-destructive"
                                disabled={isPending}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Add slot inline form */}
                      {showAddSlot === day.date && (
                        <div className="mt-2 flex items-end gap-2">
                          <div className="flex-1">
                            <Input
                              type="time"
                              value={newCasOd}
                              onChange={(e) => setNewCasOd(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <span className="pb-2 text-sm">–</span>
                          <div className="flex-1">
                            <Input
                              type="time"
                              value={newCasDo}
                              onChange={(e) => setNewCasDo(e.target.value)}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            className="min-h-[40px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddSlot(day.date);
                            }}
                            disabled={isPending}
                          >
                            {isPending ? "..." : "Přidat"}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
