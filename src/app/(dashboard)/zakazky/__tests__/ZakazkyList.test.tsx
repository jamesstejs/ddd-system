import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ZakazkyList } from "../ZakazkyList";
import type { Tables, Database } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type Skudce = Tables<"skudci">;

// Mock nested zakazka type (matches what getZakazky returns)
type Zakazka = Tables<"zakazky"> & {
  objekty: {
    id: string;
    nazev: string;
    adresa: string;
    plocha_m2: number | null;
    typ_objektu: Database["public"]["Enums"]["typ_objektu"];
    klient_id: string;
    klienti: {
      id: string;
      nazev: string;
      jmeno: string;
      prijmeni: string;
      typ: Database["public"]["Enums"]["typ_klienta"];
      ico: string | null;
    };
  };
};

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("../actions", () => ({
  createZakazkaAction: vi.fn(),
  updateZakazkaAction: vi.fn(),
  deleteZakazkaAction: vi.fn(),
  getObjektyForKlientAction: vi.fn().mockResolvedValue([]),
  getSkudciAction: vi.fn().mockResolvedValue([]),
  getSablonyBoduAction: vi.fn().mockResolvedValue([]),
}));

const baseKlient: Klient = {
  id: "k1",
  typ: "firma",
  nazev: "Restaurace U Kocoura",
  jmeno: "",
  prijmeni: "",
  ico: "12345678",
  dic: null,
  email: "kocour@test.cz",
  telefon: "777111222",
  adresa: "Praha 1",
  poznamka: null,
  dph_sazba: 21,
  individualni_sleva_procent: 0,
  platba_predem: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const baseSkudce: Skudce = {
  id: "s1",
  nazev: "Potkan obecný",
  latinsky_nazev: "Rattus norvegicus",
  typ: "hlodavec",
  kategorie: "přenašeč nemocí",
  doporucena_cetnost_dny: 30,
  pocet_zasahu: "1× měsíčně",
  poznamka: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const makeZakazka = (overrides: Partial<Zakazka> = {}): Zakazka => ({
  id: "z1",
  objekt_id: "o1",
  typ: "smluvni",
  status: "aktivni",
  typy_zasahu: ["vnitrni_deratizace"],
  skudci: ["Potkan obecný"],
  cetnost_dny: 30,
  pocet_navstev_rocne: 12,
  platnost_do: null,
  platba_predem: false,
  poznamka: null,
  created_at: "2026-03-01T00:00:00Z",
  updated_at: "2026-03-01T00:00:00Z",
  deleted_at: null,
  objekty: {
    id: "o1",
    nazev: "Provozovna Hlavní",
    adresa: "Hlavní 123, Praha 1",
    plocha_m2: 200,
    typ_objektu: "gastro",
    klient_id: "k1",
    klienti: {
      id: "k1",
      nazev: "Restaurace U Kocoura",
      jmeno: "",
      prijmeni: "",
      typ: "firma",
      ico: "12345678",
    },
  },
  ...overrides,
});

const zakazky: Zakazka[] = [
  makeZakazka(),
  makeZakazka({
    id: "z2",
    status: "nova",
    typ: "jednorazova",
    typy_zasahu: ["postrik"],
    skudci: ["Štěnice obecná"],
    cetnost_dny: null,
    objekty: {
      id: "o2",
      nazev: "Byt Karlín",
      adresa: "Sokolovská 45, Praha 8",
      plocha_m2: 65,
      typ_objektu: "domacnost",
      klient_id: "k2",
      klienti: {
        id: "k2",
        nazev: "",
        jmeno: "Jan",
        prijmeni: "Novák",
        typ: "fyzicka_osoba",
        ico: null,
      },
    },
  }),
  makeZakazka({
    id: "z3",
    status: "ukoncena",
  }),
];

const skudci: Skudce[] = [
  baseSkudce,
  {
    ...baseSkudce,
    id: "s2",
    nazev: "Myš domácí",
    latinsky_nazev: "Mus musculus",
    doporucena_cetnost_dny: 30,
  },
  {
    ...baseSkudce,
    id: "s3",
    nazev: "Štěnice obecná",
    typ: "lezouci_hmyz",
    doporucena_cetnost_dny: 14,
  },
];

describe("ZakazkyList", () => {
  it("renders all zakazky", () => {
    render(
      <ZakazkyList
        zakazky={zakazky}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );
    // z1 and z3 share the same klient, so there are 2 "Restaurace U Kocoura"
    expect(screen.getAllByText("Restaurace U Kocoura").length).toBe(2);
    expect(screen.getByText("Jan Novák")).toBeDefined();
    expect(screen.getByText("3 zakázky")).toBeDefined();
  });

  it("shows empty state when no zakazky", () => {
    render(<ZakazkyList zakazky={[]} klienti={[]} skudci={[]} />);
    expect(screen.getByText("Zatím žádné zakázky")).toBeDefined();
  });

  it("filters by status", () => {
    render(
      <ZakazkyList
        zakazky={zakazky}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    // Click "Nová" status filter button (in the filter bar)
    const filterButtons = screen.getAllByText("Nová");
    // First "Nová" is the filter button, second could be a badge
    fireEvent.click(filterButtons[0]);
    expect(screen.getByText("1 zakázka")).toBeDefined();
    expect(screen.getByText("Jan Novák")).toBeDefined();

    // Click "Aktivní" status filter button
    const aktivniButtons = screen.getAllByText("Aktivní");
    fireEvent.click(aktivniButtons[0]);
    expect(screen.getByText("1 zakázka")).toBeDefined();
  });

  it("filters by search text", () => {
    render(
      <ZakazkyList
        zakazky={zakazky}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Hledat zakázku...");
    fireEvent.change(searchInput, { target: { value: "Karlín" } });

    // Only one result should match
    expect(screen.getByText("1 zakázka")).toBeDefined();
    expect(screen.getByText("Jan Novák")).toBeDefined();
  });

  it("shows status and type badges", () => {
    render(
      <ZakazkyList
        zakazky={[zakazky[0]]}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    // "Aktivní" appears both in filter button and in badge
    const aktivniElements = screen.getAllByText("Aktivní");
    expect(aktivniElements.length).toBeGreaterThanOrEqual(2); // filter + badge
    // "Smluvní" only appears as a badge (not a filter)
    expect(screen.getByText("Smluvní")).toBeDefined();
  });

  it("displays typy zasahu for each zakazka", () => {
    render(
      <ZakazkyList
        zakazky={[zakazky[0]]}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    expect(screen.getByText("Vnitřní deratizace")).toBeDefined();
  });

  it("shows platba predem badge when set", () => {
    const z = makeZakazka({ platba_predem: true });
    render(
      <ZakazkyList zakazky={[z]} klienti={[baseKlient]} skudci={skudci} />,
    );

    expect(screen.getByText("Předem")).toBeDefined();
  });

  it("shows cetnost badge when set", () => {
    render(
      <ZakazkyList
        zakazky={[zakazky[0]]}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    expect(screen.getByText("30d")).toBeDefined();
  });

  it('shows "Nová zakázka" button', () => {
    render(
      <ZakazkyList zakazky={[]} klienti={[baseKlient]} skudci={skudci} />,
    );

    expect(screen.getByText("Nová zakázka")).toBeDefined();
  });

  it("opens create bottomsheet when clicking add button", () => {
    render(
      <ZakazkyList
        zakazky={[]}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    fireEvent.click(screen.getByText("Nová zakázka"));
    expect(screen.getByText("— Vyberte klienta —")).toBeDefined();
  });

  it("shows all status filter options", () => {
    render(
      <ZakazkyList zakazky={[]} klienti={[]} skudci={[]} />,
    );

    expect(screen.getByText("Všechny")).toBeDefined();
    expect(screen.getByText("Nová")).toBeDefined();
    expect(screen.getByText("Aktivní")).toBeDefined();
    expect(screen.getByText("Pozastavená")).toBeDefined();
    expect(screen.getByText("Ukončená")).toBeDefined();
  });

  it("shows edit and delete buttons per zakazka card", () => {
    render(
      <ZakazkyList
        zakazky={[zakazky[0]]}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    // Each card should have edit (Pencil) and delete (Trash2) buttons
    const buttons = screen.getAllByRole("button");
    // Filter buttons for edit/delete (the ones inside cards, not the status filters)
    const actionButtons = buttons.filter(
      (b) =>
        b.querySelector('svg.lucide-pencil') ||
        b.querySelector('svg.lucide-trash-2'),
    );
    expect(actionButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows load more button when many zakazky", () => {
    const manyZakazky = Array.from({ length: 25 }, (_, i) =>
      makeZakazka({ id: `z-${i}` }),
    );

    render(
      <ZakazkyList
        zakazky={manyZakazky}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    expect(screen.getByText(/Zobrazit další/)).toBeDefined();
  });

  it("links each zakazka to its detail page", () => {
    render(
      <ZakazkyList
        zakazky={[zakazky[0]]}
        klienti={[baseKlient]}
        skudci={skudci}
      />,
    );

    const link = screen.getByRole("link", { name: /Restaurace U Kocoura/i });
    expect(link.getAttribute("href")).toBe("/zakazky/z1");
  });
});
