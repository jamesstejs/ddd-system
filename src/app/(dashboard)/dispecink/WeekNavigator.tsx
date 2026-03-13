"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  weekStart: string; // YYYY-MM-DD (Monday)
  onChange: (newWeekStart: string) => void;
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d}.${m}.`;
}

export function WeekNavigator({ weekStart, onChange }: Props) {
  const weekEnd = addDays(weekStart, 6);
  const weekNum = getWeekNumber(weekStart);
  const year = weekStart.split("-")[0];

  return (
    <div className="flex items-center justify-between px-1">
      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, -7))}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg active:bg-muted/50"
        aria-label="Předchozí týden"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="text-center">
        <div className="text-sm font-semibold">
          Týden {weekNum}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatShortDate(weekStart)} – {formatShortDate(weekEnd)} {year}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(addDays(weekStart, 7))}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-lg active:bg-muted/50"
        aria-label="Další týden"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
