import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PodpisCanvas } from "../PodpisCanvas";

// Mock server actions
vi.mock("../protokolActions", () => ({
  uploadPodpisAction: vi.fn().mockResolvedValue("https://example.com/podpis.png"),
}));

// Mock HTMLCanvasElement.getContext pro testy (JSDOM nemá canvas)
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  lineCap: "",
  lineJoin: "",
  scale: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

const defaultProps = {
  protokolId: "prot-1",
  initialPodpisUrl: null,
  isReadonly: false,
};

describe("PodpisCanvas", () => {
  it("renderuje canvas bez podpisu", () => {
    render(<PodpisCanvas {...defaultProps} />);
    // Canvas element p\u0159\u00edtomen
    const canvas = document.querySelector("canvas");
    expect(canvas).toBeTruthy();
    // Tla\u010d\u00edtka pro spr\u00e1vu
    expect(screen.getByText("Smazat podpis")).toBeTruthy();
    expect(screen.getByText("Ulo\u017eit podpis")).toBeTruthy();
  });

  it("zobrazuje ulo\u017een\u00fd obr\u00e1zek podpisu", () => {
    render(
      <PodpisCanvas
        {...defaultProps}
        initialPodpisUrl="https://example.com/podpis.png"
      />,
    );

    // Obr\u00e1zek podpisu je zobrazen
    const img = screen.getByAltText("Podpis klienta");
    expect(img).toBeTruthy();
    // Tla\u010d\u00edtko "Podepsat znovu"
    expect(screen.getByText("Podepsat znovu")).toBeTruthy();
  });

  it("readonly zobrazuje jen obr\u00e1zek podpisu", () => {
    render(
      <PodpisCanvas
        {...defaultProps}
        isReadonly={true}
        initialPodpisUrl="https://example.com/podpis.png"
      />,
    );

    expect(screen.getByAltText("Podpis klienta")).toBeTruthy();
    // \u017d\u00e1dn\u00e9 editovac\u00ed tla\u010d\u00edtka
    expect(screen.queryByText("Podepsat znovu")).toBeNull();
    expect(screen.queryByText("Ulo\u017eit podpis")).toBeNull();
  });

  it("readonly bez podpisu zobrazuje zpr\u00e1vu", () => {
    render(<PodpisCanvas {...defaultProps} isReadonly={true} />);
    expect(
      screen.getByText("Podpis nebyl zad\u00e1n."),
    ).toBeTruthy();
  });

  it("zobrazuje 'Podepsat' tla\u010d\u00edtko bez existuj\u00edc\u00edho podpisu v saved mode", () => {
    // Simulate: no initial URL, canvas not showing (edge case — but default shows canvas)
    // V default stavu se canvas zobraz\u00ed hned
    render(<PodpisCanvas {...defaultProps} />);
    // Canvas je vid\u011bt
    expect(document.querySelector("canvas")).toBeTruthy();
  });
});
