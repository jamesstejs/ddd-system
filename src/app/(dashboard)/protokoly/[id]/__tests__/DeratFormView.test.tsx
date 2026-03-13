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
  { id: "okr-1", nazev: "Kuchyn\u011B" },
  { id: "okr-2", nazev: "Sklad" },
];

const defaultProps = {
  protokolId: "prot-1",
  status: "rozpracovany" as const,
  poznamka: "",
  onPoznamkaChange: vi.fn(),
};

describe("DeratFormView", () => {
  it("renderuje seznam bod\u016F (inline mode default pro rozpracovan\u00FD)", () => {
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

  it("zobrazuje pr\u016Fm\u011Brn\u00FD po\u017Eer", () => {
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

  it("p\u0159epne do overview a klik na bod p\u0159epne do edit mode", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[baseBod]}
        okruhy={baseOkruhy}
        pripravky={basePripravky}
      />,
    );

    // Switch to overview mode first
    const overviewBtn = screen.getByText("P\u0159ehled");
    fireEvent.click(overviewBtn);

    // Now click the summary row
    const bodButton = screen.getByText("L1").closest("button");
    expect(bodButton).toBeTruthy();
    fireEvent.click(bodButton!);

    // Edit mode \u2014 vid\u00EDme "P\u0159ehled" zp\u011Bt tla\u010D\u00EDtko
    expect(screen.getByLabelText("Zp\u011Bt na p\u0159ehled")).toBeTruthy();
    expect(screen.getByLabelText("\u010C\u00EDslo bodu")).toBeTruthy();
  });

  it("klik na 'P\u0159idat bod' v inline m\u00F3du otev\u0159e AddBodSheet", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    const addButton = screen.getByText("+ P\u0159idat bod");
    expect(addButton).toBeTruthy();
    fireEvent.click(addButton);

    // AddBodSheet should open with "Nov\u00FD bod" title
    expect(screen.getByText("Nov\u00FD bod")).toBeTruthy();
  });

  it("zobrazuje pr\u00E1zdn\u00FD stav bez bod\u016F", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    expect(
      screen.getByText("\u017D\u00E1dn\u00E9 body. P\u0159idejte prvn\u00ED bod."),
    ).toBeTruthy();
  });

  it("readonly mode skr\u00FDv\u00E1 edita\u010Dn\u00ED tla\u010D\u00EDtka", () => {
    render(
      <DeratFormView
        {...defaultProps}
        status="schvaleny"
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    // "P\u0159idat bod" by nem\u011Blo b\u00FDt vid\u011Bt
    expect(screen.queryByText("+ P\u0159idat bod")).toBeNull();
    // "Ulo\u017Eit" by nem\u011Blo b\u00FDt vid\u011Bt (ob\u011B varianty textu)
    expect(screen.queryByText("Ulo\u017Eit zm\u011Bny")).toBeNull();
  });

  it("po\u017Eer barvy se spr\u00E1vn\u011B zobrazuj\u00ED v inline m\u00F3du", () => {
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

    // In inline mode, po\u017Eer buttons show values
    // 0% button should have aria-pressed for first bod
    const pozerButtons = screen.getAllByLabelText("Po\u017Eer 0%");
    expect(pozerButtons.length).toBeGreaterThan(0);
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

    // "P\u0159idat bod" by m\u011Blo b\u00FDt viditeln\u00E9 (admin editace)
    expect(screen.getByText("+ P\u0159idat bod")).toBeTruthy();
  });

  it("forceEditable=false zachov\u00E1v\u00E1 readonly", () => {
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

    // "P\u0159idat bod" by nem\u011Blo b\u00FDt viditeln\u00E9
    expect(screen.queryByText("+ P\u0159idat bod")).toBeNull();
  });

  it("mode toggle p\u0159ep\u00EDn\u00E1 mezi inline a overview", () => {
    render(
      <DeratFormView
        {...defaultProps}
        initialBody={[baseBod]}
        okruhy={[]}
        pripravky={basePripravky}
      />,
    );

    // Default: inline mode, should see "Ter\u00E9nn\u00ED" toggle active
    expect(screen.getByText("Ter\u00E9nn\u00ED")).toBeTruthy();

    // Switch to overview
    fireEvent.click(screen.getByText("P\u0159ehled"));

    // Should see save button in overview mode
    expect(screen.getByText("Ulo\u017Eeno")).toBeTruthy();
  });
});
