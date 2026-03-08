import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KlientDetail } from "../KlientDetail";
import type { Tables } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type KontaktniOsoba = Tables<"kontaktni_osoby">;

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../../actions", () => ({
  updateKlientAction: vi.fn(),
  deleteKlientAction: vi.fn(),
  createKontaktniOsobaAction: vi.fn(),
  updateKontaktniOsobaAction: vi.fn(),
  deleteKontaktniOsobaAction: vi.fn(),
}));

const firmaKlient: Klient = {
  id: "k1",
  typ: "firma",
  nazev: "Alfa s.r.o.",
  jmeno: "",
  prijmeni: "",
  ico: "12345678",
  dic: "CZ12345678",
  email: "alfa@test.cz",
  telefon: "777111222",
  adresa: "Praha 1",
  poznamka: "Testovací poznámka",
  dph_sazba: 21,
  individualni_sleva_procent: 10,
  platba_predem: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const foKlient: Klient = {
  id: "k2",
  typ: "fyzicka_osoba",
  nazev: "",
  jmeno: "Jan",
  prijmeni: "Novak",
  ico: null,
  dic: null,
  email: "jan@test.cz",
  telefon: "777333444",
  adresa: "Brno",
  poznamka: null,
  dph_sazba: 21,
  individualni_sleva_procent: 0,
  platba_predem: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const kontaktniOsoby: KontaktniOsoba[] = [
  {
    id: "ko1",
    klient_id: "k1",
    jmeno: "Karel Hlavní",
    funkce: "Jednatel",
    telefon: "777555666",
    email: "karel@alfa.cz",
    poznamka: null,
    je_primarni: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
  },
  {
    id: "ko2",
    klient_id: "k1",
    jmeno: "Eva Vedlejší",
    funkce: "Provozní",
    telefon: "777777888",
    email: "eva@alfa.cz",
    poznamka: null,
    je_primarni: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
  },
];

describe("KlientDetail", () => {
  it("displays firma klient info", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    expect(screen.getByText("Alfa s.r.o.")).toBeInTheDocument();
    expect(screen.getByText("Firma")).toBeInTheDocument();
    expect(screen.getByText("IČO: 12345678")).toBeInTheDocument();
    expect(screen.getByText("DIČ: CZ12345678")).toBeInTheDocument();
    expect(screen.getByText("alfa@test.cz")).toBeInTheDocument();
    expect(screen.getByText("777111222")).toBeInTheDocument();
    expect(screen.getByText("Praha 1")).toBeInTheDocument();
    expect(screen.getByText("DPH: 21%")).toBeInTheDocument();
    expect(screen.getByText("Sleva: 10%")).toBeInTheDocument();
    expect(screen.getByText("Platba předem")).toBeInTheDocument();
    expect(screen.getByText("Testovací poznámka")).toBeInTheDocument();
  });

  it("displays fyzicka_osoba klient info", () => {
    render(<KlientDetail klient={foKlient} kontaktniOsoby={[]} />);

    expect(screen.getByText("Jan Novak")).toBeInTheDocument();
    expect(screen.getByText("FO")).toBeInTheDocument();
    expect(screen.getByText("jan@test.cz")).toBeInTheDocument();
    expect(screen.getByText("777333444")).toBeInTheDocument();
    expect(screen.getByText("Brno")).toBeInTheDocument();
    // No IČO/DIČ for FO
    expect(screen.queryByText(/IČO:/)).not.toBeInTheDocument();
  });

  it("shows back link to klienti list", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    const backLink = screen.getByText("Zpět na seznam");
    expect(backLink.closest("a")).toHaveAttribute("href", "/klienti");
  });

  it("has edit and delete buttons for klient", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    expect(screen.getByText("Upravit")).toBeInTheDocument();
    expect(screen.getByText("Smazat")).toBeInTheDocument();
  });

  it("shows empty kontaktni osoby state", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    expect(screen.getByText("Žádné kontaktní osoby")).toBeInTheDocument();
  });

  it("renders kontaktni osoby list", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={kontaktniOsoby} />);

    expect(screen.getByText("Karel Hlavní")).toBeInTheDocument();
    expect(screen.getByText("Jednatel")).toBeInTheDocument();
    expect(screen.getByText("777555666")).toBeInTheDocument();
    expect(screen.getByText("karel@alfa.cz")).toBeInTheDocument();

    expect(screen.getByText("Eva Vedlejší")).toBeInTheDocument();
    expect(screen.getByText("Provozní")).toBeInTheDocument();
  });

  it("has add kontaktni osoba button", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    // "Přidat" button in kontaktní osoby section
    const addButtons = screen.getAllByText("Přidat");
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows edit and delete buttons per kontaktni osoba", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={kontaktniOsoby} />);

    // 2 kontaktni osoby × edit + delete buttons
    const editButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil")
    );
    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2")
    );
    // Klient has edit+delete + 2 osoby each have edit+delete
    // Pencil: 1 (klient Upravit) + 2 (osoby) = 3 total with lucide-pencil class
    // But klient Upravit uses <Pencil> inside <Button> text
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows kontaktni osoby section title", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={kontaktniOsoby} />);

    expect(screen.getByText("Kontaktní osoby")).toBeInTheDocument();
  });

  it("does not show sleva when 0%", () => {
    render(<KlientDetail klient={foKlient} kontaktniOsoby={[]} />);

    expect(screen.queryByText(/Sleva:/)).not.toBeInTheDocument();
  });

  it("does not show platba predem when false", () => {
    render(<KlientDetail klient={foKlient} kontaktniOsoby={[]} />);

    expect(screen.queryByText("Platba předem")).not.toBeInTheDocument();
  });

  it("renders email as mailto link", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    const emailLink = screen.getByText("alfa@test.cz").closest("a");
    expect(emailLink).toHaveAttribute("href", "mailto:alfa@test.cz");
  });

  it("renders phone as tel link", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} />);

    const phoneLink = screen.getByText("777111222").closest("a");
    expect(phoneLink).toHaveAttribute("href", "tel:777111222");
  });
});
