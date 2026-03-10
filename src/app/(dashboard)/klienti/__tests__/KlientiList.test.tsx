import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KlientiList } from "../KlientiList";
import type { Tables } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../actions", () => ({
  createKlientAction: vi.fn(),
  updateKlientAction: vi.fn(),
  deleteKlientAction: vi.fn(),
  fetchAresAction: vi.fn(),
  checkDuplicateIcoAction: vi.fn(),
}));

const baseKlient: Klient = {
  id: "k1",
  typ: "firma",
  nazev: "Alfa s.r.o.",
  jmeno: "",
  prijmeni: "",
  ico: "12345678",
  dic: null,
  kod: "TST001",
  email: "alfa@test.cz",
  telefon: "777111222",
  adresa: "Praha 1",
  poznamka: null,
  dph_sazba: 21,
  individualni_sleva_procent: 0,
  platba_predem: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const klienti: Klient[] = [
  baseKlient,
  {
    ...baseKlient,
    id: "k2",
    typ: "fyzicka_osoba",
    nazev: "",
    jmeno: "Jan",
    prijmeni: "Novak",
    ico: null,
    email: "jan@test.cz",
    telefon: "777333444",
    adresa: "Brno",
  },
  {
    ...baseKlient,
    id: "k3",
    nazev: "Beta a.s.",
    ico: "87654321",
    email: "beta@test.cz",
    adresa: "Ostrava",
  },
];

describe("KlientiList", () => {
  it("renders all klienti", () => {
    render(<KlientiList klienti={klienti} />);

    expect(screen.getByText("Alfa s.r.o.")).toBeInTheDocument();
    expect(screen.getByText("Jan Novak")).toBeInTheDocument();
    expect(screen.getByText("Beta a.s.")).toBeInTheDocument();
  });

  it("shows correct count", () => {
    render(<KlientiList klienti={klienti} />);
    expect(screen.getByText("3 klienti")).toBeInTheDocument();
  });

  it("shows empty state when no klienti", () => {
    render(<KlientiList klienti={[]} />);
    expect(screen.getByText("Zatím žádní klienti")).toBeInTheDocument();
  });

  it("displays IČO badge for klienti with IČO", () => {
    render(<KlientiList klienti={klienti} />);
    expect(screen.getByText("IČO: 12345678")).toBeInTheDocument();
    expect(screen.getByText("IČO: 87654321")).toBeInTheDocument();
  });

  it("displays typ badge", () => {
    render(<KlientiList klienti={klienti} />);
    const firmaBadges = screen.getAllByText("Firma");
    const foBadges = screen.getAllByText("FO");
    expect(firmaBadges.length).toBe(2);
    expect(foBadges.length).toBe(1);
  });

  it("filters by typ firma", () => {
    render(<KlientiList klienti={klienti} />);

    fireEvent.click(screen.getByText("Firmy"));

    expect(screen.getByText("Alfa s.r.o.")).toBeInTheDocument();
    expect(screen.getByText("Beta a.s.")).toBeInTheDocument();
    expect(screen.queryByText("Jan Novak")).not.toBeInTheDocument();
  });

  it("filters by typ fyzicka_osoba", () => {
    render(<KlientiList klienti={klienti} />);

    fireEvent.click(screen.getByText("Fyzické osoby"));

    expect(screen.queryByText("Alfa s.r.o.")).not.toBeInTheDocument();
    expect(screen.getByText("Jan Novak")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<KlientiList klienti={klienti} />);

    const searchInput = screen.getByPlaceholderText("Hledat klienta...");
    fireEvent.change(searchInput, { target: { value: "alfa" } });

    expect(screen.getByText("Alfa s.r.o.")).toBeInTheDocument();
    expect(screen.queryByText("Beta a.s.")).not.toBeInTheDocument();
    expect(screen.queryByText("Jan Novak")).not.toBeInTheDocument();
  });

  it("searches by ICO", () => {
    render(<KlientiList klienti={klienti} />);

    const searchInput = screen.getByPlaceholderText("Hledat klienta...");
    fireEvent.change(searchInput, { target: { value: "87654321" } });

    expect(screen.getByText("Beta a.s.")).toBeInTheDocument();
    expect(screen.queryByText("Alfa s.r.o.")).not.toBeInTheDocument();
  });

  it("shows no-match message when search yields no results", () => {
    render(<KlientiList klienti={klienti} />);

    const searchInput = screen.getByPlaceholderText("Hledat klienta...");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(
      screen.getByText("Žádní klienti neodpovídají filtru")
    ).toBeInTheDocument();
  });

  it("has Přidat button", () => {
    render(<KlientiList klienti={klienti} />);
    expect(screen.getByText("Přidat")).toBeInTheDocument();
  });

  it("shows edit and delete buttons per card", () => {
    render(<KlientiList klienti={klienti} />);
    // 3 klienti × 1 edit + 1 delete button each
    const editButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil")
    );
    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2")
    );
    expect(editButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });

  it("renders links to detail pages", () => {
    render(<KlientiList klienti={klienti} />);
    const links = screen.getAllByRole("link");
    const detailLinks = links.filter((l) => l.getAttribute("href")?.startsWith("/klienti/k"));
    expect(detailLinks.length).toBe(3);
    expect(detailLinks[0].getAttribute("href")).toBe("/klienti/k1");
  });

  it("search input has minimum tap target", () => {
    render(<KlientiList klienti={klienti} />);
    const input = screen.getByPlaceholderText("Hledat klienta...");
    expect(input.className).toContain("min-h-[44px]");
  });
});
