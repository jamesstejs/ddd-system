import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PostrikFormView } from "../PostrikFormView";

// Mock server actions
const mockGetAiDoporuceni = vi.fn();
vi.mock("../protokolActions", () => ({
  savePostrikAction: vi.fn().mockResolvedValue(undefined),
  getAiPripravkyDoporuceniAction: (...args: unknown[]) =>
    mockGetAiDoporuceni(...args),
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

  // --- AI doporučení přípravků tests ---

  it("nevidíme AI tlačítko když není vybraný škůdce", () => {
    render(
      <PostrikFormView {...defaultProps} initialPostriky={[]} />,
    );

    // No škůdce selected → no AI button
    expect(screen.queryByText("AI doporučení přípravků")).toBeNull();
  });

  it("zobrazuje AI tlačítko když je škůdce vybraný", () => {
    render(
      <PostrikFormView
        {...defaultProps}
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    // Škůdce = "Rus domácí" from basePostrikFromDB → AI button visible
    expect(screen.getByText("AI doporučení přípravků")).toBeTruthy();
  });

  it("AI tlačítko není viditelné v readonly módu", () => {
    render(
      <PostrikFormView
        {...defaultProps}
        status="schvaleny"
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    expect(screen.queryByText("AI doporučení přípravků")).toBeNull();
  });

  it("AI doporučení přípravků zobrazuje loading stav", async () => {
    // Never resolve to keep loading state
    mockGetAiDoporuceni.mockReturnValue(new Promise(() => {}));

    render(
      <PostrikFormView
        {...defaultProps}
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    const aiButton = screen.getByText("AI doporučení přípravků");
    fireEvent.click(aiButton);

    // Should show loading spinner text
    expect(await screen.findByText("AI analyzuje...")).toBeTruthy();
  });

  it("AI doporučení přípravků zobrazuje chybu", async () => {
    mockGetAiDoporuceni.mockResolvedValue({
      error: "AI služba není dostupná",
    });

    render(
      <PostrikFormView
        {...defaultProps}
        initialPostriky={[basePostrikFromDB]}
      />,
    );

    const aiButton = screen.getByText("AI doporučení přípravků");
    fireEvent.click(aiButton);

    expect(
      await screen.findByText("AI služba není dostupná"),
    ).toBeTruthy();
  });
});
