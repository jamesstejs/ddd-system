import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  computeTechnikCapacity,
  findNextFreeSlot,
  formatCapacity,
  type DostupnostSlot,
  type ZasahSlot,
} from "../capacityUtils";

// ---------------------------------------------------------------
// timeToMinutes / minutesToTime
// ---------------------------------------------------------------

describe("timeToMinutes", () => {
  it("converts 08:00 to 480", () => {
    expect(timeToMinutes("08:00")).toBe(480);
  });

  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("converts 23:59 to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("converts 12:30 to 750", () => {
    expect(timeToMinutes("12:30")).toBe(750);
  });
});

describe("minutesToTime", () => {
  it("converts 480 to 08:00", () => {
    expect(minutesToTime(480)).toBe("08:00");
  });

  it("converts 0 to 00:00", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("converts 750 to 12:30", () => {
    expect(minutesToTime(750)).toBe("12:30");
  });
});

// ---------------------------------------------------------------
// computeTechnikCapacity
// ---------------------------------------------------------------

describe("computeTechnikCapacity", () => {
  it("returns zero capacity when no dostupnost", () => {
    const result = computeTechnikCapacity([], []);
    expect(result).toEqual({
      totalMinutes: 0,
      usedMinutes: 0,
      freeMinutes: 0,
      nextFreeSlot: null,
    });
  });

  it("returns full capacity when no zasahy", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const result = computeTechnikCapacity(dostupnost, []);
    expect(result.totalMinutes).toBe(480);
    expect(result.usedMinutes).toBe(0);
    expect(result.freeMinutes).toBe(480);
    expect(result.nextFreeSlot).not.toBeNull();
    expect(result.nextFreeSlot?.casOd).toBe("08:00");
  });

  it("calculates partial usage correctly", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "10:00", status: "naplanovano" },
      { cas_od: "13:00", cas_do: "15:00", status: "naplanovano" },
    ];
    const result = computeTechnikCapacity(dostupnost, zasahy);
    expect(result.totalMinutes).toBe(480);
    expect(result.usedMinutes).toBe(240);
    expect(result.freeMinutes).toBe(240);
  });

  it("calculates fully booked correctly", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "16:00", status: "naplanovano" },
    ];
    const result = computeTechnikCapacity(dostupnost, zasahy);
    expect(result.totalMinutes).toBe(480);
    expect(result.usedMinutes).toBe(480);
    expect(result.freeMinutes).toBe(0);
    expect(result.nextFreeSlot).toBeNull();
  });

  it("ignores cancelled zasahy", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "12:00", status: "zruseno" },
      { cas_od: "12:00", cas_do: "14:00", status: "naplanovano" },
    ];
    const result = computeTechnikCapacity(dostupnost, zasahy);
    expect(result.usedMinutes).toBe(120);
    expect(result.freeMinutes).toBe(360);
  });

  it("handles multiple dostupnost slots", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "12:00" },
      { cas_od: "13:00", cas_do: "17:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "09:00", cas_do: "11:00", status: "naplanovano" },
    ];
    const result = computeTechnikCapacity(dostupnost, zasahy);
    expect(result.totalMinutes).toBe(480);
    expect(result.usedMinutes).toBe(120);
    expect(result.freeMinutes).toBe(360);
  });

  it("respects minSlotMinutes parameter", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "08:20", status: "naplanovano" },
      { cas_od: "08:30", cas_do: "16:00", status: "naplanovano" },
    ];
    // Gap is only 10 minutes (08:20 to 08:30) — less than default 30
    const result = computeTechnikCapacity(dostupnost, zasahy);
    expect(result.nextFreeSlot).toBeNull();

    // With minSlotMinutes = 5, the 10-min gap should be found
    const result2 = computeTechnikCapacity(dostupnost, zasahy, 5);
    expect(result2.nextFreeSlot).not.toBeNull();
    expect(result2.nextFreeSlot?.casOd).toBe("08:20");
  });
});

// ---------------------------------------------------------------
// findNextFreeSlot
// ---------------------------------------------------------------

describe("findNextFreeSlot", () => {
  it("returns start of day when no zasahy", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const result = findNextFreeSlot(dostupnost, []);
    expect(result).not.toBeNull();
    expect(result?.casOd).toBe("08:00");
    expect(result?.casDo).toBe("10:00"); // max 2h slot
  });

  it("finds gap between zasahy", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "10:00", status: "naplanovano" },
      { cas_od: "13:00", cas_do: "15:00", status: "naplanovano" },
    ];
    const result = findNextFreeSlot(dostupnost, zasahy);
    expect(result?.casOd).toBe("10:00");
    expect(result?.casDo).toBe("12:00"); // max 2h capped to 13:00 gap, but 2h from 10:00 = 12:00
  });

  it("finds gap after last zasah", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "14:00", status: "naplanovano" },
    ];
    const result = findNextFreeSlot(dostupnost, zasahy);
    expect(result?.casOd).toBe("14:00");
    expect(result?.casDo).toBe("16:00"); // 2h capped by dostupnost end
  });

  it("returns null when no space", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "10:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "10:00", status: "naplanovano" },
    ];
    const result = findNextFreeSlot(dostupnost, zasahy);
    expect(result).toBeNull();
  });

  it("handles overlapping zasahy via merging", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "16:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "11:00", status: "naplanovano" },
      { cas_od: "10:00", cas_do: "12:00", status: "naplanovano" },
    ];
    // After merging: 08:00-12:00 occupied
    const result = findNextFreeSlot(dostupnost, zasahy);
    expect(result?.casOd).toBe("12:00");
  });

  it("finds slot in second dostupnost block", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "12:00" },
      { cas_od: "13:00", cas_do: "17:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "12:00", status: "naplanovano" },
    ];
    const result = findNextFreeSlot(dostupnost, zasahy);
    expect(result?.casOd).toBe("13:00");
  });

  it("returns null when gap is less than minMinutes", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "09:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "08:45", status: "naplanovano" },
    ];
    // Only 15 min free (08:45-09:00), default minMinutes=30
    const result = findNextFreeSlot(dostupnost, zasahy);
    expect(result).toBeNull();
  });

  it("finds slot with custom minMinutes", () => {
    const dostupnost: DostupnostSlot[] = [
      { cas_od: "08:00", cas_do: "09:00" },
    ];
    const zasahy: ZasahSlot[] = [
      { cas_od: "08:00", cas_do: "08:45", status: "naplanovano" },
    ];
    // 15 min free, minMinutes=10
    const result = findNextFreeSlot(dostupnost, zasahy, 10);
    expect(result).not.toBeNull();
    expect(result?.casOd).toBe("08:45");
  });
});

// ---------------------------------------------------------------
// formatCapacity
// ---------------------------------------------------------------

describe("formatCapacity", () => {
  it("formats hours only", () => {
    expect(formatCapacity({ totalMinutes: 480, usedMinutes: 240, freeMinutes: 240, nextFreeSlot: null }))
      .toBe("4h volno");
  });

  it("formats minutes only", () => {
    expect(formatCapacity({ totalMinutes: 60, usedMinutes: 35, freeMinutes: 25, nextFreeSlot: null }))
      .toBe("25 min volno");
  });

  it("formats hours and minutes", () => {
    expect(formatCapacity({ totalMinutes: 480, usedMinutes: 210, freeMinutes: 270, nextFreeSlot: null }))
      .toBe("4h 30m volno");
  });

  it("formats zero free time", () => {
    expect(formatCapacity({ totalMinutes: 480, usedMinutes: 480, freeMinutes: 0, nextFreeSlot: null }))
      .toBe("0 min volno");
  });
});
