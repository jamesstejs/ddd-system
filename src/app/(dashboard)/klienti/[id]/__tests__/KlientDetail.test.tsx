import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KlientDetail } from "../KlientDetail";
import type { Tables } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type KontaktniOsoba = Tables<"kontaktni_osoby">;
type Objekt = Tables<"objekty">;

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

vi.mock("../objekty/actions", () => ({
  createObjektAction: vi.fn(),
  updateObjektAction: vi.fn(),
  deleteObjektAction: vi.fn(),
}));

const firmaKlient: Klient = {
  id: "k1",
  typ: "firma",
  nazev: "Alfa s.r.o.",
  jmeno: "",
  prijmeni: "",
  ico: "12345678",
  dic: "CZ12345678",
  kod: "TST001",
  email: "alfa@test.cz",
  telefon: "777111222",
  adresa: "Praha 1",
  poznamka: "Testovací poznámka",
  dph_sazba: 21,
  individualni_sleva_procent: 10,
  platba_predem: true,
  fakturoid_subject_id: null,
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
  kod: "FYZ001",
  email: "jan@test.cz",
  telefon: "777333444",
  adresa: "Brno",
  poznamka: null,
  dph_sazba: 21,
  individualni_sleva_procent: 0,
  platba_predem: false,
  fakturoid_subject_id: null,
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

const testObjekty: Objekt[] = [
  {
    id: "obj1",
    klient_id: "k1",
    nazev: "Provozovna Praha",
    adresa: "Hlavní 1, Praha",
    plocha_m2: 150,
    typ_objektu: "gastro",
    poznamka: null,
    planek_url: null,
    lat: null,
    lng: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
  },
  {
    id: "obj2",
    klient_id: "k1",
    nazev: "Sklad Brno",
    adresa: "Skladová 5, Brno",
    plocha_m2: 500,
    typ_objektu: "sklad_nevyzivocisna",
    poznamka: "Velký sklad",
    planek_url: "https://example.com/planek.jpg",
    lat: null,
    lng: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
  },
];

describe("KlientDetail", () => {
  it("displays firma klient info", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

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
    render(<KlientDetail klient={foKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.getByText("Jan Novak")).toBeInTheDocument();
    expect(screen.getByText("FO")).toBeInTheDocument();
    expect(screen.getByText("jan@test.cz")).toBeInTheDocument();
    expect(screen.getByText("777333444")).toBeInTheDocument();
    expect(screen.getByText("Brno")).toBeInTheDocument();
    expect(screen.queryByText(/IČO:/)).not.toBeInTheDocument();
  });

  it("shows back link to klienti list", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    const backLink = screen.getByText("Zpět na seznam");
    expect(backLink.closest("a")).toHaveAttribute("href", "/klienti");
  });

  it("has edit and delete buttons for klient", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.getByText("Upravit")).toBeInTheDocument();
    expect(screen.getByText("Smazat")).toBeInTheDocument();
  });

  it("shows empty kontaktni osoby state", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.getByText("Žádné kontaktní osoby")).toBeInTheDocument();
  });

  it("renders kontaktni osoby list", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={kontaktniOsoby} objekty={[]} />);

    expect(screen.getByText("Karel Hlavní")).toBeInTheDocument();
    expect(screen.getByText("Jednatel")).toBeInTheDocument();
    expect(screen.getByText("777555666")).toBeInTheDocument();
    expect(screen.getByText("karel@alfa.cz")).toBeInTheDocument();

    expect(screen.getByText("Eva Vedlejší")).toBeInTheDocument();
    expect(screen.getByText("Provozní")).toBeInTheDocument();
  });

  it("has add kontaktni osoba button", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    const addButtons = screen.getAllByText("Přidat");
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows edit and delete buttons per kontaktni osoba", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={kontaktniOsoby} objekty={[]} />);

    const editButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil")
    );
    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2")
    );
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows kontaktni osoby section title", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={kontaktniOsoby} objekty={[]} />);

    expect(screen.getByText("Kontaktní osoby")).toBeInTheDocument();
  });

  it("does not show sleva when 0%", () => {
    render(<KlientDetail klient={foKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.queryByText(/Sleva:/)).not.toBeInTheDocument();
  });

  it("does not show platba predem when false", () => {
    render(<KlientDetail klient={foKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.queryByText("Platba předem")).not.toBeInTheDocument();
  });

  it("renders email as mailto link", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    const emailLink = screen.getByText("alfa@test.cz").closest("a");
    expect(emailLink).toHaveAttribute("href", "mailto:alfa@test.cz");
  });

  it("renders phone as tel link", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    const phoneLink = screen.getByText("777111222").closest("a");
    expect(phoneLink).toHaveAttribute("href", "tel:777111222");
  });

  // --- Objekty tests ---

  it("shows empty objekty state", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.getByText("Žádné objekty")).toBeInTheDocument();
  });

  it("shows objekty section title", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    expect(screen.getByText("Objekty")).toBeInTheDocument();
  });

  it("renders objekty list with details", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={testObjekty} />);

    expect(screen.getByText("Provozovna Praha")).toBeInTheDocument();
    expect(screen.getByText("Hlavní 1, Praha")).toBeInTheDocument();
    expect(screen.getByText("Gastro")).toBeInTheDocument();
    expect(screen.getByText("150 m²")).toBeInTheDocument();

    expect(screen.getByText("Sklad Brno")).toBeInTheDocument();
    expect(screen.getByText("Skladová 5, Brno")).toBeInTheDocument();
    expect(screen.getByText("Sklad (neživočišný)")).toBeInTheDocument();
    expect(screen.getByText("500 m²")).toBeInTheDocument();
  });

  it("links objekt to detail page", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={testObjekty} />);

    const link = screen.getByText("Provozovna Praha").closest("a");
    expect(link).toHaveAttribute("href", "/klienti/k1/objekty/obj1");
  });

  it("has add objekt button", () => {
    render(<KlientDetail klient={firmaKlient} kontaktniOsoby={[]} objekty={[]} />);

    // "Přidat" buttons: kontaktní osoby + objekty sections
    const addButtons = screen.getAllByText("Přidat");
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
  });
});
