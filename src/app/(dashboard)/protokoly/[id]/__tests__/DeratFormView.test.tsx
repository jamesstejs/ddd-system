import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeratFormView } from "../DeratFormView";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock server actions
vi.mock("../protokolActions", () => ({
  saveDeratBodyAction: vi.fn().mockResolvedValue(undefined),
}));

const baseProtokolData = {
  id: "prot-1",
  cislo_protokolu: "P-ABC-001",
  status: "rozpracovany" as const,
  poznamka: null,
  zasah_id: "z-1",
};

const baseBod = {
  id: "bod-1",
  cislo_bodu: "L1",
  okruh_id: null,
  typ_stanicky: "mys" as const,
  pripravek_id: null,
  pozer_procent: 25,
  stav_stanicky: "ok" as const,
};

const basePripravky = [
  {
    id: "prep-1",
    nazev: "Brodifacoum Bloc",
    ucinna_latka: "Brodifacoum",
    protilatka: "Vitamin K1",
  },
];

const baseOkruhy = [
  { id: "okr-1", nazev: "Kuchyně" },
  { id: "okr-2", nazev: "Sklad" },
];

describe("DeratFormView", () => {
  it("renderuje číslo protokolu a klient info", () => {
    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={[baseBod]}
        okruhy={baseOkruhy}
        pripravky={basePripravky}
        klientName="Test Klient"
        objektNazev="Provozovna"
      />,
    );

    expect(screen.getByText("P-ABC-001")).toBeTruthy();
    expect(screen.getByText("Test Klient")).toBeTruthy();
    expect(screen.getByText("Provozovna")).toBeTruthy();
  });

  it("renderuje seznam bodů v overview", () => {
    const body = [
      baseBod,
      {
        ...baseBod,
        id: "bod-2",
        cislo_bodu: "L2",
        typ_stanicky: "potkan" as const,
        pozer_procent: 50,
      },
      {
        ...baseBod,
        id: "bod-3",
        cislo_bodu: "H1",
        typ_stanicky: "zivolovna" as const,
        pozer_procent: 0,
      },
    ];

    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={body}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    expect(screen.getByText("L1")).toBeTruthy();
    expect(screen.getByText("L2")).toBeTruthy();
    expect(screen.getByText("H1")).toBeTruthy();
  });

  it("zobrazuje průměrný požer", () => {
    const body = [
      { ...baseBod, pozer_procent: 100 },
      { ...baseBod, id: "bod-2", cislo_bodu: "L2", pozer_procent: 0 },
    ];

    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={body}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("klik na bod přepne do edit mode", () => {
    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={[baseBod]}
        okruhy={baseOkruhy}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    // Klikni na summary řádek
    const bodButton = screen.getByText("L1").closest("button");
    expect(bodButton).toBeTruthy();
    fireEvent.click(bodButton!);

    // Edit mode — vidíme "Přehled" zpět tlačítko
    expect(screen.getByText("← Přehled")).toBeTruthy();
    // A číslo bodu input
    expect(screen.getByLabelText("Číslo bodu")).toBeTruthy();
  });

  it("klik na 'Přidat bod' přidá nový bod", () => {
    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    const addButton = screen.getByText("+ Přidat bod");
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);

    // Nový bod by měl otevřít edit mode — vidíme "Přehled" zpět
    expect(screen.getByText("← Přehled")).toBeTruthy();
  });

  it("zobrazuje prázdný stav bez bodů", () => {
    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={[]}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    expect(
      screen.getByText("Žádné body. Přidejte první bod."),
    ).toBeTruthy();
  });

  it("readonly mode skrývá editační tlačítka", () => {
    const readonlyProtokol = {
      ...baseProtokolData,
      status: "schvaleny" as const,
    };

    render(
      <DeratFormView
        protokol={readonlyProtokol}
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    // "Přidat bod" by nemělo být vidět
    expect(screen.queryByText("+ Přidat bod")).toBeNull();
    // "Uložit" by nemělo být vidět
    expect(screen.queryByText("Uložit rozpracovaný")).toBeNull();
  });

  it("požer barvy se správně zobrazují", () => {
    const body = [
      { ...baseBod, pozer_procent: 0 },
      { ...baseBod, id: "bod-2", cislo_bodu: "L2", pozer_procent: 100 },
    ];

    render(
      <DeratFormView
        protokol={baseProtokolData}
        initialBody={body}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    // Oba % badgey existují
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("zobrazuje poznámku textarea", () => {
    const protokolWithNote = {
      ...baseProtokolData,
      poznamka: "Testovací poznámka",
    };

    render(
      <DeratFormView
        protokol={protokolWithNote}
        initialBody={[]}
        okruhy={[]}
        pripravky={basePripravky}
        klientName="Test"
        objektNazev=""
      />,
    );

    const textarea = screen.getByLabelText("Poznámka") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe("Testovací poznámka");
  });
});
