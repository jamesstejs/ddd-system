import { describe, it, expect } from "vitest";
import { vypocetBodu, type SablonaBodu } from "../vypocetBodu";

// ---- Test data: Gastro × Vnitřní deratizace (from CLAUDE.md) ----
const gastroVnitrniDerat: SablonaBodu[] = [
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 0, rozsah_m2_do: 50, bod_s_mys: 2, bod_l_potkan: 1, zivolovna: 1, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 51, rozsah_m2_do: 100, bod_s_mys: 3, bod_l_potkan: 1, zivolovna: 1, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 101, rozsah_m2_do: 150, bod_s_mys: 5, bod_l_potkan: 2, zivolovna: 1, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 151, rozsah_m2_do: 200, bod_s_mys: 7, bod_l_potkan: 2, zivolovna: 2, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 201, rozsah_m2_do: 300, bod_s_mys: 9, bod_l_potkan: 3, zivolovna: 2, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 301, rozsah_m2_do: 400, bod_s_mys: 11, bod_l_potkan: 3, zivolovna: 2, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 401, rozsah_m2_do: 600, bod_s_mys: 13, bod_l_potkan: 4, zivolovna: 2, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 601, rozsah_m2_do: 800, bod_s_mys: 15, bod_l_potkan: 5, zivolovna: 3, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 801, rozsah_m2_do: 1000, bod_s_mys: 17, bod_l_potkan: 6, zivolovna: 3, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 1001, rozsah_m2_do: 1500, bod_s_mys: 22, bod_l_potkan: 7, zivolovna: 3, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 1501, rozsah_m2_do: 2000, bod_s_mys: 27, bod_l_potkan: 8, zivolovna: 4, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 2001, rozsah_m2_do: 2500, bod_s_mys: 32, bod_l_potkan: 10, zivolovna: 5, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 2501, rozsah_m2_do: 3000, bod_s_mys: 37, bod_l_potkan: 12, zivolovna: 6, letajici: 0, lezouci: 0, vzorec_nad_max: null },
  {
    typ_objektu: "gastro", typ_zasahu: "vnitrni_deratizace", rozsah_m2_od: 3001, rozsah_m2_do: null,
    bod_s_mys: 37, bod_l_potkan: 12, zivolovna: 6, letajici: 0, lezouci: 0,
    vzorec_nad_max: {
      zaklad_m2: 3000,
      bod_s_mys: { zaklad: 37, prirustek: 8, za_m2: 1000 },
      bod_l_potkan: { zaklad: 12, prirustek: 2, za_m2: 1000 },
      zivolovna: { zaklad: 6, prirustek: 1, za_m2: 1000 },
    },
  },
];

// ---- Test data: Gastro × Vnitřní dezinsekce ----
const gastroDezinsekce: SablonaBodu[] = [
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_dezinsekce", rozsah_m2_od: 0, rozsah_m2_do: 50, bod_s_mys: 0, bod_l_potkan: 0, zivolovna: 0, letajici: 1, lezouci: 2, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_dezinsekce", rozsah_m2_od: 51, rozsah_m2_do: 100, bod_s_mys: 0, bod_l_potkan: 0, zivolovna: 0, letajici: 2, lezouci: 3, vzorec_nad_max: null },
  { typ_objektu: "gastro", typ_zasahu: "vnitrni_dezinsekce", rozsah_m2_od: 101, rozsah_m2_do: 200, bod_s_mys: 0, bod_l_potkan: 0, zivolovna: 0, letajici: 3, lezouci: 4, vzorec_nad_max: null },
];

// Combine all templates
const allSablony = [...gastroVnitrniDerat, ...gastroDezinsekce];

describe("vypocetBodu", () => {
  describe("basic lookups — Gastro × Vnitřní deratizace", () => {
    it("returns correct values for 50m² (first range)", () => {
      const result = vypocetBodu(allSablony, "gastro", 50, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 2,
        bod_l_potkan: 1,
        zivolovna: 1,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: false,
      });
    });

    it("returns correct values for 100m² (boundary — end of range 2)", () => {
      const result = vypocetBodu(allSablony, "gastro", 100, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 3,
        bod_l_potkan: 1,
        zivolovna: 1,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: false,
      });
    });

    it("returns correct values for 250m² (mid-range)", () => {
      const result = vypocetBodu(allSablony, "gastro", 250, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 9,
        bod_l_potkan: 3,
        zivolovna: 2,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: false,
      });
    });

    it("returns correct values for 3000m² (last fixed range)", () => {
      const result = vypocetBodu(allSablony, "gastro", 3000, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 37,
        bod_l_potkan: 12,
        zivolovna: 6,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: false,
      });
    });
  });

  describe("formula calculation — Gastro >3000m²", () => {
    it("calculates correctly for 3500m²", () => {
      // bod_s_mys: 37 + ceil(500/1000)*8 = 37 + 1*8 = 45
      // bod_l_potkan: 12 + ceil(500/1000)*2 = 12 + 1*2 = 14
      // zivolovna: 6 + ceil(500/1000)*1 = 6 + 1 = 7
      const result = vypocetBodu(allSablony, "gastro", 3500, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 45,
        bod_l_potkan: 14,
        zivolovna: 7,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: true,
      });
    });

    it("calculates correctly for 5000m²", () => {
      // bod_s_mys: 37 + ceil(2000/1000)*8 = 37 + 2*8 = 53
      // bod_l_potkan: 12 + ceil(2000/1000)*2 = 12 + 4 = 16
      // zivolovna: 6 + ceil(2000/1000)*1 = 6 + 2 = 8
      const result = vypocetBodu(allSablony, "gastro", 5000, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 53,
        bod_l_potkan: 16,
        zivolovna: 8,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: true,
      });
    });

    it("calculates correctly for 3001m² (just above max)", () => {
      // bod_s_mys: 37 + ceil(1/1000)*8 = 37 + 1*8 = 45
      // bod_l_potkan: 12 + ceil(1/1000)*2 = 12 + 2 = 14
      // zivolovna: 6 + ceil(1/1000)*1 = 6 + 1 = 7
      const result = vypocetBodu(allSablony, "gastro", 3001, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 45,
        bod_l_potkan: 14,
        zivolovna: 7,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: true,
      });
    });

    it("calculates correctly for 10000m²", () => {
      // bod_s_mys: 37 + ceil(7000/1000)*8 = 37 + 7*8 = 93
      // bod_l_potkan: 12 + ceil(7000/1000)*2 = 12 + 14 = 26
      // zivolovna: 6 + ceil(7000/1000)*1 = 6 + 7 = 13
      const result = vypocetBodu(allSablony, "gastro", 10000, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 93,
        bod_l_potkan: 26,
        zivolovna: 13,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: true,
      });
    });
  });

  describe("dezinsekce — letajici + lezouci columns", () => {
    it("returns insect monitoring values for 50m²", () => {
      const result = vypocetBodu(allSablony, "gastro", 50, "vnitrni_dezinsekce");
      expect(result).toEqual({
        bod_s_mys: 0,
        bod_l_potkan: 0,
        zivolovna: 0,
        letajici: 1,
        lezouci: 2,
        pouzit_vzorec: false,
      });
    });

    it("returns insect monitoring values for 150m²", () => {
      const result = vypocetBodu(allSablony, "gastro", 150, "vnitrni_dezinsekce");
      expect(result).toEqual({
        bod_s_mys: 0,
        bod_l_potkan: 0,
        zivolovna: 0,
        letajici: 3,
        lezouci: 4,
        pouzit_vzorec: false,
      });
    });
  });

  describe("edge cases", () => {
    it("returns null for 0 m²", () => {
      expect(vypocetBodu(allSablony, "gastro", 0, "vnitrni_deratizace")).toBeNull();
    });

    it("returns null for negative plocha", () => {
      expect(vypocetBodu(allSablony, "gastro", -10, "vnitrni_deratizace")).toBeNull();
    });

    it("returns null for non-existent typ_objektu", () => {
      expect(vypocetBodu(allSablony, "neexistuje", 100, "vnitrni_deratizace")).toBeNull();
    });

    it("returns null for non-existent typ_zasahu", () => {
      expect(vypocetBodu(allSablony, "gastro", 100, "neexistuje")).toBeNull();
    });

    it("returns null for empty sablony array", () => {
      expect(vypocetBodu([], "gastro", 100, "vnitrni_deratizace")).toBeNull();
    });

    it("returns null for empty typ_objektu", () => {
      expect(vypocetBodu(allSablony, "", 100, "vnitrni_deratizace")).toBeNull();
    });

    it("returns null for empty typ_zasahu", () => {
      expect(vypocetBodu(allSablony, "gastro", 100, "")).toBeNull();
    });
  });

  describe("multi-type batch pattern (used by batch action)", () => {
    it("returns independent results for different typ_zasahu on same plocha", () => {
      const deratResult = vypocetBodu(allSablony, "gastro", 100, "vnitrni_deratizace");
      const dezinsResult = vypocetBodu(allSablony, "gastro", 100, "vnitrni_dezinsekce");

      // Deratizace → hlodavci body
      expect(deratResult).not.toBeNull();
      expect(deratResult!.bod_s_mys).toBe(3);
      expect(deratResult!.letajici).toBe(0);

      // Dezinsekce → hmyz body
      expect(dezinsResult).not.toBeNull();
      expect(dezinsResult!.bod_s_mys).toBe(0);
      expect(dezinsResult!.letajici).toBe(2);
      expect(dezinsResult!.lezouci).toBe(3);
    });

    it("returns null for typ_zasahu without templates while others succeed", () => {
      const deratResult = vypocetBodu(allSablony, "gastro", 100, "vnitrni_deratizace");
      const postrikResult = vypocetBodu(allSablony, "gastro", 100, "postrik");

      expect(deratResult).not.toBeNull();
      expect(postrikResult).toBeNull(); // no postrik templates in test data
    });
  });

  describe("boundary values", () => {
    it("1m² falls in first range (0-50)", () => {
      const result = vypocetBodu(allSablony, "gastro", 1, "vnitrni_deratizace");
      expect(result).not.toBeNull();
      expect(result!.bod_s_mys).toBe(2);
    });

    it("51m² falls in second range (51-100)", () => {
      const result = vypocetBodu(allSablony, "gastro", 51, "vnitrni_deratizace");
      expect(result).not.toBeNull();
      expect(result!.bod_s_mys).toBe(3);
    });

    it("handles unsorted sablony input correctly", () => {
      // Reverse the array — function should still find the right match
      const reversed = [...gastroVnitrniDerat].reverse();
      const result = vypocetBodu(reversed, "gastro", 250, "vnitrni_deratizace");
      expect(result).toEqual({
        bod_s_mys: 9,
        bod_l_potkan: 3,
        zivolovna: 2,
        letajici: 0,
        lezouci: 0,
        pouzit_vzorec: false,
      });
    });
  });
});
