"use client";

import { useMemo } from "react";
import type {
  DispecinkTechnik,
  DispecinkDostupnost,
  DispecinkZasah,
} from "./types";

type Props = {
  technici: DispecinkTechnik[];
  dostupnost: DispecinkDostupnost[];
  zasahy: DispecinkZasah[];
  weekStart: string; // YYYY-MM-DD (Monday)
  onSlotTap: (
    technikId: string,
    technikName: string,
    datum: string,
    casOd: string,
    casDo: string,
  ) => void;
};

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function formatTime(time: string): string {
  return time.slice(0, 5); // "08:00:00" → "08:00"
}

/** Compute total free hours for a technician in the week */
function computeWeekFreeHours(
  technikId: string,
  days: string[],
  dostupnost: DispecinkDostupnost[],
  zasahy: DispecinkZasah[],
): number {
  let totalMinutes = 0;
  for (const day of days) {
    const dayDost = dostupnost.filter(
      (d) => d.technik_id === technikId && d.datum === day,
    );
    const dayZasahy = zasahy.filter(
      (z) => z.technik_id === technikId && z.datum === day,
    );

    for (const slot of dayDost) {
      const slotStart = timeToMinutes(slot.cas_od);
      const slotEnd = timeToMinutes(slot.cas_do);
      let freeMinutes = slotEnd - slotStart;

      // Subtract zasahy that overlap with this slot
      for (const z of dayZasahy) {
        const zStart = timeToMinutes(z.cas_od);
        const zEnd = timeToMinutes(z.cas_do);
        const overlapStart = Math.max(slotStart, zStart);
        const overlapEnd = Math.min(slotEnd, zEnd);
        if (overlapEnd > overlapStart) {
          freeMinutes -= overlapEnd - overlapStart;
        }
      }
      totalMinutes += Math.max(0, freeMinutes);
    }
  }
  return totalMinutes / 60;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Get free slots (gaps in a day's availability not covered by zasahy) */
function getFreeSlots(
  technikId: string,
  datum: string,
  dostupnost: DispecinkDostupnost[],
  zasahy: DispecinkZasah[],
): { casOd: string; casDo: string }[] {
  const dayDost = dostupnost.filter(
    (d) => d.technik_id === technikId && d.datum === datum,
  );
  const dayZasahy = zasahy
    .filter((z) => z.technik_id === technikId && z.datum === datum)
    .sort((a, b) => a.cas_od.localeCompare(b.cas_od));

  const freeSlots: { casOd: string; casDo: string }[] = [];

  for (const slot of dayDost) {
    let currentStart = timeToMinutes(slot.cas_od);
    const slotEnd = timeToMinutes(slot.cas_do);

    // Find zasahy that overlap with this slot
    const overlapping = dayZasahy.filter((z) => {
      const zS = timeToMinutes(z.cas_od);
      const zE = timeToMinutes(z.cas_do);
      return zE > currentStart && zS < slotEnd;
    });

    for (const z of overlapping) {
      const zStart = timeToMinutes(z.cas_od);
      if (zStart > currentStart) {
        freeSlots.push({
          casOd: minutesToTime(currentStart),
          casDo: minutesToTime(zStart),
        });
      }
      currentStart = Math.max(currentStart, timeToMinutes(z.cas_do));
    }

    if (currentStart < slotEnd) {
      freeSlots.push({
        casOd: minutesToTime(currentStart),
        casDo: minutesToTime(slotEnd),
      });
    }
  }

  return freeSlots;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
}

export function TechnikWeekGrid({
  technici,
  dostupnost,
  zasahy,
  weekStart,
  onSlotTap,
}: Props) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  if (technici.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed p-6">
        <p className="text-sm text-muted-foreground">
          V tomto regionu nejsou žádní technici.
          <br />
          Přiřaďte techniky v Správě uživatelů.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Day header */}
        <div className="mb-1 grid grid-cols-[140px_repeat(7,1fr)] gap-px">
          <div /> {/* empty corner */}
          {days.map((day, i) => {
            const [, m, d] = day.split("-").map(Number);
            const isToday = day === new Date().toISOString().split("T")[0];
            return (
              <div
                key={day}
                className={`rounded-t px-1 py-1.5 text-center text-xs font-medium ${
                  isToday
                    ? "bg-blue-100 text-blue-800"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                <div>{DAY_LABELS[i]}</div>
                <div className="text-[10px]">
                  {d}.{m}.
                </div>
              </div>
            );
          })}
        </div>

        {/* Technician rows */}
        {technici.map((t) => {
          const freeHours = computeWeekFreeHours(
            t.id,
            days,
            dostupnost,
            zasahy,
          );

          return (
            <div
              key={t.id}
              className="grid grid-cols-[140px_repeat(7,1fr)] gap-px border-b border-muted/30"
            >
              {/* Tech name cell */}
              <div className="flex min-h-[52px] flex-col justify-center px-2 py-1">
                <div className="text-sm font-medium leading-tight">
                  {t.jmeno} {t.prijmeni.charAt(0)}.
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {freeHours > 0 ? (
                    <span className="text-green-600">
                      {freeHours.toFixed(1)}h volno
                    </span>
                  ) : (
                    <span className="text-red-500">plno</span>
                  )}
                </div>
              </div>

              {/* Day cells */}
              {days.map((day) => (
                <DayCell
                  key={day}
                  technikId={t.id}
                  technikName={`${t.jmeno} ${t.prijmeni}`}
                  datum={day}
                  dostupnost={dostupnost}
                  zasahy={zasahy}
                  onSlotTap={onSlotTap}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Day cell — shows availability blocks + zasahy + free slots
// ---------------------------------------------------------------

function DayCell({
  technikId,
  technikName,
  datum,
  dostupnost,
  zasahy,
  onSlotTap,
}: {
  technikId: string;
  technikName: string;
  datum: string;
  dostupnost: DispecinkDostupnost[];
  zasahy: DispecinkZasah[];
  onSlotTap: Props["onSlotTap"];
}) {
  const dayDost = dostupnost.filter(
    (d) => d.technik_id === technikId && d.datum === datum,
  );
  const dayZasahy = zasahy.filter(
    (z) => z.technik_id === technikId && z.datum === datum,
  );
  const freeSlots = getFreeSlots(technikId, datum, dostupnost, zasahy);

  if (dayDost.length === 0) {
    // No availability this day
    return (
      <div className="flex min-h-[52px] items-center justify-center bg-muted/20">
        <span className="text-[10px] text-muted-foreground/50">–</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-[52px] flex-col gap-0.5 p-0.5">
      {/* Show zasahy (blue) */}
      {dayZasahy.map((z) => (
        <div
          key={z.id}
          className="rounded bg-blue-100 px-1 py-0.5 text-[10px] leading-tight text-blue-800"
          title={
            z.zakazky?.objekty
              ? `${z.zakazky.objekty.nazev} (${formatTime(z.cas_od)}-${formatTime(z.cas_do)})`
              : `Zásah ${formatTime(z.cas_od)}-${formatTime(z.cas_do)}`
          }
        >
          <div className="truncate font-medium">
            {formatTime(z.cas_od)}-{formatTime(z.cas_do)}
          </div>
          {z.zakazky?.objekty && (
            <div className="truncate text-blue-600">
              {z.zakazky.objekty.klienti.typ === "firma"
                ? z.zakazky.objekty.klienti.nazev
                : `${z.zakazky.objekty.klienti.jmeno} ${z.zakazky.objekty.klienti.prijmeni}`}
            </div>
          )}
        </div>
      ))}

      {/* Show free slots (green, tappable) */}
      {freeSlots.map((slot, i) => (
        <button
          key={i}
          type="button"
          onClick={() =>
            onSlotTap(technikId, technikName, datum, slot.casOd, slot.casDo)
          }
          className="rounded border border-dashed border-green-400 bg-green-50 px-1 py-0.5 text-[10px] font-medium leading-tight text-green-700 transition-colors active:bg-green-200"
          style={{ minHeight: 28 }}
        >
          {formatTime(slot.casOd)}-{formatTime(slot.casDo)}
        </button>
      ))}
    </div>
  );
}
