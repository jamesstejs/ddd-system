import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DezinsFormView } from "../DezinsFormView";

// Mock server actions
vi.mock("../protokolActions", () => ({
  saveDezinsBodyAction: vi.fn().mockResolvedValue(undefined),
}));

const baseSkudci = [
  { id: "s1", nazev: "Rus domácí", typ: "lezouci_hmyz" },
  { id: "s2", nazev: "Moucha domácí", typ: "letajici_hmyz" },
  { id: "s3", nazev: "Šváb obecný", typ: "lezouci_hmyz" },
];

const baseOkruhy = [
  { id: "okr-1", nazev: "Kuchyně" },
  { id: "okr-2", nazev: "Sklad" },
];

const baseBod = {
  id: "dbod-1",
  cislo_bodu: "D1",
  okruh_id: null,
  typ_lapace: "lezouci_hmyz" as const,
  druh_hmyzu: "Rus domácí",
  pocet: 5,
};

const defaultProps = {
  protokolId: "prot-1",
  status: "rozpracovany" as const,
  poznamka: "",
  onPoznamkaChange: vi.fn(),
  skudci: baseSkudci,
  okruhy: baseOkruhy,
};

describe("DezinsFormView", () => {
  it("renderuje seznam bodů v overview", () => {
    const body = [
      baseBod,
      {
        ...baseBod,
        id: "dbod-2",
        cislo_bodu: "D2",
        typ_lapace: "letajici_hmyz" as const,
        druh_hmyzu: "Moucha domácí",
        pocet: 12,
      },
    ];

    render(<DezinsFormView {...defaultProps} initialBody={body} />);

    expect(screen.getByText("D1")).toBeTruthy();
    expect(screen.getByText("D2")).toBeTruthy();
  });

  it("klik na bod přepne do edit mode", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    const bodButton = screen.getByText("D1").closest("button");
    expect(bodButton).toBeTruthy();
    fireEvent.click(bodButton!);

    // Edit mode — vidíme "Přehled" zpět tlačítko
    expect(screen.getByLabelText("Zpět na přehled")).toBeTruthy();
    // A číslo bodu input
    expect(screen.getByLabelText("Číslo bodu")).toBeTruthy();
  });

  it("přidání bodu otevře edit mode", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    const addButton = screen.getByText("+ Přidat bod");
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);

    // Edit mode
    expect(screen.getByLabelText("Zpět na přehled")).toBeTruthy();
  });

  it("zobrazuje prázdný stav bez bodů", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[]} />);

    expect(
      screen.getByText("Žádné body. Přidejte první bod."),
    ).toBeTruthy();
  });

  it("readonly mode skrývá editační tlačítka", () => {
    render(
      <DezinsFormView
        {...defaultProps}
        status="schvaleny"
        initialBody={[baseBod]}
      />,
    );

    expect(screen.queryByText("+ Přidat bod")).toBeNull();
    expect(screen.queryByText("Uložit změny")).toBeNull();
    expect(screen.queryByText("Uloženo")).toBeNull();
  });

  it("zobrazuje Uloženo tlačítko když nejsou změny", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    expect(screen.getByText("Uloženo")).toBeTruthy();
  });
});
