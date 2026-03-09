import { describe, it, expect } from "vitest";
import {
  vypocetCeny,
  type CenikData,
  type VypocetCenyInput,
} from "../vypocetCeny";

// ---- Inline ceník fixtures (from seed data) ----

const cenikFixture: CenikData = {
  obecne: [
    { nazev: "vyjezd", hodnota: 690, jednotka: "Kč" },
    { nazev: "marny_vyjezd", hodnota: 950, jednotka: "Kč" },
    { nazev: "doprava_km", hodnota: 16, jednotka: "Kč/km" },
    { nazev: "vikend_priplatek", hodnota: 10, jednotka: "%" },
    { nazev: "nocni_priplatek", hodnota: 20, jednotka: "%" },
    { nazev: "minimalni_cena", hodnota: 2500, jednotka: "Kč" },
  ],
  postriky: [
    { kategorie: "stenice_blechy", plocha_od: 0, plocha_do: 30, cena: 2188 },
    { kategorie: "stenice_blechy", plocha_od: 31, plocha_do: 50, cena: 2958 },
    { kategorie: "stenice_blechy", plocha_od: 51, plocha_do: 80, cena: 3178 },
    { kategorie: "stenice_blechy", plocha_od: 81, plocha_do: 100, cena: 3728 },
    { kategorie: "stenice_blechy", plocha_od: 101, plocha_do: 150, cena: 4619 },
    { kategorie: "moli_rybenky", plocha_od: 0, plocha_do: 30, cena: 2188 },
    { kategorie: "moli_rybenky", plocha_od: 31, plocha_do: 50, cena: 2958 },
    { kategorie: "moli_rybenky", plocha_od: 51, plocha_do: 80, cena: 3178 },
    { kategorie: "moli_rybenky", plocha_od: 81, plocha_do: 100, cena: 3728 },
    { kategorie: "moli_rybenky", plocha_od: 101, plocha_do: 150, cena: 4619 },
    { kategorie: "preventivni", plocha_od: 0, plocha_do: null, cena: 1529 },
  ],
  gely: [
    { kategorie: "rusi_svabi_1", bytu_od: 1, bytu_do: 2, cena: 2188 },
    { kategorie: "rusi_svabi_1", bytu_od: 3, bytu_do: 10, cena: 1528 },
    { kategorie: "rusi_svabi_1", bytu_od: 11, bytu_do: 20, cena: 835 },
    { kategorie: "rusi_svabi_1", bytu_od: 21, bytu_do: 30, cena: 648 },
    { kategorie: "rusi_svabi_1", bytu_od: 31, bytu_do: null, cena: 538 },
    { kategorie: "rusi_svabi_2", bytu_od: 1, bytu_do: 2, cena: 4376 },
    { kategorie: "rusi_svabi_2", bytu_od: 3, bytu_do: 10, cena: 3056 },
    { kategorie: "rusi_svabi_2", bytu_od: 11, bytu_do: 20, cena: 1670 },
    { kategorie: "rusi_svabi_2", bytu_od: 21, bytu_do: 30, cena: 1296 },
    { kategorie: "rusi_svabi_2", bytu_od: 31, bytu_do: null, cena: 1076 },
    { kategorie: "mravenci_1", bytu_od: 1, bytu_do: 2, cena: 2188 },
    { kategorie: "mravenci_1", bytu_od: 3, bytu_do: 10, cena: 1528 },
    { kategorie: "mravenci_1", bytu_od: 11, bytu_do: 20, cena: 835 },
    { kategorie: "mravenci_1", bytu_od: 21, bytu_do: 30, cena: 648 },
    { kategorie: "mravenci_1", bytu_od: 31, bytu_do: null, cena: 538 },
  ],
  specialni: [
    { nazev: "Vosy a sršni", cena_od: 2100, cena_do: 3200 },
    {
      nazev: "Ubytovny — za pokoj (max 3 postele)",
      cena_od: 1989,
      cena_do: null,
    },
    { nazev: "Ubytovny — za další postel", cena_od: 825, cena_do: null },
  ],
  deratizace: [
    { nazev: "Plastová stanička MYŠ (8×4×8 cm)", cena_za_kus: 90 },
    { nazev: "Sklapovací pastička na MYŠ", cena_za_kus: 90 },
    { nazev: "Plastová stanice POTKAN (25×7×7 cm)", cena_za_kus: 170 },
    { nazev: "Živolovka MYŠ (kovová)", cena_za_kus: 349 },
    { nazev: "Živolovka POTKAN (kovová)", cena_za_kus: 849 },
    { nazev: "Náplň do stanic (nástraha)", cena_za_kus: 99 },
    { nazev: "Pěna Racumin — částečné ošetření", cena_za_kus: 999 },
    { nazev: "Pěna Racumin — celé ošetření", cena_za_kus: 1299 },
    { nazev: "Práce technika — firmy hlavní", cena_za_kus: 1639 },
    { nazev: "Práce technika — krajánci + domácnosti", cena_za_kus: 999 },
  ],
  dezinfekce: [
    { typ: "postrik", plocha_od: 0, plocha_do: 100, cena_za_m: 70 },
    { typ: "postrik", plocha_od: 101, plocha_do: 200, cena_za_m: 50 },
    { typ: "postrik", plocha_od: 201, plocha_do: 500, cena_za_m: 30 },
    { typ: "postrik", plocha_od: 501, plocha_do: 1000, cena_za_m: 11 },
    { typ: "aerosol", plocha_od: 0, plocha_do: 100, cena_za_m: 50 },
    { typ: "aerosol", plocha_od: 101, plocha_do: 200, cena_za_m: 40 },
    { typ: "aerosol", plocha_od: 201, plocha_do: 500, cena_za_m: 19 },
    { typ: "aerosol", plocha_od: 501, plocha_do: 1000, cena_za_m: 11 },
  ],
};

// ---- Default input base ----

const baseInput: VypocetCenyInput = {
  typ_zakazky: "jednorazova",
  typy_zasahu: [],
  skudci: [],
  plocha_m2: 50,
  doprava_km: 0,
  je_prvni_navsteva: true,
  je_vikend: false,
  je_nocni: false,
  individualni_sleva_procent: 0,
  dph_sazba: 21,
};

// ---- Tests ----

describe("vypocetCeny", () => {
  describe("jednorázová — postřiky", () => {
    it("štěnice 50m² = 2958 + 690 výjezd = 3648 základ", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typ_zakazky: "jednorazova",
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
      });

      // Polozky: výjezd (690) + postřik (2958)
      expect(result.polozky).toHaveLength(2);
      expect(result.mezisouce).toBe(3648);
      expect(result.cena_zaklad).toBe(3648);
      expect(result.dph_castka).toBe(766.08);
      expect(result.cena_s_dph).toBe(4414.08);
    });

    it("štěnice 30m² = 2188 + 690 = 2878", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 30,
      });

      expect(result.mezisouce).toBe(2878);
      expect(result.cena_zaklad).toBe(2878);
    });

    it("štěnice 100m² = 3728 + 690 = 4418", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 100,
      });

      expect(result.mezisouce).toBe(4418);
    });
  });

  describe("smluvní — deratizace monitoring", () => {
    it("8 bodů potkan + výjezd + 10km = 8×170 + 690 + 160 + 1639 = 3849", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typ_zakazky: "smluvni",
        typy_zasahu: ["vnitrni_deratizace"],
        doprava_km: 10,
        je_prvni_navsteva: true,
        pocet_bodu_potkan: 8,
      });

      // Polozky: výjezd(690) + doprava(160) + práce technika(1639) + potkan(8×170=1360)
      expect(result.polozky).toHaveLength(4);
      expect(result.mezisouce).toBe(3849);
      expect(result.cena_zaklad).toBe(3849);
    });

    it("follow-up 8 bodů potkan = 8×99 + 690 + 1639 = 3121", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typ_zakazky: "smluvni",
        typy_zasahu: ["vnitrni_deratizace"],
        doprava_km: 0,
        je_prvni_navsteva: false,
        pocet_bodu_potkan: 8,
      });

      // Polozky: výjezd(690) + práce(1639) + kontrola(8×99=792)
      expect(result.polozky).toHaveLength(3);
      expect(result.mezisouce).toBe(3121);
    });

    it("mixed body: 5 myš + 3 potkan, první návštěva", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typ_zakazky: "smluvni",
        typy_zasahu: ["vnitrni_deratizace"],
        doprava_km: 0,
        je_prvni_navsteva: true,
        pocet_bodu_mys: 5,
        pocet_bodu_potkan: 3,
      });

      // výjezd(690) + práce(1639) + myš(5×90=450) + potkan(3×170=510) = 3289
      expect(result.mezisouce).toBe(3289);
    });
  });

  describe("slevy", () => {
    it("sleva 10% admin: základ 3648, po slevě 3283.20", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        sleva_typ: "procenta",
        sleva_hodnota: 10,
      });

      expect(result.mezisouce).toBe(3648);
      expect(result.sleva_rucni).toBe(364.8);
      expect(result.cena_zaklad).toBe(3283.2);
    });

    it("sleva Kč: základ 3648, sleva 500 Kč = 3148", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        sleva_typ: "castka",
        sleva_hodnota: 500,
      });

      expect(result.sleva_rucni).toBe(500);
      expect(result.cena_zaklad).toBe(3148);
    });

    it("sleva přes minimum: základ 3000, sleva 40% → 1800 → musí vrátit 2500", () => {
      // Need to construct a case where mezisouce=3000
      // Use smluvní with exact amounts to get 3000
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        sleva_typ: "procenta",
        sleva_hodnota: 40,
      });

      // základ 3648, 40% sleva = 1459.2 → 3648-1459.2=2188.8 < 2500 → minimum
      expect(result.minimum_aplikovano).toBe(true);
      expect(result.cena_zaklad).toBe(2500);
    });

    it("individuální sleva klienta 5%", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        individualni_sleva_procent: 5,
      });

      // základ 3648, klient sleva 5% = 182.4 → 3465.6
      expect(result.sleva_klient).toBe(182.4);
      expect(result.cena_zaklad).toBe(3465.6);
    });

    it("kombinace: klient 5% + admin 10%", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        individualni_sleva_procent: 5,
        sleva_typ: "procenta",
        sleva_hodnota: 10,
      });

      // základ 3648
      // klient 5%: 3648 * 0.05 = 182.4 → 3465.6
      // admin 10%: 3465.6 * 0.10 = 346.56 → 3119.04
      expect(result.sleva_klient).toBe(182.4);
      expect(result.sleva_rucni).toBe(346.56);
      expect(result.cena_zaklad).toBe(3119.04);
    });
  });

  describe("DPH", () => {
    it("DPH 21% z 2500 = 525, celkem 3025", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        // Force minimum to kick in — empty skudci + no typy = only výjezd 690 < 2500
        typy_zasahu: [],
        skudci: [],
        dph_sazba: 21,
      });

      expect(result.minimum_aplikovano).toBe(true);
      expect(result.cena_zaklad).toBe(2500);
      expect(result.dph_castka).toBe(525);
      expect(result.cena_s_dph).toBe(3025);
    });

    it("DPH 15% z 2500 = 375, celkem 2875", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: [],
        skudci: [],
        dph_sazba: 15,
      });

      expect(result.cena_zaklad).toBe(2500);
      expect(result.dph_castka).toBe(375);
      expect(result.cena_s_dph).toBe(2875);
    });

    it("DPH 0% (osvobozeno)", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        dph_sazba: 0,
      });

      expect(result.dph_castka).toBe(0);
      expect(result.cena_s_dph).toBe(result.cena_zaklad);
    });
  });

  describe("příplatky", () => {
    it("víkendový příplatek +10%: základ 3648 + 364.80 = 4012.80", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        je_vikend: true,
      });

      expect(result.mezisouce).toBe(3648);
      expect(result.priplatek_vikend).toBe(364.8);
      expect(result.zaklad_pred_slevou).toBe(4012.8);
      expect(result.cena_zaklad).toBe(4012.8);
    });

    it("noční příplatek +20%: základ 3648 + 729.60 = 4377.60", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        je_nocni: true,
      });

      expect(result.mezisouce).toBe(3648);
      expect(result.priplatek_nocni).toBe(729.6);
      expect(result.zaklad_pred_slevou).toBe(4377.6);
      expect(result.cena_zaklad).toBe(4377.6);
    });

    it("víkend + noční: +10% + +20% = +30%", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        je_vikend: true,
        je_nocni: true,
      });

      expect(result.priplatek_vikend).toBe(364.8);
      expect(result.priplatek_nocni).toBe(729.6);
      // 3648 + 364.8 + 729.6 = 4742.4
      expect(result.zaklad_pred_slevou).toBe(4742.4);
    });
  });

  describe("doprava", () => {
    it("doprava 10km = 10 × 16 = 160 Kč", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        doprava_km: 10,
      });

      // výjezd(690) + doprava(160) + postřik(2958) = 3808
      expect(result.mezisouce).toBe(3808);
      const dopravaPolozka = result.polozky.find((p) =>
        p.nazev.includes("Doprava"),
      );
      expect(dopravaPolozka).toBeDefined();
      expect(dopravaPolozka!.cena_celkem).toBe(160);
    });

    it("doprava 0km = bez položky dopravy", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
        doprava_km: 0,
      });

      const dopravaPolozka = result.polozky.find((p) =>
        p.nazev.includes("Doprava"),
      );
      expect(dopravaPolozka).toBeUndefined();
    });
  });

  describe("minimum cena", () => {
    it("výjezd 690 bez dalších položek → minimum 2500", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: [],
        skudci: [],
      });

      expect(result.mezisouce).toBe(690);
      expect(result.minimum_aplikovano).toBe(true);
      expect(result.cena_zaklad).toBe(2500);
    });

    it("základ nad 2500 → minimum ne-aplikováno", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Štěnice obecná"],
        plocha_m2: 50,
      });

      expect(result.cena_zaklad).toBe(3648);
      expect(result.minimum_aplikovano).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("žádné typy zásahu — jen výjezd", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: [],
        skudci: [],
      });

      // Only výjezd (690), but minimum 2500
      expect(result.polozky).toHaveLength(1);
      expect(result.polozky[0].nazev).toBe("Výjezd");
      expect(result.polozky[0].cena_celkem).toBe(690);
    });

    it("speciální zásah — vosy", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["postrik"],
        skudci: ["Vosa obecná"],
      });

      // výjezd(690) + vosy(2100) = 2790
      expect(result.mezisouce).toBe(2790);
      const vosyPolozka = result.polozky.find((p) =>
        p.nazev.includes("Vosy"),
      );
      expect(vosyPolozka).toBeDefined();
      expect(vosyPolozka!.cena_celkem).toBe(2100);
    });

    it("gely — rusi 5 bytů", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typy_zasahu: ["vnitrni_dezinsekce"],
        skudci: ["Rus domácí"],
        pocet_bytu: 5,
      });

      // výjezd(690) + gel 5×1528 = 690+7640 = 8330
      expect(result.mezisouce).toBe(8330);
    });

    it("smluvní — živolovka myš + potkan, první návštěva", () => {
      const result = vypocetCeny(cenikFixture, {
        ...baseInput,
        typ_zakazky: "smluvni",
        je_prvni_navsteva: true,
        pocet_bodu_zivolovna_mys: 2,
        pocet_bodu_zivolovna_potkan: 1,
      });

      // výjezd(690) + práce(1639) + živolovka myš(2×349=698) + živolovka potkan(1×849=849)
      // = 690 + 1639 + 698 + 849 = 3876
      expect(result.mezisouce).toBe(3876);
    });
  });
});
