export type DispecinkTechnik = {
  id: string;
  jmeno: string;
  prijmeni: string;
  email: string;
  koeficient_rychlosti: number;
  pobocka: string | null;
};

export type DispecinkDostupnost = {
  id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
};

export type DispecinkZasah = {
  id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  status: string;
  poznamka: string | null;
  zakazky: {
    id: string;
    typ: string;
    typy_zasahu: string[] | null;
    objekty: {
      nazev: string;
      adresa: string;
      klienti: {
        nazev: string | null;
        jmeno: string;
        prijmeni: string;
        typ: string;
      };
    };
  } | null;
};

export type DispecinkData = {
  technici: DispecinkTechnik[];
  dostupnost: DispecinkDostupnost[];
  zasahy: DispecinkZasah[];
  weekStart: string;
  weekEnd: string;
};

export type CenaOdhadResult = {
  polozky: { nazev: string; pocet?: number; cena_za_kus?: number; cena: number }[];
  cena_zaklad: number;
  cena_s_dph: number;
  dph_sazba: number;
  /** Výsledky kalkulačky bodů per typ zásahu (pouze pro smluvní deratizaci) */
  body_vypocet?: Record<string, { bod_s_mys: number; bod_l_potkan: number; zivolovna: number } | null>;
  /** Celkové počty bodů použité pro výpočet */
  pocty_bodu?: {
    mys: number;
    potkan: number;
    zivolovna_mys: number;
    zivolovna_potkan: number;
  };
};
