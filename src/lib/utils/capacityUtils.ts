/**
 * Kapacitní výpočty pro techniky — Sprint 35
 * Počítá volný čas, obsazenost, najde další volný slot.
 */

export interface TimeSlot {
  casOd: string; // HH:MM
  casDo: string; // HH:MM
}

export interface DostupnostSlot {
  cas_od: string;
  cas_do: string;
}

export interface ZasahSlot {
  cas_od: string;
  cas_do: string;
  status: string;
}

export interface TechnikCapacity {
  totalMinutes: number;
  usedMinutes: number;
  freeMinutes: number;
  nextFreeSlot: TimeSlot | null;
}

/**
 * Převede HH:MM na minuty od půlnoci.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Převede minuty od půlnoci na HH:MM.
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Spočítá kapacitu technika na daný den.
 * @param dostupnost — sloty dostupnosti (může být víc za den)
 * @param zasahy — přiřazené zásahy (nezrušené)
 * @param minSlotMinutes — minimální délka volného slotu (default 30 min)
 */
export function computeTechnikCapacity(
  dostupnost: DostupnostSlot[],
  zasahy: ZasahSlot[],
  minSlotMinutes = 30,
): TechnikCapacity {
  if (dostupnost.length === 0) {
    return { totalMinutes: 0, usedMinutes: 0, freeMinutes: 0, nextFreeSlot: null };
  }

  // Celkový čas dostupnosti
  let totalMinutes = 0;
  for (const d of dostupnost) {
    totalMinutes += timeToMinutes(d.cas_do) - timeToMinutes(d.cas_od);
  }

  // Aktivní zásahy (ne zrušené)
  const activeZasahy = zasahy.filter((z) => z.status !== "zruseno");

  // Obsazený čas
  let usedMinutes = 0;
  for (const z of activeZasahy) {
    usedMinutes += timeToMinutes(z.cas_do) - timeToMinutes(z.cas_od);
  }

  const freeMinutes = Math.max(0, totalMinutes - usedMinutes);

  // Najdi další volný slot
  const nextFreeSlot = findNextFreeSlot(dostupnost, activeZasahy, minSlotMinutes);

  return { totalMinutes, usedMinutes, freeMinutes, nextFreeSlot };
}

/**
 * Najde další volný časový slot v dostupnosti, který nekoliduje se zásahy.
 */
export function findNextFreeSlot(
  dostupnost: DostupnostSlot[],
  zasahy: ZasahSlot[],
  minMinutes = 30,
): TimeSlot | null {
  // Seřadíme zásahy dle času
  const sortedZasahy = [...zasahy]
    .filter((z) => z.status !== "zruseno")
    .sort((a, b) => timeToMinutes(a.cas_od) - timeToMinutes(b.cas_od));

  for (const dost of dostupnost) {
    const dostOd = timeToMinutes(dost.cas_od);
    const dostDo = timeToMinutes(dost.cas_do);

    // Sbíráme obsazené intervaly v rámci této dostupnosti
    const busyIntervals: Array<{ od: number; do_: number }> = [];
    for (const z of sortedZasahy) {
      const zOd = timeToMinutes(z.cas_od);
      const zDo = timeToMinutes(z.cas_do);
      // Překryv s dostupností?
      if (zDo > dostOd && zOd < dostDo) {
        busyIntervals.push({
          od: Math.max(zOd, dostOd),
          do_: Math.min(zDo, dostDo),
        });
      }
    }

    // Merge overlapping intervals
    const merged = mergeIntervals(busyIntervals);

    // Hledáme mezery
    let cursor = dostOd;
    for (const interval of merged) {
      if (interval.od - cursor >= minMinutes) {
        return {
          casOd: minutesToTime(cursor),
          casDo: minutesToTime(Math.min(cursor + 120, interval.od)), // max 2h slot
        };
      }
      cursor = Math.max(cursor, interval.do_);
    }

    // Mezera po posledním zásahu
    if (dostDo - cursor >= minMinutes) {
      return {
        casOd: minutesToTime(cursor),
        casDo: minutesToTime(Math.min(cursor + 120, dostDo)),
      };
    }
  }

  return null;
}

function mergeIntervals(intervals: Array<{ od: number; do_: number }>): Array<{ od: number; do_: number }> {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.od - b.od);
  const result = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    if (sorted[i].od <= last.do_) {
      last.do_ = Math.max(last.do_, sorted[i].do_);
    } else {
      result.push(sorted[i]);
    }
  }
  return result;
}

/**
 * Formátuje kapacitu pro zobrazení.
 */
export function formatCapacity(cap: TechnikCapacity): string {
  const h = Math.floor(cap.freeMinutes / 60);
  const m = cap.freeMinutes % 60;
  if (h === 0) return `${m} min volno`;
  if (m === 0) return `${h}h volno`;
  return `${h}h ${m}m volno`;
}
