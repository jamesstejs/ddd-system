import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PostrikFormView } from "../PostrikFormView";

// Mock server actions
vi.mock("../protokolActions", () => ({
  savePostrikAction: vi.fn().mockResolvedValue(undefined),
}));

const baseSkudci = [
  { id: "s1", nazev: "Rus domácí", typ: "lezouci_hmyz" },
  { id: "s2", nazev: "Štěnice obecná", typ: "lezouci_hmyz" },
];

const basePripravky = [
  {
    id: "p1",
    nazev: "Demand CS",
    ucinna_latka: "lambda-cyhalothrin",
    protilatka: null,
    typ: "insekticid" as const,
    cilovy_skudce: ["Rus domácí", "Štěnice obecná"],
    omezeni_prostor: null,
  },
  {
    id: "p2",
    nazev: "K-Othrine SC 25",
    ucinna_latka: "deltamethrin",
    protilatka: null,
    typ: "insekticid" as const,
    cilovy_skudce: ["Štěnice obecná"],
    omezeni_prostor: null,
  },
];

const basePostrikFromDB = {
  id: "post-1",
  skudce: "Rus domácí",
  plocha_m2: 120,
  typ_zakroku: "postrik" as const,
  poznamka: "Testovací poznámka",
  protokol_postrik_pripravky: [
    {
      id: "pp-1",
      spotreba: "2 litry",
      koncentrace_procent: 0.05,
      pripravky: {
        id: "p1",
        nazev: "Demand CS",
        ucinna_latka: "lambda-cyhalothrin",
        protilatka: null,
      },
    },
  ],
};

const defaultProps = {
  protokolId: "prot-1",
  status: "rozpracovany" as const,
  poznamka: "",
  onPoznamkaChange: vi.fn(),
  pripravky: basePripravky,
  skudci: baseSkudci,
  typObjektu: "gastro" as string | null,
};

describe("PostrikFormView", () => {
  it("renderuje škůdce selector", () => {
    render(
      <PostrikFormView {...defaultProps} initialPostriky={[]} />,
    );

    // Postřik 1 heading
    expect(screen.getByText("Postřik 1")).toBeTruthy();
    // Labels
    expect(screen.getByText("Škůdce")).toBeTruthy();
    expect(screen.getByText("Plocha (m²)")).toBeTruthy();
    expect(screen.getByText("Typ zákroku")).toBeTruthy();
  });

  it("renderuje existující data z DB", () => {
    render(
      <PostrikFormView
        {...defaultProps}
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    // Postřik heading
    expect(screen.getByText("Postřik 1")).toBeTruthy();
    // Přípravky section
    expect(screen.getByText("Přípravky")).toBeTruthy();
  });

  it("přidání přípravku zobrazí nový řádek", () => {
    render(
      <PostrikFormView {...defaultProps} initialPostriky={[]} />,
    );

    const addButton = screen.getByText("+ Přidat přípravek");
    fireEvent.click(addButton);

    // Should see "Odebrat přípravek" button for the new row
    expect(screen.getByText("Odebrat přípravek")).toBeTruthy();
  });

  it("zobrazuje účinnou látku po výběru přípravku", () => {
    render(
      <PostrikFormView
        {...defaultProps}
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    // z DB data je přípravek "Demand CS" vybraný → účinná látka se zobrazí
    expect(screen.getByText("lambda-cyhalothrin")).toBeTruthy();
  });

  it("readonly mode skrývá editaci", () => {
    render(
      <PostrikFormView
        {...defaultProps}
        status="schvaleny"
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    // Nevidíme save button
    expect(screen.queryByText("Uložit změny")).toBeNull();
    // Nevidíme přidat přípravek
    expect(screen.queryByText("+ Přidat přípravek")).toBeNull();
    // Nevidíme přidat další postřik
    expect(screen.queryByText("+ Přidat další postřik")).toBeNull();
  });

  it("přidání dalšího postřiku", () => {
    render(
      <PostrikFormView {...defaultProps} initialPostriky={[]} />,
    );

    expect(screen.getByText("Postřik 1")).toBeTruthy();

    const addButton = screen.getByText("+ Přidat další postřik");
    fireEvent.click(addButton);

    expect(screen.getByText("Postřik 2")).toBeTruthy();
  });
});
