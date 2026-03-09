"use client";

import { useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toDateString } from "@/lib/utils/dateUtils";
import {
  formatDatumCz,
  formatDatumCzLong,
  formatCasCz,
} from "@/lib/utils/dostupnostUtils";
import {
  STATUS_ZASAHU_LABELS,
  getTechnikColor,
  formatDelka,
} from "@/lib/utils/zasahUtils";
import { PrirazeniSheet } from "./PrirazeniSheet";
import { ZasahDetailSheet } from "./ZasahDetailSheet";

// ---------- Types ----------

export type ZasahRow = {
  id: string;
  zakazka_id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  status: string;
  odhadovana_delka_min: number | null;
  poznamka: string | null;
  profiles: {
    id: string;
    jmeno: string;
    prijmeni: string;
    email: string;
    koeficient_rychlosti: number;
  } | null;
  zakazky: {
    id: string;
    typ: string;
    status: string;
    typy_zasahu: unknown;
    skudci: unknown;
    poznamka: string | null;
    objekty: {
      id: string;
      nazev: string;
      adresa: string;
      plocha_m2: number | null;
      typ_objektu: string;
      klient_id: string;
      klienti: {
        id: string;
        nazev: string;
        jmeno: string;
        prijmeni: string;
        typ: string;
        telefon: string | null;
        email: string | null;
      };
    };
  } | null;
};

export type DostupnostRow = {
  id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  poznamka: string | null;
  profiles: {
    jmeno: string;
    prijmeni: string;
  } | null;
};

export type TechnikRow = {
  id: string;
  jmeno: string;
  prijmeni: string;
  email: string;
  koeficient_rychlosti: number;
  role: string[];
};

export type ZakazkaOption = {
  id: string;
  typ: string;
  status: string;
  typy_zasahu: unknown;
  skudci: unknown;
  poznamka: string | null;
  objekty: {
    id: string;
    nazev: string;
    adresa: string;
    plocha_m2: number | null;
    typ_objektu: string;
    klient_id: string;
    klienti: {
      id: string;
      nazev: string;
      jmeno: string;
      prijmeni: string;
      typ: string;
      ico: string | null;
    };
  };
};

type ViewMode = "month" | "week" | "day";

interface KalendarViewProps {
  initialZasahy: ZasahRow[];
  initialDostupnost: DostupnostRow[];
  technici: TechnikRow[];
  zakazky: ZakazkaOption[];
  initialDate: string;
}

// ---------- Helpers ----------

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const MONTH_NAMES = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];

function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getMonthDates(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dates: Date[] = [];

  // Pad start to Monday
  const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  for (let i = startPad; i > 0; i--) {
    dates.push(addDays(firstDay, -i));
  }

  // Days of month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    dates.push(new Date(year, month, d));
  }

  // Pad end to Sunday
  while (dates.length % 7 !== 0) {
    dates.push(addDays(lastDay, dates.length - (startPad + lastDay.getDate()) + 1));
  }

  return dates;
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// ---------- Component ----------

export function KalendarView({
  initialZasahy,
  initialDostupnost,
  technici,
  zakazky,
  initialDate,
}: KalendarViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() =>
    parseDateLocal(initialDate),
  );
  const [selectedTechnikFilter, setSelectedTechnikFilter] = useState<
    string | null
  >(null);

  // Sheets
  const [prirazeniOpen, setPrirazeniOpen] = useState(false);
  const [prirazeniDate, setPrirazeniDate] = useState<string>("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailZasah, setDetailZasah] = useState<ZasahRow | null>(null);

  // Technik → color index mapping
  const technikColorMap = useMemo(() => {
    const map = new Map<string, number>();
    technici.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [technici]);

  // Create maps for easy lookup
  const zasahyByDate = useMemo(() => {
    const map = new Map<string, ZasahRow[]>();
    for (const z of initialZasahy) {
      const key = z.datum;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(z);
    }
    return map;
  }, [initialZasahy]);

  const dostupnostByDate = useMemo(() => {
    const map = new Map<string, DostupnostRow[]>();
    for (const d of initialDostupnost) {
      const key = d.datum;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [initialDostupnost]);

  // Filtered zasahy
  const filteredZasahyByDate = useMemo(() => {
    if (!selectedTechnikFilter) return zasahyByDate;
    const map = new Map<string, ZasahRow[]>();
    for (const [key, zasahy] of zasahyByDate.entries()) {
      const filtered = zasahy.filter(
        (z) => z.technik_id === selectedTechnikFilter,
      );
      if (filtered.length > 0) map.set(key, filtered);
    }
    return map;
  }, [zasahyByDate, selectedTechnikFilter]);

  // Navigation
  const navigate = useCallback(
    (direction: number) => {
      const newDate = new Date(currentDate);
      if (viewMode === "month") {
        newDate.setMonth(newDate.getMonth() + direction);
      } else if (viewMode === "week") {
        newDate.setDate(newDate.getDate() + direction * 7);
      } else {
        newDate.setDate(newDate.getDate() + direction);
      }
      setCurrentDate(newDate);
    },
    [currentDate, viewMode],
  );

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Date label
  const dateLabel = useMemo(() => {
    if (viewMode === "month") {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === "week") {
      const monday = getMonday(currentDate);
      const sunday = addDays(monday, 6);
      if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.getDate()}.–${sunday.getDate()}. ${MONTH_NAMES[monday.getMonth()]} ${monday.getFullYear()}`;
      }
      return `${monday.getDate()}. ${MONTH_NAMES[monday.getMonth()].substring(0, 3)}–${sunday.getDate()}. ${MONTH_NAMES[sunday.getMonth()].substring(0, 3)} ${sunday.getFullYear()}`;
    }
    return formatDatumCzLong(currentDate);
  }, [currentDate, viewMode]);

  // Handle day click (open prirazeni sheet)
  function handleAddZasah(dateStr: string) {
    setPrirazeniDate(dateStr);
    setPrirazeniOpen(true);
  }

  // Handle zasah click (view/edit detail)
  function handleZasahClick(zasah: ZasahRow) {
    setDetailZasah(zasah);
    setDetailOpen(true);
  }

  // Get klient name from zakazka
  function getKlientName(zasah: ZasahRow): string {
    const klient = zasah.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  // After action callback
  function handleActionDone() {
    setPrirazeniOpen(false);
    setDetailOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-3">
          {/* View mode + navigation row */}
          <div className="flex items-center justify-between gap-2">
            {/* View mode toggle */}
            <div className="flex gap-1">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "outline"}
                  size="sm"
                  className="min-h-[44px] min-w-[44px] text-sm"
                  onClick={() => setViewMode(mode)}
                >
                  {mode === "month"
                    ? "Měsíc"
                    : mode === "week"
                      ? "Týden"
                      : "Den"}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] text-sm"
              onClick={goToToday}
            >
              Dnes
            </Button>
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => navigate(-1)}
            >
              ‹
            </Button>
            <h2 className="text-center text-base font-semibold">{dateLabel}</h2>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => navigate(1)}
            >
              ›
            </Button>
          </div>

          {/* Technik filter */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={selectedTechnikFilter === null ? "default" : "outline"}
              size="sm"
              className="min-h-[44px] text-sm"
              onClick={() => setSelectedTechnikFilter(null)}
            >
              Všichni
            </Button>
            {technici.map((t, i) => {
              const color = getTechnikColor(i);
              const isActive = selectedTechnikFilter === t.id;
              return (
                <Button
                  key={t.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className={`min-h-[44px] text-sm ${!isActive ? `${color.bg} ${color.text} border-transparent hover:opacity-80` : ""}`}
                  onClick={() =>
                    setSelectedTechnikFilter(isActive ? null : t.id)
                  }
                >
                  <span
                    className={`mr-1 inline-block size-2 rounded-full ${color.dot}`}
                  />
                  {t.jmeno} {t.prijmeni.charAt(0)}.
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      {viewMode === "month" && (
        <MonthView
          currentDate={currentDate}
          zasahyByDate={filteredZasahyByDate}
          dostupnostByDate={dostupnostByDate}
          technikColorMap={technikColorMap}
          onAddZasah={handleAddZasah}
          onZasahClick={handleZasahClick}
          getKlientName={getKlientName}
        />
      )}

      {viewMode === "week" && (
        <WeekView
          currentDate={currentDate}
          zasahyByDate={filteredZasahyByDate}
          dostupnostByDate={dostupnostByDate}
          technikColorMap={technikColorMap}
          onAddZasah={handleAddZasah}
          onZasahClick={handleZasahClick}
          getKlientName={getKlientName}
        />
      )}

      {viewMode === "day" && (
        <DayView
          currentDate={currentDate}
          zasahyByDate={filteredZasahyByDate}
          dostupnostByDate={dostupnostByDate}
          technikColorMap={technikColorMap}
          onAddZasah={handleAddZasah}
          onZasahClick={handleZasahClick}
          getKlientName={getKlientName}
        />
      )}

      {/* Prirazeni Sheet */}
      <PrirazeniSheet
        open={prirazeniOpen}
        onOpenChange={setPrirazeniOpen}
        datum={prirazeniDate}
        technici={technici}
        zakazky={zakazky}
        dostupnostByDate={dostupnostByDate}
        onDone={handleActionDone}
      />

      {/* Zasah Detail Sheet */}
      <ZasahDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        zasah={detailZasah}
        technikColorMap={technikColorMap}
        onDone={handleActionDone}
      />
    </div>
  );
}

// ---------- Sub-views ----------

interface ViewProps {
  currentDate: Date;
  zasahyByDate: Map<string, ZasahRow[]>;
  dostupnostByDate: Map<string, DostupnostRow[]>;
  technikColorMap: Map<string, number>;
  onAddZasah: (dateStr: string) => void;
  onZasahClick: (zasah: ZasahRow) => void;
  getKlientName: (zasah: ZasahRow) => string;
}

// ---------- Month View ----------

function MonthView({
  currentDate,
  zasahyByDate,
  dostupnostByDate,
  technikColorMap,
  onAddZasah,
  onZasahClick,
  getKlientName,
}: ViewProps) {
  const dates = getMonthDates(
    currentDate.getFullYear(),
    currentDate.getMonth(),
  );
  const todayStr = toDateString(new Date());

  return (
    <Card>
      <CardContent className="p-2">
        {/* Header */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {DAY_NAMES.map((name) => (
            <div key={name} className="font-medium py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {dates.map((date, idx) => {
            const dateStr = toDateString(date);
            const isCurrentMonth =
              date.getMonth() === currentDate.getMonth();
            const isToday = dateStr === todayStr;
            const zasahy = zasahyByDate.get(dateStr) || [];
            const dostupnost = dostupnostByDate.get(dateStr) || [];
            const hasDostupnost = dostupnost.length > 0;

            return (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                aria-label={`${date.getDate()}. ${MONTH_NAMES[date.getMonth()]} — přidat zásah`}
                className={`flex min-h-[60px] cursor-pointer flex-col items-start rounded-lg p-1 text-left transition-colors ${
                  !isCurrentMonth
                    ? "bg-muted/20 text-muted-foreground/40"
                    : isToday
                      ? "bg-blue-50 ring-1 ring-blue-300"
                      : hasDostupnost
                        ? "bg-background hover:bg-muted/50"
                        : "bg-muted/30 hover:bg-muted/50"
                }`}
                onClick={() => onAddZasah(dateStr)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAddZasah(dateStr);
                  }
                }}
              >
                <span
                  className={`text-xs font-semibold ${isToday ? "text-blue-600" : ""}`}
                >
                  {date.getDate()}
                </span>

                {/* Zasahy dots */}
                {zasahy.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {zasahy.slice(0, 3).map((z) => {
                      const colorIdx = technikColorMap.get(z.technik_id) ?? 0;
                      const color = getTechnikColor(colorIdx);
                      return (
                        <button
                          key={z.id}
                          className="flex items-center justify-center p-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onZasahClick(z);
                          }}
                          aria-label={`Zásah ${getKlientName(z)}`}
                        >
                          <span className={`size-2 rounded-full ${color.dot}`} />
                        </button>
                      );
                    })}
                    {zasahy.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">
                        +{zasahy.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Dostupnost indicator */}
                {!hasDostupnost && isCurrentMonth && (
                  <span className="mt-auto text-[9px] text-muted-foreground/50">
                    —
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Week View ----------

function WeekView({
  currentDate,
  zasahyByDate,
  dostupnostByDate,
  technikColorMap,
  onAddZasah,
  onZasahClick,
  getKlientName,
}: ViewProps) {
  const monday = getMonday(currentDate);
  const weekDates = getWeekDates(monday);
  const todayStr = toDateString(new Date());

  return (
    <div className="space-y-2">
      {weekDates.map((date) => {
        const dateStr = toDateString(date);
        const isToday = dateStr === todayStr;
        const zasahy = zasahyByDate.get(dateStr) || [];
        const dostupnost = dostupnostByDate.get(dateStr) || [];
        const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;

        return (
          <Card
            key={dateStr}
            className={isToday ? "ring-1 ring-blue-300" : ""}
          >
            <CardContent className="p-3">
              {/* Day header */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${isToday ? "text-blue-600" : ""}`}
                  >
                    {DAY_NAMES[dayIdx]} {date.getDate()}.
                  </span>
                  {dostupnost.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dostupnost.map((d) => (
                        <Badge
                          key={d.id}
                          variant="outline"
                          className="text-xs px-1 py-0"
                        >
                          {d.profiles?.jmeno?.charAt(0)}.{d.profiles?.prijmeni?.charAt(0)}. {formatCasCz(d.cas_od.substring(0, 5))}–{formatCasCz(d.cas_do.substring(0, 5))}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[44px] min-w-[44px] text-xl text-muted-foreground"
                  onClick={() => onAddZasah(dateStr)}
                  aria-label="Přidat zásah"
                >
                  +
                </Button>
              </div>

              {/* Zasahy list */}
              {zasahy.length === 0 ? (
                <p className="text-xs text-muted-foreground">Žádné zásahy</p>
              ) : (
                <div className="space-y-1.5">
                  {zasahy.map((z) => {
                    const colorIdx =
                      technikColorMap.get(z.technik_id) ?? 0;
                    const color = getTechnikColor(colorIdx);
                    const statusInfo = STATUS_ZASAHU_LABELS[z.status];

                    return (
                      <button
                        key={z.id}
                        className={`flex w-full items-start gap-2 rounded-lg border-l-4 ${color.border} ${color.bg} p-2 text-left transition-colors hover:opacity-80`}
                        onClick={() => onZasahClick(z)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold">
                              {formatCasCz(z.cas_od.substring(0, 5))}–
                              {formatCasCz(z.cas_do.substring(0, 5))}
                            </span>
                            <Badge
                              className={`${statusInfo?.bgColor} ${statusInfo?.color} text-xs px-1 py-0`}
                            >
                              {statusInfo?.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 truncate text-sm font-medium">
                            {getKlientName(z)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {z.zakazky?.objekty?.nazev || "—"} · {z.zakazky?.objekty?.adresa || "—"}
                          </p>
                          <p className={`text-xs ${color.text}`}>
                            {z.profiles?.jmeno} {z.profiles?.prijmeni}
                            {z.odhadovana_delka_min
                              ? ` · ${formatDelka(z.odhadovana_delka_min)}`
                              : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ---------- Day View ----------

function DayView({
  currentDate,
  zasahyByDate,
  dostupnostByDate,
  technikColorMap,
  onAddZasah,
  onZasahClick,
  getKlientName,
}: ViewProps) {
  const dateStr = toDateString(currentDate);
  const zasahy = zasahyByDate.get(dateStr) || [];
  const dostupnost = dostupnostByDate.get(dateStr) || [];

  return (
    <div className="space-y-3">
      {/* Dostupnost overview */}
      {dostupnost.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              Dostupnost techniků
            </h3>
            <div className="space-y-1">
              {dostupnost.map((d) => (
                <div key={d.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs">
                    {formatCasCz(d.cas_od.substring(0, 5))}–
                    {formatCasCz(d.cas_do.substring(0, 5))}
                  </Badge>
                  <span>
                    {d.profiles?.jmeno} {d.profiles?.prijmeni}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add button */}
      <Button
        className="min-h-[44px] w-full"
        onClick={() => onAddZasah(dateStr)}
      >
        + Přidat zásah na {formatDatumCz(currentDate)}
      </Button>

      {/* Zasahy */}
      {zasahy.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Žádné zásahy pro tento den
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {zasahy.map((z) => {
            const colorIdx = technikColorMap.get(z.technik_id) ?? 0;
            const color = getTechnikColor(colorIdx);
            const statusInfo = STATUS_ZASAHU_LABELS[z.status];

            return (
              <Card
                key={z.id}
                className={`border-l-4 ${color.border} cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/40`}
                onClick={() => onZasahClick(z)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold">
                          {formatCasCz(z.cas_od.substring(0, 5))}–
                          {formatCasCz(z.cas_do.substring(0, 5))}
                        </span>
                        <Badge
                          className={`${statusInfo?.bgColor} ${statusInfo?.color} text-xs`}
                        >
                          {statusInfo?.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-base font-medium">
                        {getKlientName(z)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {z.zakazky?.objekty?.nazev || "—"} · {z.zakazky?.objekty?.adresa || "—"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`text-sm font-medium ${color.text}`}>
                          {z.profiles?.jmeno} {z.profiles?.prijmeni}
                        </span>
                        {z.odhadovana_delka_min && (
                          <span className="text-xs text-muted-foreground">
                            · {formatDelka(z.odhadovana_delka_min)}
                          </span>
                        )}
                      </div>
                      {z.poznamka && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          {z.poznamka}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
