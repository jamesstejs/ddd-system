import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FotoSection } from "../FotoSection";

// Mock server actions
vi.mock("../protokolActions", () => ({
  uploadProtokolFotoAction: vi.fn().mockResolvedValue({
    id: "new-foto-id",
    soubor_url: "https://example.com/foto.jpg",
  }),
  deleteProtokolFotoAction: vi.fn().mockResolvedValue(undefined),
}));

const baseFotky = [
  { id: "f1", soubor_url: "https://example.com/foto1.jpg", popis: null },
  { id: "f2", soubor_url: "https://example.com/foto2.jpg", popis: "Popis" },
];

const defaultProps = {
  protokolId: "prot-1",
  initialFotky: baseFotky,
  isReadonly: false,
};

describe("FotoSection", () => {
  it("renderuje pr\u00e1zdn\u00fd stav", () => {
    render(
      <FotoSection protokolId="prot-1" initialFotky={[]} isReadonly={false} />,
    );
    expect(screen.getByText("\u017d\u00e1dn\u00e9 fotky.")).toBeTruthy();
  });

  it("zobrazuje existuj\u00edc\u00ed fotky jako thumbnails", () => {
    render(<FotoSection {...defaultProps} />);
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(2);
  });

  it("zobrazuje upload tla\u010d\u00edtka", () => {
    render(<FotoSection {...defaultProps} />);
    expect(screen.getByText(/Vyfotit/)).toBeTruthy();
    expect(screen.getByText(/Nahr\u00e1t/)).toBeTruthy();
  });

  it("readonly skr\u00fdv\u00e1 upload tla\u010d\u00edtka", () => {
    render(<FotoSection {...defaultProps} isReadonly={true} />);
    expect(screen.queryByText(/Vyfotit/)).toBeNull();
    expect(screen.queryByText(/Nahr\u00e1t/)).toBeNull();
    // Fotky st\u00e1le viditeln\u00e9
    expect(screen.getAllByRole("img").length).toBe(2);
  });

  it("readonly skr\u00fdv\u00e1 smazat tla\u010d\u00edtka", () => {
    render(<FotoSection {...defaultProps} isReadonly={true} />);
    expect(screen.queryByLabelText("Smazat fotku")).toBeNull();
  });

  it("zobrazuje smazat tla\u010d\u00edtka v edit mode", () => {
    render(<FotoSection {...defaultProps} />);
    const deleteButtons = screen.getAllByLabelText("Smazat fotku");
    expect(deleteButtons.length).toBe(2);
  });
});
