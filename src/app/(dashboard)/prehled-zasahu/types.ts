// ---------------------------------------------------------------
// Types for "Přehled zásahů" admin overview page
// ---------------------------------------------------------------

/** Připomínka (K domluvení tab) */
export type PrehledPripominka = {
  id: string;
  stav: string;
  pocet_upozorneni: number;
  posledni_upozorneni_at: string | null;
  created_at: string;
  technik: {
    id: string;
    jmeno: string;
    prijmeni: string;
    pobocka: string | null;
  } | null;
  zasah: {
    id: string;
    datum: string;
    cas_od: string;
    cas_do: string;
  } | null;
  zakazka: {
    id: string;
    typ: string;
    objekt: {
      id: string;
      nazev: string;
      adresa: string;
      klient: {
        id: string;
        nazev: string | null;
        jmeno: string;
        prijmeni: string;
        typ: string;
        telefon: string | null;
        email: string | null;
      };
    };
  } | null;
};

/** Zpožděný zásah (Zpožděné tab) */
export type PrehledOverdue = {
  id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  status: string;
  poznamka: string | null;
  puvodni_datum: string | null;
  odlozeno_at: string | null;
  odlozeni_duvod: string | null;
  odlozeno_kym: string | null;
  dny_zpozdeni: number;
  technik: {
    id: string;
    jmeno: string;
    prijmeni: string;
    pobocka: string | null;
  } | null;
  zakazka: {
    id: string;
    typ: string;
    typy_zasahu: string[] | null;
    objekt: {
      id: string;
      nazev: string;
      adresa: string;
      klient: {
        id: string;
        nazev: string | null;
        jmeno: string;
        prijmeni: string;
        typ: string;
        telefon: string | null;
        email: string | null;
      };
    };
  } | null;
};

/** Fakturace item (Fakturace tab) */
export type PrehledFakturace = {
  id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  status: string;
  technik: {
    id: string;
    jmeno: string;
    prijmeni: string;
    pobocka: string | null;
  } | null;
  zakazka: {
    id: string;
    typ: string;
    typy_zasahu: string[] | null;
    objekt: {
      id: string;
      nazev: string;
      adresa: string;
      klient: {
        id: string;
        nazev: string | null;
        jmeno: string;
        prijmeni: string;
        typ: string;
        telefon: string | null;
        email: string | null;
      };
    };
  } | null;
  protokol: {
    id: string;
    status: string;
    cislo_protokolu: string | null;
  } | null;
  faktura: {
    id: string;
    stav: string;
    cislo: string | null;
    castka_s_dph: number | null;
    datum_splatnosti: string | null;
  } | null;
};

/** Combined data for all 3 tabs */
export type PrehledData = {
  pripominky: PrehledPripominka[];
  overdue: PrehledOverdue[];
  fakturace: PrehledFakturace[];
  counts: {
    pripominky: number;
    overdue: number;
    fakturace: number;
  };
};
