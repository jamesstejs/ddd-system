import { describe, it, expect } from "vitest";
import {
  odhadDelkyZasahu,
  formatDelka,
  STATUS_ZASAHU_LABELS,
  getTechnikColor,
  TECHNIK_COLORS,
  TECHNIK_STATUS_TRANSITIONS,
  ADMIN_STATUS_TRANSITIONS,
  TECHNIK_STATUS_ACTION_LABELS,
  getGoogleMapsUrl,
} from "../zasahUtils";

describe("odhadDelkyZasahu", () => {
  it("vrátí minimum 30 min pro prázdné typy zásahu", () => {
    expect(odhadDelkyZasahu([], 0, 0, 1.0)).toBe(30);
  });

  it("vnitřní deratizace bez bodů = základ 30 min", () => {
    const result = odhadDelkyZasahu(["vnitrni_deratizace"], 0, 0, 1.0);
    expect(result).toBe(30);
  });

  it("vnitřní deratizace s 10 body = 30 + 10*3 = 60 min", () => {
    const result = odhadDelkyZasahu(["vnitrni_deratizace"], 10, 0, 1.0);
    expect(result).toBe(60);
  });

  it("vnitřní deratizace s 5 body = 30 + 5*3 = 45 min", () => {
    const result = odhadDelkyZasahu(["vnitrni_deratizace"], 5, 0, 1.0);
    expect(result).toBe(45);
  });

  it("postřik s 100 m² = 20 + 0.05*100 = 25 → zaokrouhleno na 25 min", () => {
    const result = odhadDelkyZasahu(["postrik"], 0, 100, 1.0);
    expect(result).toBe(25);
  });

  it("postřik s 500 m² = 20 + 0.05*500 = 45 min", () => {
    const result = odhadDelkyZasahu(["postrik"], 0, 500, 1.0);
    expect(result).toBe(45);
  });

  it("kombinace dvou typů zásahů se sečte", () => {
    // vnitrni_deratizace(30) + postrik(20 + 0.05*200=10) = 60
    const result = odhadDelkyZasahu(
      ["vnitrni_deratizace", "postrik"],
      0,
      200,
      1.0,
    );
    expect(result).toBe(60);
  });

  it("koeficient rychlosti 1.5 prodlouží odhad", () => {
    // base = 30, * 1.5 = 45
    const result = odhadDelkyZasahu(["vnitrni_deratizace"], 0, 0, 1.5);
    expect(result).toBe(45);
  });

  it("koeficient rychlosti 0.8 zkrátí odhad", () => {
    // base = 30 + 10*3 = 60, * 0.8 = 48, zaokrouhleno na 50
    const result = odhadDelkyZasahu(["vnitrni_deratizace"], 10, 0, 0.8);
    expect(result).toBe(50);
  });

  it("minimálně 15 minut i pro velmi malé zásahy", () => {
    // Pokud by výpočet dal méně než 15, vrátí 15 zaokrouhleno na 15
    const result = odhadDelkyZasahu(["postrik"], 0, 0, 0.3);
    expect(result).toBeGreaterThanOrEqual(15);
  });

  it("zaokrouhluje na 5 minut nahoru", () => {
    // vnitrni_deratizace(30) + 3 body * 3 = 39, zaokrouhleno na 40
    const result = odhadDelkyZasahu(["vnitrni_deratizace"], 3, 0, 1.0);
    expect(result).toBe(40);
  });

  it("vnější deratizace s body funguje", () => {
    // základ 25 + 5*4 = 45
    const result = odhadDelkyZasahu(["vnejsi_deratizace"], 5, 0, 1.0);
    expect(result).toBe(45);
  });

  it("vnitřní dezinsekce s body funguje", () => {
    // základ 25 + 8*3 = 49, zaokrouhleno na 50
    const result = odhadDelkyZasahu(["vnitrni_dezinsekce"], 8, 0, 1.0);
    expect(result).toBe(50);
  });

  it("neznámý typ zásahu použije default 30", () => {
    const result = odhadDelkyZasahu(["neznamy_typ"], 0, 0, 1.0);
    expect(result).toBe(30);
  });
});

describe("formatDelka", () => {
  it("formátuje minuty pod 60", () => {
    expect(formatDelka(30)).toBe("30 min");
    expect(formatDelka(45)).toBe("45 min");
  });

  it("formátuje celé hodiny", () => {
    expect(formatDelka(60)).toBe("1h");
    expect(formatDelka(120)).toBe("2h");
  });

  it("formátuje hodiny a minuty", () => {
    expect(formatDelka(90)).toBe("1h 30 min");
    expect(formatDelka(75)).toBe("1h 15 min");
    expect(formatDelka(150)).toBe("2h 30 min");
  });
});

describe("STATUS_ZASAHU_LABELS", () => {
  it("obsahuje všechny statusy", () => {
    expect(STATUS_ZASAHU_LABELS.naplanovano).toBeDefined();
    expect(STATUS_ZASAHU_LABELS.potvrzeny).toBeDefined();
    expect(STATUS_ZASAHU_LABELS.probiha).toBeDefined();
    expect(STATUS_ZASAHU_LABELS.hotovo).toBeDefined();
    expect(STATUS_ZASAHU_LABELS.zruseno).toBeDefined();
  });

  it("každý status má label, color a bgColor", () => {
    for (const key of Object.keys(STATUS_ZASAHU_LABELS)) {
      const info = STATUS_ZASAHU_LABELS[key];
      expect(info.label).toBeTruthy();
      expect(info.color).toBeTruthy();
      expect(info.bgColor).toBeTruthy();
    }
  });
});

describe("getTechnikColor", () => {
  it("vrátí barvu pro index 0", () => {
    const color = getTechnikColor(0);
    expect(color.bg).toBeTruthy();
    expect(color.border).toBeTruthy();
    expect(color.text).toBeTruthy();
    expect(color.dot).toBeTruthy();
  });

  it("cyklicky se vrací k začátku", () => {
    const first = getTechnikColor(0);
    const repeated = getTechnikColor(TECHNIK_COLORS.length);
    expect(first).toEqual(repeated);
  });

  it("vrátí různé barvy pro různé indexy", () => {
    const color0 = getTechnikColor(0);
    const color1 = getTechnikColor(1);
    expect(color0.dot).not.toBe(color1.dot);
  });
});

describe("TECHNIK_STATUS_TRANSITIONS", () => {
  it("naplánováno → probíhá je povoleno", () => {
    expect(TECHNIK_STATUS_TRANSITIONS.naplanovano).toContain("probiha");
  });

  it("potvrzený → probíhá je povoleno", () => {
    expect(TECHNIK_STATUS_TRANSITIONS.potvrzeny).toContain("probiha");
  });

  it("probíhá → hotovo je povoleno", () => {
    expect(TECHNIK_STATUS_TRANSITIONS.probiha).toContain("hotovo");
  });

  it("hotovo nemá žádné přechody", () => {
    expect(TECHNIK_STATUS_TRANSITIONS.hotovo).toHaveLength(0);
  });

  it("zrušeno nemá žádné přechody pro technika", () => {
    expect(TECHNIK_STATUS_TRANSITIONS.zruseno).toHaveLength(0);
  });

  it("technik nemůže rušit zásahy (žádný status → zruseno)", () => {
    for (const transitions of Object.values(TECHNIK_STATUS_TRANSITIONS)) {
      expect(transitions).not.toContain("zruseno");
    }
  });

  it("technik nemůže potvrzovat (žádný status → potvrzeny)", () => {
    for (const transitions of Object.values(TECHNIK_STATUS_TRANSITIONS)) {
      expect(transitions).not.toContain("potvrzeny");
    }
  });
});

describe("ADMIN_STATUS_TRANSITIONS", () => {
  it("naplánováno → potvrzený a zrušeno", () => {
    expect(ADMIN_STATUS_TRANSITIONS.naplanovano).toContain("potvrzeny");
    expect(ADMIN_STATUS_TRANSITIONS.naplanovano).toContain("zruseno");
  });

  it("potvrzený → probíhá a zrušeno", () => {
    expect(ADMIN_STATUS_TRANSITIONS.potvrzeny).toContain("probiha");
    expect(ADMIN_STATUS_TRANSITIONS.potvrzeny).toContain("zruseno");
  });

  it("probíhá → hotovo a zrušeno", () => {
    expect(ADMIN_STATUS_TRANSITIONS.probiha).toContain("hotovo");
    expect(ADMIN_STATUS_TRANSITIONS.probiha).toContain("zruseno");
  });

  it("hotovo nemá přechody", () => {
    expect(ADMIN_STATUS_TRANSITIONS.hotovo).toHaveLength(0);
  });

  it("zrušeno → naplánováno (obnovení)", () => {
    expect(ADMIN_STATUS_TRANSITIONS.zruseno).toContain("naplanovano");
  });
});

describe("TECHNIK_STATUS_ACTION_LABELS", () => {
  it("probíhá má label 'Zahájit'", () => {
    expect(TECHNIK_STATUS_ACTION_LABELS.probiha).toBe("Zahájit");
  });

  it("hotovo má label 'Dokončit'", () => {
    expect(TECHNIK_STATUS_ACTION_LABELS.hotovo).toBe("Dokončit");
  });
});

describe("getGoogleMapsUrl", () => {
  it("zakóduje adresu správně", () => {
    const url = getGoogleMapsUrl("Dvořákova 475, Velké Přílepy");
    expect(url).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Dvo%C5%99%C3%A1kova%20475%2C%20Velk%C3%A9%20P%C5%99%C3%ADlepy",
    );
  });

  it("obsahuje správný base URL", () => {
    const url = getGoogleMapsUrl("Praha 1");
    expect(url).toContain("https://www.google.com/maps/dir/?api=1&destination=");
  });

  it("zvládá české znaky", () => {
    const url = getGoogleMapsUrl("Žižkovo náměstí 5, Říčany");
    expect(url).toContain("destination=");
    // URL by mělo být dekódovatelné zpět
    const decoded = decodeURIComponent(url.split("destination=")[1]);
    expect(decoded).toBe("Žižkovo náměstí 5, Říčany");
  });

  it("zvládá prázdnou adresu", () => {
    const url = getGoogleMapsUrl("");
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=");
  });
});
