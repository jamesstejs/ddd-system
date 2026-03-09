import { describe, it, expect } from "vitest";
import {
  haversineDistanceKm,
  ROAD_COEFFICIENT,
  estimateRoadDistanceKm,
  getAverageSpeedKmh,
  estimateTravelTimeMinutes,
  formatTravelTime,
  estimateTravelInfo,
  detectCollision,
  parseTimeToMinutes,
  computeTravelEstimates,
  type TravelEstimate,
} from "../travelUtils";

// ---------- Known reference points ----------
// Praha (Václavské náměstí): 50.0814, 14.4270
// Brno (Náměstí Svobody): 49.1951, 16.6068
// Air distance Praha–Brno ≈ 185 km

const PRAHA_LAT = 50.0814;
const PRAHA_LNG = 14.427;
const BRNO_LAT = 49.1951;
const BRNO_LNG = 16.6068;

// Krátká vzdálenost — Praha centrum (Václavák → Hlavní nádraží ≈ 1.2 km)
const NADRAZI_LAT = 50.0833;
const NADRAZI_LNG = 14.4346;

describe("haversineDistanceKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceKm(50, 14, 50, 14)).toBe(0);
  });

  it("Praha–Brno ≈ 185 km (±10 km tolerance)", () => {
    const dist = haversineDistanceKm(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    expect(dist).toBeGreaterThan(175);
    expect(dist).toBeLessThan(195);
  });

  it("short distance Praha centrum ≈ 1.0–1.5 km", () => {
    const dist = haversineDistanceKm(
      PRAHA_LAT,
      PRAHA_LNG,
      NADRAZI_LAT,
      NADRAZI_LNG,
    );
    expect(dist).toBeGreaterThan(0.5);
    expect(dist).toBeLessThan(2.0);
  });

  it("is symmetric (A→B = B→A)", () => {
    const ab = haversineDistanceKm(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    const ba = haversineDistanceKm(
      BRNO_LAT,
      BRNO_LNG,
      PRAHA_LAT,
      PRAHA_LNG,
    );
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe("ROAD_COEFFICIENT", () => {
  it("is 1.4", () => {
    expect(ROAD_COEFFICIENT).toBe(1.4);
  });
});

describe("estimateRoadDistanceKm", () => {
  it("returns air distance × 1.4", () => {
    const air = haversineDistanceKm(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    const road = estimateRoadDistanceKm(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    expect(road).toBeCloseTo(air * 1.4, 5);
  });

  it("returns 0 for identical points", () => {
    expect(estimateRoadDistanceKm(50, 14, 50, 14)).toBe(0);
  });
});

describe("getAverageSpeedKmh", () => {
  it("≤5 km → 30 km/h (město)", () => {
    expect(getAverageSpeedKmh(2)).toBe(30);
    expect(getAverageSpeedKmh(5)).toBe(30);
  });

  it("5–15 km → 40 km/h (příměstské)", () => {
    expect(getAverageSpeedKmh(10)).toBe(40);
    expect(getAverageSpeedKmh(15)).toBe(40);
  });

  it("15–50 km → 50 km/h (meziměstské)", () => {
    expect(getAverageSpeedKmh(20)).toBe(50);
    expect(getAverageSpeedKmh(50)).toBe(50);
  });

  it(">50 km → 60 km/h (dálnice)", () => {
    expect(getAverageSpeedKmh(100)).toBe(60);
    expect(getAverageSpeedKmh(300)).toBe(60);
  });
});

describe("estimateTravelTimeMinutes", () => {
  it("returns null when any coordinate is null", () => {
    expect(estimateTravelTimeMinutes(null, 14, 50, 14)).toBeNull();
    expect(estimateTravelTimeMinutes(50, null, 50, 14)).toBeNull();
    expect(estimateTravelTimeMinutes(50, 14, null, 14)).toBeNull();
    expect(estimateTravelTimeMinutes(50, 14, 50, null)).toBeNull();
  });

  it("returns null when any coordinate is undefined", () => {
    expect(estimateTravelTimeMinutes(undefined, 14, 50, 14)).toBeNull();
  });

  it("returns 0 for very close points (< 0.2 km road)", () => {
    // Same point
    expect(estimateTravelTimeMinutes(50.0, 14.0, 50.0, 14.0)).toBe(0);
  });

  it("returns minimum 5 minutes for short distances", () => {
    // Very short distance — should be at least 5 min
    const result = estimateTravelTimeMinutes(
      PRAHA_LAT,
      PRAHA_LNG,
      NADRAZI_LAT,
      NADRAZI_LNG,
    );
    expect(result).toBeGreaterThanOrEqual(5);
  });

  it("Praha–Brno reasonable travel time (3–6 hours)", () => {
    const result = estimateTravelTimeMinutes(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    expect(result).not.toBeNull();
    // Road distance ≈ 185 * 1.4 = 259 km, speed 60 km/h → ~259 min ≈ 4.3h
    expect(result!).toBeGreaterThan(180);
    expect(result!).toBeLessThan(360);
  });

  it("result is an integer (ceiling)", () => {
    const result = estimateTravelTimeMinutes(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    expect(result).not.toBeNull();
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("formatTravelTime", () => {
  it("formats minutes under 60", () => {
    expect(formatTravelTime(5)).toBe("~5 min");
    expect(formatTravelTime(15)).toBe("~15 min");
    expect(formatTravelTime(59)).toBe("~59 min");
  });

  it("formats exact hours", () => {
    expect(formatTravelTime(60)).toBe("~1h");
    expect(formatTravelTime(120)).toBe("~2h");
  });

  it("formats hours + minutes", () => {
    expect(formatTravelTime(70)).toBe("~1h 10 min");
    expect(formatTravelTime(90)).toBe("~1h 30 min");
    expect(formatTravelTime(150)).toBe("~2h 30 min");
  });
});

describe("estimateTravelInfo", () => {
  it("returns null when any coordinate is null", () => {
    expect(estimateTravelInfo(null, 14, 50, 14)).toBeNull();
  });

  it("returns zero for very close points", () => {
    const result = estimateTravelInfo(50.0, 14.0, 50.0, 14.0);
    expect(result).toEqual({ distanceKm: 0, travelMinutes: 0 });
  });

  it("returns distance and time for valid points", () => {
    const result = estimateTravelInfo(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    expect(result).not.toBeNull();
    expect(result!.distanceKm).toBeGreaterThan(200);
    expect(result!.travelMinutes).toBeGreaterThan(180);
  });

  it("distanceKm is rounded to 1 decimal", () => {
    const result = estimateTravelInfo(
      PRAHA_LAT,
      PRAHA_LNG,
      BRNO_LAT,
      BRNO_LNG,
    );
    expect(result).not.toBeNull();
    const decimals = result!.distanceKm.toString().split(".")[1];
    expect(!decimals || decimals.length <= 1).toBe(true);
  });
});

describe("parseTimeToMinutes", () => {
  it("parses HH:MM format", () => {
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
    expect(parseTimeToMinutes("12:00")).toBe(720);
  });

  it("parses HH:MM:SS format (ignoring seconds)", () => {
    expect(parseTimeToMinutes("08:30:00")).toBe(510);
    expect(parseTimeToMinutes("14:15:45")).toBe(855);
  });

  it("returns null for invalid format", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
    expect(parseTimeToMinutes("25")).toBeNull();
  });
});

describe("detectCollision", () => {
  it("no collision when enough gap", () => {
    // Prev ends 09:00, next starts 10:00, travel 30 min → no collision (09:00 + 30 = 09:30 < 10:00)
    expect(detectCollision("09:00", "10:00", 30)).toBe(false);
  });

  it("no collision when exactly on time", () => {
    // Prev ends 09:00, next starts 09:30, travel 30 min → 09:00 + 30 = 09:30 = 09:30 → no collision (not >)
    expect(detectCollision("09:00", "09:30", 30)).toBe(false);
  });

  it("collision when travel exceeds gap", () => {
    // Prev ends 09:00, next starts 09:20, travel 30 min → 09:00 + 30 = 09:30 > 09:20
    expect(detectCollision("09:00", "09:20", 30)).toBe(true);
  });

  it("collision when travel exactly overlaps", () => {
    // Prev ends 09:00, next starts 09:29, travel 30 min → 09:00 + 30 = 09:30 > 09:29
    expect(detectCollision("09:00", "09:29", 30)).toBe(true);
  });

  it("no collision with 0 travel time", () => {
    expect(detectCollision("09:00", "09:00", 0)).toBe(false);
  });

  it("handles HH:MM:SS format", () => {
    expect(detectCollision("09:00:00", "09:20:00", 30)).toBe(true);
    expect(detectCollision("09:00:00", "10:00:00", 30)).toBe(false);
  });

  it("returns false for invalid times", () => {
    expect(detectCollision("invalid", "10:00", 30)).toBe(false);
  });
});

describe("computeTravelEstimates", () => {
  type TestZasah = {
    id: string;
    lat: number | null;
    lng: number | null;
    cas_od: string;
    cas_do: string;
  };

  const makeZasah = (
    id: string,
    lat: number | null,
    lng: number | null,
    cas_od: string,
    cas_do: string,
  ): TestZasah => ({ id, lat, lng, cas_od, cas_do });

  it("returns empty array for single zasah", () => {
    const zasahy = [makeZasah("a", 50, 14, "08:00", "09:00")];
    const result = computeTravelEstimates(
      zasahy,
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result).toEqual([]);
  });

  it("returns empty array for empty input", () => {
    const result = computeTravelEstimates<TestZasah>(
      [],
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result).toEqual([]);
  });

  it("computes one estimate for two zasahy", () => {
    const zasahy = [
      makeZasah("a", PRAHA_LAT, PRAHA_LNG, "08:00", "09:00"),
      makeZasah("b", BRNO_LAT, BRNO_LNG, "10:00", "11:00"),
    ];
    const result = computeTravelEstimates(
      zasahy,
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result).toHaveLength(1);
    expect(result[0].fromZasahId).toBe("a");
    expect(result[0].toZasahId).toBe("b");
    expect(result[0].distanceKm).not.toBeNull();
    expect(result[0].travelMinutes).not.toBeNull();
    expect(result[0].distanceKm!).toBeGreaterThan(200);
  });

  it("detects collision between close-in-time distant zasahy", () => {
    // Praha → Brno, prev ends 09:00, next starts 09:30 → travel ~260 min → collision
    const zasahy = [
      makeZasah("a", PRAHA_LAT, PRAHA_LNG, "08:00", "09:00"),
      makeZasah("b", BRNO_LAT, BRNO_LNG, "09:30", "10:30"),
    ];
    const result = computeTravelEstimates(
      zasahy,
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result[0].hasCollision).toBe(true);
  });

  it("no collision for nearby zasahy with enough time", () => {
    // Same location, prev ends 09:00, next starts 09:30 → travel 0 min → no collision
    const zasahy = [
      makeZasah("a", PRAHA_LAT, PRAHA_LNG, "08:00", "09:00"),
      makeZasah("b", PRAHA_LAT, PRAHA_LNG, "09:30", "10:30"),
    ];
    const result = computeTravelEstimates(
      zasahy,
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result[0].hasCollision).toBe(false);
    expect(result[0].travelMinutes).toBe(0);
  });

  it("handles null coordinates gracefully", () => {
    const zasahy = [
      makeZasah("a", null, null, "08:00", "09:00"),
      makeZasah("b", 50, 14, "10:00", "11:00"),
    ];
    const result = computeTravelEstimates(
      zasahy,
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result[0].distanceKm).toBeNull();
    expect(result[0].travelMinutes).toBeNull();
    expect(result[0].hasCollision).toBe(false);
  });

  it("computes N-1 estimates for N zasahy", () => {
    const zasahy = [
      makeZasah("a", 50.0, 14.0, "08:00", "09:00"),
      makeZasah("b", 50.1, 14.1, "10:00", "11:00"),
      makeZasah("c", 50.2, 14.2, "12:00", "13:00"),
      makeZasah("d", 50.3, 14.3, "14:00", "15:00"),
    ];
    const result = computeTravelEstimates(
      zasahy,
      (z) => z.id,
      (z) => ({ lat: z.lat, lng: z.lng }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
    expect(result).toHaveLength(3);
    expect(result[0].fromZasahId).toBe("a");
    expect(result[0].toZasahId).toBe("b");
    expect(result[1].fromZasahId).toBe("b");
    expect(result[1].toZasahId).toBe("c");
    expect(result[2].fromZasahId).toBe("c");
    expect(result[2].toZasahId).toBe("d");
  });
});
