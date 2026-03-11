import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VetaUcinnostiSection } from "../VetaUcinnostiSection";

// Mock server actions
vi.mock("../protokolActions", () => ({
  saveVetaUcinnostiAction: vi.fn().mockResolvedValue(undefined),
}));

const baseSablony = [
  {
    id: "sab-1",
    nazev: "\u00da\u010dinnost \u2014 dostate\u010dn\u00e1",
    obsah:
      "\u00da\u010dinnost z\u00e1sahu byla vyhodnocena jako dostate\u010dn\u00e1.",
  },
  {
    id: "sab-2",
    nazev: "\u00da\u010dinnost \u2014 bez n\u00e1lezu",
    obsah:
      "P\u0159i kontrole nebyl zji\u0161t\u011bn \u017e\u00e1dn\u00fd v\u00fdskyt \u0161k\u016fdc\u016f.",
  },
];

const defaultProps = {
  protokolId: "prot-1",
  initialVetaUcinnosti: null,
  sablony: baseSablony,
  isReadonly: false,
};

describe("VetaUcinnostiSection", () => {
  it("nerender\u00ed nic bez \u0161ablon", () => {
    const { container } = render(
      <VetaUcinnostiSection {...defaultProps} sablony={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("zobrazuje select s opcemi", () => {
    render(<VetaUcinnostiSection {...defaultProps} />);
    expect(screen.getByText("V\u011bta o \u00fa\u010dinnosti")).toBeTruthy();
    // Select trigger existuje
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("readonly zobrazuje jen text", () => {
    const { container } = render(
      <VetaUcinnostiSection
        {...defaultProps}
        isReadonly={true}
        initialVetaUcinnosti="Účinnost zásahu byla vyhodnocena jako dostatečná."
      />,
    );

    // Text je zobrazen (obalený uvozovkami &ldquo;/&rdquo;)
    expect(container.innerHTML).toContain(
      "Účinnost zásahu byla vyhodnocena jako dostatečná.",
    );

    // Select a tlačítka nejsou přítomny
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByText("Uložit větu")).toBeNull();
  });

  it("readonly bez v\u011bty zobrazuje zpr\u00e1vu", () => {
    render(
      <VetaUcinnostiSection
        {...defaultProps}
        isReadonly={true}
        initialVetaUcinnosti={null}
      />,
    );
    expect(
      screen.getByText("V\u011bta o \u00fa\u010dinnosti nebyla zad\u00e1na."),
    ).toBeTruthy();
  });

  it("zobrazuje 'Ulo\u017eeno' kdy\u017e nejsou zm\u011bny", () => {
    render(
      <VetaUcinnostiSection
        {...defaultProps}
        initialVetaUcinnosti="\u00da\u010dinnost z\u00e1sahu byla vyhodnocena jako dostate\u010dn\u00e1."
      />,
    );
    expect(screen.getByText("Ulo\u017eeno")).toBeTruthy();
  });
});
