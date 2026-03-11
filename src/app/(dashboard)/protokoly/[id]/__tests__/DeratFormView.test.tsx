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

const defaultProps = {
  protokolId: "prot-1",
  status: "rozpracovany" as const,
  poznamka: "",
  onPoznamkaChange: vi.fn(),
};

describe("DeratFormView", () => {
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
        {...defaultProps}
        initialBody={body}
        okruhy={[]}
        pripravky={basePripravky}
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
        {...defaultProps}
        initialBody={body}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    expect(screen.getByText("50%")).toBeTruthy();
  });

  it("klik na bod přepne do edit mode", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[baseBod]}
        okruhy={baseOkruhy}
        pripravky={basePripravky}
      />,
    );

    // Klikni na summary řádek
    const bodButton = screen.getByText("L1").closest("button");
    expect(bodButton).toBeTruthy();
    fireEvent.click(bodButton!);

    // Edit mode — vidíme "Přehled" zpět tlačítko
    expect(screen.getByLabelText("Zpět na přehled")).toBeTruthy();
    // A číslo bodu input
    expect(screen.getByLabelText("Číslo bodu")).toBeTruthy();
  });

  it("klik na 'Přidat bod' přidá nový bod", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    const addButton = screen.getByText("+ Přidat bod");
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);

    // Nový bod by měl otevřít edit mode — vidíme "Přehled" zpět
    expect(screen.getByLabelText("Zpět na přehled")).toBeTruthy();
  });

  it("zobrazuje prázdný stav bez bodů", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    expect(
      screen.getByText("Žádné body. Přidejte první bod."),
    ).toBeTruthy();
  });

  it("readonly mode skrývá editační tlačítka", () => {
    render(
      <DeratFormView
        {...defaultProps}
        status="schvaleny"
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    // "Přidat bod" by nemělo být vidět
    expect(screen.queryByText("+ Přidat bod")).toBeNull();
    // "Uložit" by nemělo být vidět (obě varianty textu)
    expect(screen.queryByText("Uložit změny")).toBeNull();
    expect(screen.queryByText("Uloženo")).toBeNull();
  });

  it("požer barvy se správně zobrazují", () => {
    const body = [
      { ...baseBod, pozer_procent: 0 },
      { ...baseBod, id: "bod-2", cislo_bodu: "L2", pozer_procent: 100 },
    ];

    render(
      <DeratFormView
        {...defaultProps}
        initialBody={body}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    // Oba % badgey existují
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("forceEditable p\u0159episuje readonly u ke_schvaleni", () => {
    render(
      <DeratFormView
        {...defaultProps}
        status="ke_schvaleni"
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
        forceEditable={true}
      />,
    );

    // "P\u0159idat bod" by m\u011blo b\u00fdt viditelné (admin editace)
    expect(screen.getByText("+ P\u0159idat bod")).toBeTruthy();
  });

  it("forceEditable=false zachov\u00e1v\u00e1 readonly", () => {
    render(
      <DeratFormView
        {...defaultProps}
        status="ke_schvaleni"
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
        forceEditable={false}
      />,
    );

    // "P\u0159idat bod" by nem\u011blo b\u00fdt viditelné
    expect(screen.queryByText("+ P\u0159idat bod")).toBeNull();
  });
});
