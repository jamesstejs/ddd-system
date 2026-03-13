import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DezinsFormView } from "../DezinsFormView";

// Mock server actions
vi.mock("../protokolActions", () => ({
  saveDezinsBodyAction: vi.fn().mockResolvedValue(undefined),
}));

const baseSkudci = [
  { id: "s1", nazev: "Rus dom\u00E1c\u00ED", typ: "lezouci_hmyz" },
  { id: "s2", nazev: "Moucha dom\u00E1c\u00ED", typ: "letajici_hmyz" },
  { id: "s3", nazev: "\u0160v\u00E1b obecn\u00FD", typ: "lezouci_hmyz" },
];

const baseOkruhy = [
  { id: "okr-1", nazev: "Kuchyn\u011B" },
  { id: "okr-2", nazev: "Sklad" },
];

const baseBod = {
  id: "dbod-1",
  cislo_bodu: "D1",
  okruh_id: null,
  typ_lapace: "lezouci_hmyz" as const,
  druh_hmyzu: "Rus dom\u00E1c\u00ED",
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
  it("renderuje seznam bod\u016F (inline default)", () => {
    const body = [
      baseBod,
      {
        ...baseBod,
        id: "dbod-2",
        cislo_bodu: "D2",
        typ_lapace: "letajici_hmyz" as const,
        druh_hmyzu: "Moucha dom\u00E1c\u00ED",
        pocet: 12,
      },
    ];

    render(<DezinsFormView {...defaultProps} initialBody={body} />);

    expect(screen.getByText("D1")).toBeTruthy();
    expect(screen.getByText("D2")).toBeTruthy();
  });

  it("p\u0159epne do overview a klik na bod p\u0159epne do edit mode", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    // In inline mode, clicking settings opens edit mode for dezins
    // Switch to overview first
    fireEvent.click(screen.getByText("P\u0159ehled"));

    const bodButton = screen.getByText("D1").closest("button");
    expect(bodButton).toBeTruthy();
    fireEvent.click(bodButton!);

    // Edit mode
    expect(screen.getByLabelText("Zp\u011Bt na p\u0159ehled")).toBeTruthy();
    expect(screen.getByLabelText("\u010C\u00EDslo bodu")).toBeTruthy();
  });

  it("p\u0159id\u00E1n\u00ED bodu v inline m\u00F3du", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    const addButton = screen.getByText("+ P\u0159idat bod");
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);

    // In inline mode, new bod is added directly to the list
    // D2 should appear
    expect(screen.getByText("D2")).toBeTruthy();
  });

  it("zobrazuje pr\u00E1zdn\u00FD stav bez bod\u016F", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[]} />);

    expect(
      screen.getByText("\u017D\u00E1dn\u00E9 body. P\u0159idejte prvn\u00ED bod."),
    ).toBeTruthy();
  });

  it("readonly mode skr\u00FDv\u00E1 edita\u010Dn\u00ED tla\u010D\u00EDtka", () => {
    render(
      <DezinsFormView
        {...defaultProps}
        status="schvaleny"
        initialBody={[baseBod]}
      />,
    );

    expect(screen.queryByText("+ P\u0159idat bod")).toBeNull();
    expect(screen.queryByText("Ulo\u017Eit zm\u011Bny")).toBeNull();
  });

  it("overview mode zobrazuje Ulo\u017Eeno tla\u010D\u00EDtko", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    // Switch to overview
    fireEvent.click(screen.getByText("P\u0159ehled"));

    expect(screen.getByText("Ulo\u017Eeno")).toBeTruthy();
  });

  it("mode toggle p\u0159ep\u00EDn\u00E1 mezi inline a overview", () => {
    render(<DezinsFormView {...defaultProps} initialBody={[baseBod]} />);

    // Default: inline
    expect(screen.getByText("Ter\u00E9nn\u00ED")).toBeTruthy();

    // Switch to overview
    fireEvent.click(screen.getByText("P\u0159ehled"));

    // Should see save button
    expect(screen.getByText("Ulo\u017Eeno")).toBeTruthy();
  });
});
