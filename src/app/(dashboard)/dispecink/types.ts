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
  polozky: { nazev: string; cena: number }[];
  cena_zaklad: number;
  cena_s_dph: number;
  dph_sazba: number;
};
