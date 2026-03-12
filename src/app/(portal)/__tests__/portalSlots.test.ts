import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------
// Slot generation logic tests
// ---------------------------------------------------------------

describe("slot generation from dostupnost", () => {
  // Simulate the slot generation logic from portalSlots.ts
  function generateSlots(
    dostupnost: { datum: string; cas_od: string; cas_do: string }[],
    existingZasahy: { datum: string; cas_od: string; cas_do: string }[],
  ) {
    const zasahyByDate = new Map<string, { cas_od: string; cas_do: string }[]>();
    for (const z of existingZasahy) {
      const existing = zasahyByDate.get(z.datum) ?? [];
      existing.push({ cas_od: z.cas_od, cas_do: z.cas_do });
      zasahyByDate.set(z.datum, existing);
    }

    const slots: { datum: string; cas_od: string; cas_do: string }[] = [];

    for (const d of dostupnost) {
      const dayZasahy = zasahyByDate.get(d.datum) ?? [];
      const startHour = parseInt(d.cas_od.substring(0, 2));
      const endHour = parseInt(d.cas_do.substring(0, 2));

      for (let h = startHour; h < endHour; h++) {
        const slotStart = `${String(h).padStart(2, "0")}:00`;
        const slotEnd = `${String(h + 1).padStart(2, "0")}:00`;

        const hasConflict = dayZasahy.some((z) => {
          const zStart = z.cas_od.substring(0, 5);
          const zEnd = z.cas_do.substring(0, 5);
          return slotStart < zEnd && slotEnd > zStart;
        });

        if (!hasConflict) {
          slots.push({ datum: d.datum, cas_od: slotStart, cas_do: slotEnd });
        }
      }
    }

    return slots;
  }

  it("generates 1-hour slots from dostupnost", () => {
    const dostupnost = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "12:00" },
    ];
    const slots = generateSlots(dostupnost, []);
    expect(slots.length).toBe(4);
    expect(slots[0]).toEqual({ datum: "2026-03-15", cas_od: "08:00", cas_do: "09:00" });
    expect(slots[3]).toEqual({ datum: "2026-03-15", cas_od: "11:00", cas_do: "12:00" });
  });

  it("excludes slots that conflict with existing zasahy", () => {
    const dostupnost = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "12:00" },
    ];
    const existingZasahy = [
      { datum: "2026-03-15", cas_od: "09:00", cas_do: "10:00" },
    ];
    const slots = generateSlots(dostupnost, existingZasahy);
    expect(slots.length).toBe(3);
    expect(slots.map((s) => s.cas_od)).toEqual(["08:00", "10:00", "11:00"]);
  });

  it("handles multiple dostupnost entries on same day", () => {
    const dostupnost = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "10:00" },
      { datum: "2026-03-15", cas_od: "14:00", cas_do: "16:00" },
    ];
    const slots = generateSlots(dostupnost, []);
    expect(slots.length).toBe(4);
    expect(slots[0].cas_od).toBe("08:00");
    expect(slots[2].cas_od).toBe("14:00");
  });

  it("returns empty for no dostupnost", () => {
    const slots = generateSlots([], []);
    expect(slots.length).toBe(0);
  });

  it("handles fully booked day", () => {
    const dostupnost = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "10:00" },
    ];
    const existingZasahy = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "09:00" },
      { datum: "2026-03-15", cas_od: "09:00", cas_do: "10:00" },
    ];
    const slots = generateSlots(dostupnost, existingZasahy);
    expect(slots.length).toBe(0);
  });

  it("handles overlapping zasahy correctly", () => {
    const dostupnost = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "12:00" },
    ];
    const existingZasahy = [
      { datum: "2026-03-15", cas_od: "08:30", cas_do: "10:30" },
    ];
    const slots = generateSlots(dostupnost, existingZasahy);
    // 08:00-09:00 conflicts (overlaps 08:30-10:30)
    // 09:00-10:00 conflicts (overlaps 08:30-10:30)
    // 10:00-11:00 conflicts (overlaps 08:30-10:30)
    // 11:00-12:00 free
    expect(slots.length).toBe(1);
    expect(slots[0].cas_od).toBe("11:00");
  });

  it("handles multiple days", () => {
    const dostupnost = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "10:00" },
      { datum: "2026-03-16", cas_od: "08:00", cas_do: "10:00" },
    ];
    const existingZasahy = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "09:00" },
    ];
    const slots = generateSlots(dostupnost, existingZasahy);
    expect(slots.length).toBe(3); // 1 on day 1, 2 on day 2
  });
});

// ---------------------------------------------------------------
// Booking validation tests
// ---------------------------------------------------------------

describe("booking validation", () => {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_REGEX = /^\d{2}:\d{2}$/;

  it("validates UUID format", () => {
    expect(UUID_REGEX.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(UUID_REGEX.test("not-a-uuid")).toBe(false);
    expect(UUID_REGEX.test("")).toBe(false);
  });

  it("validates date format", () => {
    expect(DATE_REGEX.test("2026-03-15")).toBe(true);
    expect(DATE_REGEX.test("15-03-2026")).toBe(false);
    expect(DATE_REGEX.test("2026/03/15")).toBe(false);
  });

  it("validates time format", () => {
    expect(TIME_REGEX.test("08:00")).toBe(true);
    expect(TIME_REGEX.test("14:30")).toBe(true);
    expect(TIME_REGEX.test("8:00")).toBe(false);
    expect(TIME_REGEX.test("08:00:00")).toBe(false);
  });

  it("slot availability check — slot must exist in available list", () => {
    const availableSlots = [
      { datum: "2026-03-15", cas_od: "08:00", cas_do: "09:00" },
      { datum: "2026-03-15", cas_od: "10:00", cas_do: "11:00" },
    ];

    const selected = { datum: "2026-03-15", cas_od: "08:00", cas_do: "09:00" };
    const exists = availableSlots.some(
      (s) => s.datum === selected.datum && s.cas_od === selected.cas_od && s.cas_do === selected.cas_do,
    );
    expect(exists).toBe(true);

    const unavailable = { datum: "2026-03-15", cas_od: "09:00", cas_do: "10:00" };
    const exists2 = availableSlots.some(
      (s) => s.datum === unavailable.datum && s.cas_od === unavailable.cas_od && s.cas_do === unavailable.cas_do,
    );
    expect(exists2).toBe(false);
  });
});

// ---------------------------------------------------------------
// Pripominka filtering for klient
// ---------------------------------------------------------------

describe("pripominka filtering for klient portal", () => {
  it("filters pripominky by klient_id", () => {
    const klientId = "klient-1";
    const pripominky = [
      { id: "p1", zakazky: { objekty: { klient_id: "klient-1" } } },
      { id: "p2", zakazky: { objekty: { klient_id: "klient-2" } } },
      { id: "p3", zakazky: { objekty: { klient_id: "klient-1" } } },
    ];

    const filtered = pripominky.filter(
      (p) => p.zakazky?.objekty?.klient_id === klientId,
    );

    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toBe("p1");
    expect(filtered[1].id).toBe("p3");
  });

  it("returns empty when no active pripominky", () => {
    const klientId = "klient-1";
    const pripominky: { id: string; zakazky: { objekty: { klient_id: string } } }[] = [];

    const filtered = pripominky.filter(
      (p) => p.zakazky?.objekty?.klient_id === klientId,
    );
    expect(filtered.length).toBe(0);
  });
});
