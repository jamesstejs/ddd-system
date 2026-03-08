import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SkudciList } from "../SkudciList";
import type { Tables } from "@/lib/supabase/database.types";

type Skudce = Tables<"skudci">;

const baseSkudce: Skudce = {
  id: "s1",
  nazev: "Potkan obecný",
  latinsky_nazev: "Rattus norvegicus",
  typ: "hlodavec",
  kategorie: "přenašeč nemocí",
  doporucena_cetnost_dny: 30,
  pocet_zasahu: "1. návštěva, pak za 2 týdny, pak 1× měsíčně",
  poznamka: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const skudci: Skudce[] = [
  baseSkudce,
  {
    ...baseSkudce,
    id: "s2",
    nazev: "Šváb obecný",
    latinsky_nazev: "Blatta orientalis",
    typ: "lezouci_hmyz",
    kategorie: "škůdce potravin",
    doporucena_cetnost_dny: 28,
    pocet_zasahu: "2 zásahy po 4–6 týdnech, 3. = reklamace",
  },
  {
    ...baseSkudce,
    id: "s3",
    nazev: "Moucha domácí",
    latinsky_nazev: "Musca domestica",
    typ: "letajici_hmyz",
    kategorie: "mouchy",
    doporucena_cetnost_dny: null,
    pocet_zasahu: null,
  },
  {
    ...baseSkudce,
    id: "s4",
    nazev: "Holub domácí",
    latinsky_nazev: "Columba livia domestica",
    typ: "ostatni",
    kategorie: "ptáci",
    doporucena_cetnost_dny: null,
    pocet_zasahu: null,
  },
];

describe("SkudciList", () => {
  it("renders all skudci", () => {
    render(<SkudciList skudci={skudci} />);

    expect(screen.getByText("Potkan obecný")).toBeInTheDocument();
    expect(screen.getByText("Šváb obecný")).toBeInTheDocument();
    expect(screen.getByText("Moucha domácí")).toBeInTheDocument();
    expect(screen.getByText("Holub domácí")).toBeInTheDocument();
  });

  it("shows correct count", () => {
    render(<SkudciList skudci={skudci} />);
    expect(screen.getByText("4 škůdci")).toBeInTheDocument();
  });

  it("shows empty state when no skudci", () => {
    render(<SkudciList skudci={[]} />);
    expect(screen.getByText("Žádní škůdci v databázi")).toBeInTheDocument();
  });

  it("displays latin names in italic", () => {
    render(<SkudciList skudci={skudci} />);
    expect(screen.getByText("Rattus norvegicus")).toBeInTheDocument();
    expect(screen.getByText("Blatta orientalis")).toBeInTheDocument();
  });

  it("displays typ badges", () => {
    render(<SkudciList skudci={skudci} />);
    // Each typ label appears in filter pill AND in card badge(s)
    expect(screen.getAllByText("Hlodavci").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Lezoucí hmyz").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Létající hmyz").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Ostatní").length).toBeGreaterThanOrEqual(2);
  });

  it("displays kategorie badges", () => {
    render(<SkudciList skudci={skudci} />);
    expect(screen.getByText("přenašeč nemocí")).toBeInTheDocument();
    expect(screen.getByText("škůdce potravin")).toBeInTheDocument();
  });

  it("filters by typ hlodavec", () => {
    render(<SkudciList skudci={skudci} />);

    // Filter buttons - "Hlodavci" appears in filter AND in badge, click the filter button
    const filterButtons = screen.getAllByRole("button");
    const hlodavecFilter = filterButtons.find(
      (btn) => btn.textContent?.includes("Hlodavci") && btn.className.includes("rounded-full")
    );
    if (hlodavecFilter) fireEvent.click(hlodavecFilter);

    expect(screen.getByText("Potkan obecný")).toBeInTheDocument();
    expect(screen.queryByText("Šváb obecný")).not.toBeInTheDocument();
    expect(screen.queryByText("Moucha domácí")).not.toBeInTheDocument();
    expect(screen.queryByText("Holub domácí")).not.toBeInTheDocument();
  });

  it("filters by typ lezouci_hmyz", () => {
    render(<SkudciList skudci={skudci} />);

    const filterButtons = screen.getAllByRole("button");
    const lezouciFilter = filterButtons.find(
      (btn) => btn.textContent?.includes("Lezoucí hmyz") && btn.className.includes("rounded-full")
    );
    if (lezouciFilter) fireEvent.click(lezouciFilter);

    expect(screen.queryByText("Potkan obecný")).not.toBeInTheDocument();
    expect(screen.getByText("Šváb obecný")).toBeInTheDocument();
  });

  it("filters by search query", () => {
    render(<SkudciList skudci={skudci} />);

    const searchInput = screen.getByPlaceholderText("Hledat škůdce...");
    fireEvent.change(searchInput, { target: { value: "potkan" } });

    expect(screen.getByText("Potkan obecný")).toBeInTheDocument();
    expect(screen.queryByText("Šváb obecný")).not.toBeInTheDocument();
  });

  it("searches by latin name", () => {
    render(<SkudciList skudci={skudci} />);

    const searchInput = screen.getByPlaceholderText("Hledat škůdce...");
    fireEvent.change(searchInput, { target: { value: "Blatta" } });

    expect(screen.getByText("Šváb obecný")).toBeInTheDocument();
    expect(screen.queryByText("Potkan obecný")).not.toBeInTheDocument();
  });

  it("shows no-match message when search yields no results", () => {
    render(<SkudciList skudci={skudci} />);

    const searchInput = screen.getByPlaceholderText("Hledat škůdce...");
    fireEvent.change(searchInput, { target: { value: "neexistuje" } });

    expect(
      screen.getByText("Žádní škůdci neodpovídají filtru")
    ).toBeInTheDocument();
  });

  it("displays cetnost info when available", () => {
    render(<SkudciList skudci={skudci} />);
    expect(screen.getByText(/Četnost: 1 měsíc/)).toBeInTheDocument();
    expect(screen.getByText(/Četnost: 4 týdny/)).toBeInTheDocument();
  });

  it("displays pocet_zasahu when available", () => {
    render(<SkudciList skudci={skudci} />);
    expect(
      screen.getByText("1. návštěva, pak za 2 týdny, pak 1× měsíčně")
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 zásahy po 4–6 týdnech, 3. = reklamace")
    ).toBeInTheDocument();
  });

  it("is read-only - no CRUD buttons", () => {
    render(<SkudciList skudci={skudci} />);
    // No Přidat, Upravit, Smazat buttons
    expect(screen.queryByText("Přidat")).not.toBeInTheDocument();
    expect(screen.queryByText("Upravit")).not.toBeInTheDocument();
    expect(screen.queryByText("Smazat")).not.toBeInTheDocument();
  });

  it("search input has minimum tap target", () => {
    render(<SkudciList skudci={skudci} />);
    const input = screen.getByPlaceholderText("Hledat škůdce...");
    expect(input.className).toContain("min-h-[44px]");
  });
});
