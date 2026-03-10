import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PripravkyList from "../PripravkyList";
import type { Database } from "@/lib/supabase/database.types";

type Pripravek = Database["public"]["Tables"]["pripravky"]["Row"];

const basePripravek: Pripravek = {
  id: "p1",
  nazev: "Brodifacoum Bloc",
  ucinna_latka: "Brodifacoum 0,005%",
  protilatka: "Vitamin K1 (Fytomenadion)",
  typ: "rodenticid",
  forma: "voskovy_blok",
  baleni: "10 kg kbelík",
  cilovy_skudce: ["Potkan obecný", "Myš domácí"],
  omezeni_prostor: ["prumysl", "venkovni"],
  aktivni: true,
  poznamka: "Profesionální použití",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const pripravky: Pripravek[] = [
  basePripravek,
  {
    ...basePripravek,
    id: "p2",
    nazev: "Cyperkill 25 EC",
    ucinna_latka: "Cypermethrin 25%",
    protilatka: null,
    typ: "insekticid",
    forma: "kapalina",
    baleni: "1 l",
    cilovy_skudce: ["Šváb obecný", "Rus domácí"],
    omezeni_prostor: ["potravinarsky", "domacnost", "prumysl"],
    poznamka: null,
  },
  {
    ...basePripravek,
    id: "p3",
    nazev: "Peroxid dezinfekce",
    ucinna_latka: "Peroxid vodíku 3%",
    protilatka: null,
    typ: "dezinfekce",
    forma: "kapalina",
    baleni: "5 l",
    cilovy_skudce: [],
    omezeni_prostor: ["potravinarsky", "domacnost"],
    poznamka: null,
  },
  {
    ...basePripravek,
    id: "p4",
    nazev: "Neaktivní přípravek",
    ucinna_latka: null,
    protilatka: null,
    typ: "biocid",
    forma: "prasek",
    baleni: null,
    cilovy_skudce: [],
    omezeni_prostor: [],
    aktivni: false,
    poznamka: null,
  },
];

describe("PripravkyList", () => {
  it("renders all pripravky for non-admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    expect(screen.getByText("Brodifacoum Bloc")).toBeInTheDocument();
    expect(screen.getByText("Cyperkill 25 EC")).toBeInTheDocument();
    expect(screen.getByText("Peroxid dezinfekce")).toBeInTheDocument();
    expect(screen.getByText("Neaktivní přípravek")).toBeInTheDocument();
  });

  it("shows correct count", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("4 přípravky")).toBeInTheDocument();
  });

  it("shows singular count for 1 item", () => {
    render(
      <PripravkyList pripravky={[basePripravek]} isAdmin={false} blByPripravek={{}} />,
    );
    expect(screen.getByText("1 přípravek")).toBeInTheDocument();
  });

  it("shows empty state when no pripravky", () => {
    render(<PripravkyList pripravky={[]} isAdmin={false} blByPripravek={{}} />);
    expect(
      screen.getByText("Zatím žádné přípravky"),
    ).toBeInTheDocument();
  });

  it("displays ucinna_latka", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("Brodifacoum 0,005%")).toBeInTheDocument();
    expect(screen.getByText("Cypermethrin 25%")).toBeInTheDocument();
  });

  it("displays typ badges", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    // Typ labels appear in filter buttons AND in card badges
    expect(screen.getAllByText("Rodenticid").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Insekticid").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Dezinfekce").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Biocid").length).toBeGreaterThanOrEqual(2);
  });

  it("displays forma badges", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("Voskový blok")).toBeInTheDocument();
    expect(screen.getAllByText("Kapalina").length).toBeGreaterThanOrEqual(2);
  });

  it("displays cilovy_skudce badges", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("Potkan obecný")).toBeInTheDocument();
    expect(screen.getByText("Myš domácí")).toBeInTheDocument();
    expect(screen.getByText("Šváb obecný")).toBeInTheDocument();
  });

  it("displays omezeni_prostor badges", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getAllByText("Průmysl").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Venkovní").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Domácnost").length).toBeGreaterThanOrEqual(1);
  });

  it("displays protilatka", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(
      screen.getByText("Vitamin K1 (Fytomenadion)"),
    ).toBeInTheDocument();
  });

  it("displays baleni", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("10 kg kbelík")).toBeInTheDocument();
  });

  it("displays poznamka", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("Profesionální použití")).toBeInTheDocument();
  });

  // --- Filtrování ---

  it("filters by typ rodenticid", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    const filterButtons = screen.getAllByRole("button");
    const rodenticidFilter = filterButtons.find(
      (btn) => btn.textContent === "Rodenticid" && !btn.closest("[class*='card']"),
    );
    if (rodenticidFilter) fireEvent.click(rodenticidFilter);

    expect(screen.getByText("Brodifacoum Bloc")).toBeInTheDocument();
    expect(screen.queryByText("Cyperkill 25 EC")).not.toBeInTheDocument();
    expect(screen.queryByText("Peroxid dezinfekce")).not.toBeInTheDocument();
  });

  it("filters by typ insekticid", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    const filterButtons = screen.getAllByRole("button");
    const insekticidFilter = filterButtons.find(
      (btn) => btn.textContent === "Insekticid" && !btn.closest("[class*='card']"),
    );
    if (insekticidFilter) fireEvent.click(insekticidFilter);

    expect(screen.queryByText("Brodifacoum Bloc")).not.toBeInTheDocument();
    expect(screen.getByText("Cyperkill 25 EC")).toBeInTheDocument();
  });

  it("filters by search query (nazev)", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    const searchInput = screen.getByPlaceholderText(
      "Hledat přípravek, účinnou látku, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "Brodifacoum" } });

    expect(screen.getByText("Brodifacoum Bloc")).toBeInTheDocument();
    expect(screen.queryByText("Cyperkill 25 EC")).not.toBeInTheDocument();
  });

  it("filters by search query (ucinna_latka)", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    const searchInput = screen.getByPlaceholderText(
      "Hledat přípravek, účinnou látku, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "Cypermethrin" } });

    expect(screen.getByText("Cyperkill 25 EC")).toBeInTheDocument();
    expect(screen.queryByText("Brodifacoum Bloc")).not.toBeInTheDocument();
  });

  it("filters by search query (cilovy_skudce)", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    const searchInput = screen.getByPlaceholderText(
      "Hledat přípravek, účinnou látku, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "Šváb" } });

    expect(screen.getByText("Cyperkill 25 EC")).toBeInTheDocument();
    expect(screen.queryByText("Brodifacoum Bloc")).not.toBeInTheDocument();
  });

  it("shows no-match message when search yields no results", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);

    const searchInput = screen.getByPlaceholderText(
      "Hledat přípravek, účinnou látku, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "neexistuje" } });

    expect(
      screen.getByText("Žádné přípravky neodpovídají filtru"),
    ).toBeInTheDocument();
  });

  // --- Admin funkce ---

  it("does not show CRUD buttons for non-admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.queryByText("Přidat")).not.toBeInTheDocument();
  });

  it("shows Přidat button for admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={true} blByPripravek={{}} />);
    expect(screen.getByText("Přidat")).toBeInTheDocument();
  });

  it("shows edit and delete buttons for admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={true} blByPripravek={{}} />);
    // Each card has edit + delete icon buttons
    const allButtons = screen.getAllByRole("button");
    const editButtons = allButtons.filter((btn) =>
      btn.querySelector("svg.lucide-pencil"),
    );
    const deleteButtons = allButtons.filter((btn) =>
      btn.querySelector("svg.lucide-trash-2"),
    );
    expect(editButtons.length).toBe(4);
    expect(deleteButtons.length).toBe(4);
  });

  it("shows aktivni/neaktivni filter for admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={true} blByPripravek={{}} />);
    const filterButtons = screen.getAllByRole("button");
    const aktivniFilter = filterButtons.find(
      (btn) => btn.textContent === "Aktivní",
    );
    const neaktivniFilter = filterButtons.find(
      (btn) => btn.textContent === "Neaktivní",
    );
    expect(aktivniFilter).toBeDefined();
    expect(neaktivniFilter).toBeDefined();
  });

  it("does not show aktivni/neaktivni filter for non-admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    const filterButtons = screen.getAllByRole("button");
    const aktivniFilter = filterButtons.find(
      (btn) => btn.textContent === "Aktivní",
    );
    expect(aktivniFilter).toBeUndefined();
  });

  it("filters aktivni only for admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={true} blByPripravek={{}} />);

    const filterButtons = screen.getAllByRole("button");
    const aktivniBtn = filterButtons.find(
      (btn) => btn.textContent === "Aktivní",
    );
    if (aktivniBtn) fireEvent.click(aktivniBtn);

    expect(screen.getByText("Brodifacoum Bloc")).toBeInTheDocument();
    expect(screen.getByText("Cyperkill 25 EC")).toBeInTheDocument();
    expect(screen.queryByText("Neaktivní přípravek")).not.toBeInTheDocument();
  });

  it("filters neaktivni only for admin", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={true} blByPripravek={{}} />);

    const filterButtons = screen.getAllByRole("button");
    const neaktivniBtn = filterButtons.find(
      (btn) => btn.textContent === "Neaktivní",
    );
    if (neaktivniBtn) fireEvent.click(neaktivniBtn);

    expect(screen.queryByText("Brodifacoum Bloc")).not.toBeInTheDocument();
    expect(screen.getByText("Neaktivní přípravek")).toBeInTheDocument();
  });

  // --- Neaktivní indikace ---

  it("shows Neaktivní badge on inactive items", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    expect(screen.getByText("Neaktivní")).toBeInTheDocument();
  });

  // --- Mobile/A11y ---

  it("search input has minimum tap target", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    const input = screen.getByPlaceholderText(
      "Hledat přípravek, účinnou látku, škůdce...",
    );
    expect(input.className).toContain("min-h-[44px]");
  });

  it("search input has 16px font for iOS zoom prevention", () => {
    render(<PripravkyList pripravky={pripravky} isAdmin={false} blByPripravek={{}} />);
    const input = screen.getByPlaceholderText(
      "Hledat přípravek, účinnou látku, škůdce...",
    );
    expect(input.className).toContain("text-base");
  });
});
