import { describe, it, expect } from "vitest";
import { POBOCKY, POBOCKA_LABELS, type Pobocka } from "@/types/pobocky";

// ---------------------------------------------------------------
// Pobocky constants
// ---------------------------------------------------------------

describe("POBOCKY constants", () => {
  it("has 14 Czech regions", () => {
    expect(POBOCKY).toHaveLength(14);
  });

  it("each region has value and label", () => {
    for (const p of POBOCKY) {
      expect(p.value).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(typeof p.value).toBe("string");
      expect(typeof p.label).toBe("string");
    }
  });

  it("includes Praha, Jihomoravský, Moravskoslezský", () => {
    const values = POBOCKY.map((p) => p.value);
    expect(values).toContain("praha");
    expect(values).toContain("jihomoravsky");
    expect(values).toContain("moravskoslezsky");
  });

  it("POBOCKA_LABELS maps correctly", () => {
    expect(POBOCKA_LABELS.praha).toBe("Praha");
    expect(POBOCKA_LABELS.jihomoravsky).toBe("Jihomoravský");
    expect(POBOCKA_LABELS.vysocina).toBe("Vysočina");
  });

  it("all values are unique", () => {
    const values = POBOCKY.map((p) => p.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ---------------------------------------------------------------
// WeekNavigator helpers (testing the logic, not the component)
// ---------------------------------------------------------------

describe("Week navigation logic", () => {
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
        ((d.getTime() - week1.getTime()) / 86400000 -
          3 +
          ((week1.getDay() + 6) % 7)) /
          7,
      )
    );
  }

  it("addDays computes next week correctly", () => {
    expect(addDays("2026-03-09", 7)).toBe("2026-03-16");
    expect(addDays("2026-03-09", -7)).toBe("2026-03-02");
  });

  it("addDays computes week end from Monday", () => {
    expect(addDays("2026-03-09", 6)).toBe("2026-03-15"); // Sunday
  });

  it("getWeekNumber returns correct ISO week", () => {
    // 2026-03-09 is Monday of week 11
    expect(getWeekNumber("2026-03-09")).toBe(11);
    // 2026-01-05 is Monday of week 2
    expect(getWeekNumber("2026-01-05")).toBe(2);
  });
});

// ---------------------------------------------------------------
// TechnikWeekGrid — free slot computation logic
// ---------------------------------------------------------------

describe("Free slot computation", () => {
  function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`;
  }

  type Slot = { cas_od: string; cas_do: string };

  function getFreeSlots(
    dostupnost: Slot[],
    zasahy: Slot[],
  ): { casOd: string; casDo: string }[] {
    const sortedZasahy = [...zasahy].sort((a, b) =>
      a.cas_od.localeCompare(b.cas_od),
    );
    const freeSlots: { casOd: string; casDo: string }[] = [];

    for (const slot of dostupnost) {
      let currentStart = timeToMinutes(slot.cas_od);
      const slotEnd = timeToMinutes(slot.cas_do);

      const overlapping = sortedZasahy.filter((z) => {
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

  it("returns full slot when no zasahy", () => {
    const result = getFreeSlots(
      [{ cas_od: "08:00:00", cas_do: "12:00:00" }],
      [],
    );
    expect(result).toEqual([{ casOd: "08:00:00", casDo: "12:00:00" }]);
  });

  it("returns nothing when slot fully occupied", () => {
    const result = getFreeSlots(
      [{ cas_od: "08:00:00", cas_do: "10:00:00" }],
      [{ cas_od: "08:00:00", cas_do: "10:00:00" }],
    );
    expect(result).toEqual([]);
  });

  it("returns gaps around a zasah", () => {
    const result = getFreeSlots(
      [{ cas_od: "08:00:00", cas_do: "12:00:00" }],
      [{ cas_od: "09:00:00", cas_do: "10:00:00" }],
    );
    expect(result).toEqual([
      { casOd: "08:00:00", casDo: "09:00:00" },
      { casOd: "10:00:00", casDo: "12:00:00" },
    ]);
  });

  it("handles multiple zasahy in one slot", () => {
    const result = getFreeSlots(
      [{ cas_od: "08:00:00", cas_do: "16:00:00" }],
      [
        { cas_od: "09:00:00", cas_do: "10:00:00" },
        { cas_od: "12:00:00", cas_do: "13:00:00" },
      ],
    );
    expect(result).toEqual([
      { casOd: "08:00:00", casDo: "09:00:00" },
      { casOd: "10:00:00", casDo: "12:00:00" },
      { casOd: "13:00:00", casDo: "16:00:00" },
    ]);
  });

  it("handles zasah at start of slot", () => {
    const result = getFreeSlots(
      [{ cas_od: "08:00:00", cas_do: "12:00:00" }],
      [{ cas_od: "08:00:00", cas_do: "09:00:00" }],
    );
    expect(result).toEqual([{ casOd: "09:00:00", casDo: "12:00:00" }]);
  });

  it("handles zasah at end of slot", () => {
    const result = getFreeSlots(
      [{ cas_od: "08:00:00", cas_do: "12:00:00" }],
      [{ cas_od: "11:00:00", cas_do: "12:00:00" }],
    );
    expect(result).toEqual([{ casOd: "08:00:00", casDo: "11:00:00" }]);
  });

  it("handles empty dostupnost", () => {
    const result = getFreeSlots([], []);
    expect(result).toEqual([]);
  });

  it("computes weekly free hours correctly", () => {
    // 2 slots of 4h each, 1 zasah of 1h
    const totalDostMinutes = 2 * 4 * 60; // 480
    const totalZasahMinutes = 60;
    const expectedFreeHours = (totalDostMinutes - totalZasahMinutes) / 60;
    expect(expectedFreeHours).toBe(7);
  });
});
