/**
 * Pure utility functions pro dostupnost techniků.
 * Žádné DB volání — jen výpočty a formátování.
 */

/**
 * Vrátí rozsah datumů pro zadávání dostupnosti: dnes+14 → dnes+60.
 */
export function getAvailableDateRange(today?: Date): {
  od: Date;
  do: Date;
} {
  const base = today ? new Date(today) : new Date();
  base.setHours(0, 0, 0, 0);

  const od = new Date(base);
  od.setDate(od.getDate() + 14);

  const doDate = new Date(base);
  doDate.setDate(doDate.getDate() + 60);

  return { od, do: doDate };
}

/**
 * Spočte pracovní dny (Po–Pá) v uzavřeném rozsahu [od, do].
 */
export function countWorkDays(od: Date, doDate: Date): number {
  const start = new Date(od);
  start.setHours(0, 0, 0, 0);
  const end = new Date(doDate);
  end.setHours(0, 0, 0, 0);

  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    // 0 = neděle, 6 = sobota
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Vrátí status dostupnosti dle poměru vyplněných dní k celkovým pracovním.
 * - ok: vyplněno >= 75 %
 * - warning: vyplněno >= 30 %
 * - critical: vyplněno < 30 %
 */
export function getDostupnostStatus(
  filledDays: number,
  totalWorkDays: number,
): "ok" | "warning" | "critical" {
  if (totalWorkDays === 0) return "ok";

  const ratio = filledDays / totalWorkDays;

  if (ratio >= 0.75) return "ok";
  if (ratio >= 0.3) return "warning";
  return "critical";
}

/**
 * Zjistí, zda je datum v rozsahu pro zadávání dostupnosti (+14 až +60 dní).
 */
export function isDatumInRange(datum: Date, today?: Date): boolean {
  const { od, do: doDate } = getAvailableDateRange(today);
  const d = new Date(datum);
  d.setHours(0, 0, 0, 0);
  return d >= od && d <= doDate;
}

/**
 * Zjistí, zda je datum pracovní den (Po–Pá).
 */
export function isWorkDay(datum: Date): boolean {
  const day = datum.getDay();
  return day !== 0 && day !== 6;
}

/**
 * Formátuje datum česky: "Po 23. 3."
 */
export function formatDatumCz(date: Date): string {
  const dayNames = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
  const dayName = dayNames[date.getDay()];
  const d = date.getDate();
  const m = date.getMonth() + 1;
  return `${dayName} ${d}. ${m}.`;
}

/**
 * Formátuje datum česky dlouhý formát: "Pondělí 23. března 2026"
 */
export function formatDatumCzLong(date: Date): string {
  const dayNames = [
    "Neděle",
    "Pondělí",
    "Úterý",
    "Středa",
    "Čtvrtek",
    "Pátek",
    "Sobota",
  ];
  const monthNames = [
    "ledna",
    "února",
    "března",
    "dubna",
    "května",
    "června",
    "července",
    "srpna",
    "září",
    "října",
    "listopadu",
    "prosince",
  ];
  const dayName = dayNames[date.getDay()];
  const d = date.getDate();
  const monthName = monthNames[date.getMonth()];
  const y = date.getFullYear();
  return `${dayName} ${d}. ${monthName} ${y}`;
}

/**
 * Formátuje čas: "08:00" → "8:00"
 */
export function formatCasCz(time: string): string {
  const [h, m] = time.split(":");
  return `${parseInt(h, 10)}:${m}`;
}

/**
 * Generuje pole datumů v rozsahu [od, do] (uzavřený interval).
 */
export function generateDateRange(od: Date, doDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(od);
  current.setHours(0, 0, 0, 0);
  const end = new Date(doDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Seskupí datumy do týdnů (začátek pondělí).
 * Vrátí pole týdnů, každý týden = pole 7 datumů (null pro dny mimo rozsah).
 */
export function groupByWeeks(dates: Date[]): (Date | null)[][] {
  if (dates.length === 0) return [];

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Doplnit null na začátek prvního týdne
  const firstDay = dates[0].getDay();
  // Pondělí = 1, ... Neděle = 0 → konvertovat na 0-based od pondělka
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  for (let i = 0; i < startOffset; i++) {
    currentWeek.push(null);
  }

  for (const date of dates) {
    const dayOfWeek = date.getDay();
    const mondayBased = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    if (mondayBased === 0 && currentWeek.length > 0) {
      // Doplnit null na konec týdne
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push(date);
  }

  // Doplnit poslední týden
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}
