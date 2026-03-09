import { describe, it, expect } from "vitest";
import {
  getAvailableDateRange,
  countWorkDays,
  getDostupnostStatus,
  isDatumInRange,
  isWorkDay,
  formatDatumCz,
  formatCasCz,
  generateDateRange,
  groupByWeeks,
} from "../dostupnostUtils";

/** Helper: vytvoří lokální datum bez timezone posunu */
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("getAvailableDateRange", () => {
  it("vrátí rozsah +14 až +60 dní od dnes", () => {
    const today = localDate(2026, 3, 9);
    const { od, do: doDate } = getAvailableDateRange(today);

    expect(toYMD(od)).toBe("2026-03-23");
    expect(toYMD(doDate)).toBe("2026-05-08");
  });

  it("funguje i bez parametru (aktuální den)", () => {
    const { od, do: doDate } = getAvailableDateRange();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const expectedOd = new Date(now);
    expectedOd.setDate(expectedOd.getDate() + 14);

    const expectedDo = new Date(now);
    expectedDo.setDate(expectedDo.getDate() + 60);

    expect(od.getTime()).toBe(expectedOd.getTime());
    expect(doDate.getTime()).toBe(expectedDo.getTime());
  });
});

describe("countWorkDays", () => {
  it("spočte 5 pracovních dní za celý týden Po–Ne", () => {
    // 23.3.2026 = pondělí, 29.3.2026 = neděle
    const od = new Date("2026-03-23");
    const doDate = new Date("2026-03-29");
    expect(countWorkDays(od, doDate)).toBe(5);
  });

  it("víkend má 0 pracovních dní", () => {
    // 28.3.2026 = sobota, 29.3.2026 = neděle
    const od = new Date("2026-03-28");
    const doDate = new Date("2026-03-29");
    expect(countWorkDays(od, doDate)).toBe(0);
  });

  it("Po-Pá = 5 pracovních dní", () => {
    const od = new Date("2026-03-23");
    const doDate = new Date("2026-03-27");
    expect(countWorkDays(od, doDate)).toBe(5);
  });

  it("jeden den (pracovní) = 1", () => {
    const od = new Date("2026-03-23"); // pondělí
    expect(countWorkDays(od, od)).toBe(1);
  });

  it("jeden den (víkend) = 0", () => {
    const od = new Date("2026-03-28"); // sobota
    expect(countWorkDays(od, od)).toBe(0);
  });

  it("obrácený rozsah vrátí 0", () => {
    const od = new Date("2026-03-27");
    const doDate = new Date("2026-03-23");
    expect(countWorkDays(od, doDate)).toBe(0);
  });

  it("dva týdny = 10 pracovních dní", () => {
    const od = new Date("2026-03-23"); // pondělí
    const doDate = new Date("2026-04-03"); // pátek
    expect(countWorkDays(od, doDate)).toBe(10);
  });
});

describe("getDostupnostStatus", () => {
  it("ok: vyplněno ≥ 75%", () => {
    expect(getDostupnostStatus(30, 33)).toBe("ok");
    expect(getDostupnostStatus(33, 33)).toBe("ok");
    expect(getDostupnostStatus(25, 33)).toBe("ok"); // 75.7%
  });

  it("warning: vyplněno 30–74%", () => {
    expect(getDostupnostStatus(15, 33)).toBe("warning");
    expect(getDostupnostStatus(10, 33)).toBe("warning"); // 30.3%
  });

  it("critical: vyplněno < 30%", () => {
    expect(getDostupnostStatus(5, 33)).toBe("critical");
    expect(getDostupnostStatus(0, 33)).toBe("critical");
    expect(getDostupnostStatus(9, 33)).toBe("critical"); // 27.2%
  });

  it("0 celkových dní = ok", () => {
    expect(getDostupnostStatus(0, 0)).toBe("ok");
  });
});

describe("isDatumInRange", () => {
  const today = new Date("2026-03-09");

  it("datum za 14 dní = v rozsahu", () => {
    const d = new Date("2026-03-23");
    expect(isDatumInRange(d, today)).toBe(true);
  });

  it("datum za 60 dní = v rozsahu", () => {
    const d = new Date("2026-05-08");
    expect(isDatumInRange(d, today)).toBe(true);
  });

  it("datum za 13 dní = mimo rozsah", () => {
    const d = new Date("2026-03-22");
    expect(isDatumInRange(d, today)).toBe(false);
  });

  it("datum za 61 dní = mimo rozsah", () => {
    const d = new Date("2026-05-09");
    expect(isDatumInRange(d, today)).toBe(false);
  });

  it("dnešní datum = mimo rozsah", () => {
    expect(isDatumInRange(today, today)).toBe(false);
  });
});

describe("isWorkDay", () => {
  it("pondělí = pracovní den", () => {
    expect(isWorkDay(new Date("2026-03-23"))).toBe(true);
  });

  it("pátek = pracovní den", () => {
    expect(isWorkDay(new Date("2026-03-27"))).toBe(true);
  });

  it("sobota = nepracovní", () => {
    expect(isWorkDay(new Date("2026-03-28"))).toBe(false);
  });

  it("neděle = nepracovní", () => {
    expect(isWorkDay(new Date("2026-03-29"))).toBe(false);
  });
});

describe("formatDatumCz", () => {
  it("formátuje pondělí", () => {
    expect(formatDatumCz(new Date("2026-03-23"))).toBe("Po 23. 3.");
  });

  it("formátuje neděli", () => {
    expect(formatDatumCz(new Date("2026-03-29"))).toBe("Ne 29. 3.");
  });
});

describe("formatCasCz", () => {
  it("odstraní leading zero", () => {
    expect(formatCasCz("08:00")).toBe("8:00");
    expect(formatCasCz("09:30")).toBe("9:30");
  });

  it("zachová dvouciferné hodiny", () => {
    expect(formatCasCz("14:30")).toBe("14:30");
    expect(formatCasCz("16:00")).toBe("16:00");
  });
});

describe("generateDateRange", () => {
  it("generuje 7 dní za celý týden", () => {
    const od = localDate(2026, 3, 23);
    const doDate = localDate(2026, 3, 29);
    const dates = generateDateRange(od, doDate);
    expect(dates).toHaveLength(7);
    expect(toYMD(dates[0])).toBe("2026-03-23");
    expect(toYMD(dates[6])).toBe("2026-03-29");
  });

  it("generuje 1 den pro stejné datum", () => {
    const od = localDate(2026, 3, 23);
    expect(generateDateRange(od, od)).toHaveLength(1);
  });
});

describe("groupByWeeks", () => {
  it("seskupí datumy do týdnů (po 7 dnech)", () => {
    const od = new Date("2026-03-23"); // pondělí
    const doDate = new Date("2026-04-05"); // neděle
    const dates = generateDateRange(od, doDate);
    const weeks = groupByWeeks(dates);

    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toHaveLength(7);
    expect(weeks[1]).toHaveLength(7);
  });

  it("doplní null pro neúplný první týden", () => {
    const od = new Date("2026-03-25"); // středa
    const doDate = new Date("2026-03-29"); // neděle
    const dates = generateDateRange(od, doDate);
    const weeks = groupByWeeks(dates);

    expect(weeks).toHaveLength(1);
    expect(weeks[0][0]).toBeNull(); // pondělí
    expect(weeks[0][1]).toBeNull(); // úterý
    expect(weeks[0][2]).not.toBeNull(); // středa
  });
});
