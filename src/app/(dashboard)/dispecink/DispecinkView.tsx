"use client";

import { useState, useCallback, useTransition } from "react";
import { POBOCKY, type Pobocka } from "@/types/pobocky";
import { RegionTabs } from "./RegionTabs";
import { WeekNavigator } from "./WeekNavigator";
import { TechnikWeekGrid } from "./TechnikWeekGrid";
import { CenaOdhadPanel } from "./CenaOdhadPanel";
import { DispecinkScheduleSheet } from "./DispecinkScheduleSheet";
import { getDispecinkDataAction } from "./actions";
import type { DispecinkData } from "./types";

type SkudceItem = {
  id: string;
  nazev: string;
  typ: string;
};

type Props = {
  initialData: DispecinkData;
  initialPobocka: Pobocka;
  initialWeekStart: string;
  skudciList: SkudceItem[];
};

/** Get Monday of the current week */
function getCurrentMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export function DispecinkView({
  initialData,
  initialPobocka,
  initialWeekStart,
  skudciList,
}: Props) {
  const [pobocka, setPobocka] = useState<Pobocka>(initialPobocka);
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [data, setData] = useState<DispecinkData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [cenaPanelExpanded, setCenaPanelExpanded] = useState(false);

  // Schedule sheet state
  const [scheduleSheet, setScheduleSheet] = useState<{
    open: boolean;
    technikId: string;
    technikName: string;
    datum: string;
    casOd: string;
    casDo: string;
  }>({
    open: false,
    technikId: "",
    technikName: "",
    datum: "",
    casOd: "",
    casDo: "",
  });

  const reload = useCallback(
    (newPobocka: Pobocka, newWeekStart: string) => {
      startTransition(async () => {
        try {
          const result = await getDispecinkDataAction(
            newPobocka,
            newWeekStart,
          );
          setData(result);
        } catch {
          // Keep current data on error
        }
      });
    },
    [],
  );

  const handlePobockaChange = (newPobocka: Pobocka) => {
    setPobocka(newPobocka);
    reload(newPobocka, weekStart);
  };

  const handleWeekChange = (newWeekStart: string) => {
    setWeekStart(newWeekStart);
    reload(pobocka, newWeekStart);
  };

  const handleSlotTap = (
    technikId: string,
    technikName: string,
    datum: string,
    casOd: string,
    casDo: string,
  ) => {
    setScheduleSheet({
      open: true,
      technikId,
      technikName,
      datum,
      casOd,
      casDo,
    });
  };

  const handleCreated = () => {
    // Reload data after creating a zasah
    reload(pobocka, weekStart);
  };

  return (
    <div className="flex flex-col gap-3 pb-24">
      {/* Region tabs */}
      <RegionTabs value={pobocka} onChange={handlePobockaChange} />

      {/* Week navigator */}
      <WeekNavigator weekStart={weekStart} onChange={handleWeekChange} />

      {/* Price estimate panel (collapsible on mobile) */}
      <CenaOdhadPanel
        expanded={cenaPanelExpanded}
        onToggle={() => setCenaPanelExpanded(!cenaPanelExpanded)}
      />

      {/* Loading indicator */}
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Načítám...
        </div>
      )}

      {/* Technik week grid */}
      <TechnikWeekGrid
        technici={data.technici}
        dostupnost={data.dostupnost}
        zasahy={data.zasahy}
        weekStart={weekStart}
        onSlotTap={handleSlotTap}
      />

      {/* Schedule sheet */}
      <DispecinkScheduleSheet
        open={scheduleSheet.open}
        onOpenChange={(open) =>
          setScheduleSheet((s) => ({ ...s, open }))
        }
        technikId={scheduleSheet.technikId}
        technikName={scheduleSheet.technikName}
        datum={scheduleSheet.datum}
        casOd={scheduleSheet.casOd}
        casDo={scheduleSheet.casDo}
        onCreated={handleCreated}
        skudciList={skudciList}
      />
    </div>
  );
}
