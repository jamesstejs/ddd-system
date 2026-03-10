import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SablonyPouceniList from "../SablonyPouceniList";
import type { Database } from "@/lib/supabase/database.types";

type SablonaPouceni = Database["public"]["Tables"]["sablony_pouceni"]["Row"];
type Skudce = Database["public"]["Tables"]["skudci"]["Row"];

type SablonaWithSkudce = SablonaPouceni & {
  skudci: { nazev: string } | null;
};

const baseSkudce: Skudce = {
  id: "sk1",
  nazev: "Potkan obecný",
  latinsky_nazev: "Rattus norvegicus",
  typ: "hlodavec",
  kategorie: null,
  doporucena_cetnost_dny: 30,
  pocet_zasahu: "3",
  poznamka: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const skudci: Skudce[] = [
  baseSkudce,
  {
    ...baseSkudce,
    id: "sk2",
    nazev: "Rus domácí",
    latinsky_nazev: "Blattella germanica",
    typ: "lezouci_hmyz",
  },
  {
    ...baseSkudce,
    id: "sk3",
    nazev: "Štěnice domácí",
    latinsky_nazev: "Cimex lectularius",
    typ: "lezouci_hmyz",
  },
];

const baseSablona: SablonaWithSkudce = {
  id: "s1",
  nazev: "Deratizace — obecné poučení",
  typ_zasahu: "deratizace",
  obsah: "Byla provedena deratizace objektu pomocí rodenticidních přípravků.",
  skudce_id: null,
  aktivni: true,
  skudci: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const sablony: SablonaWithSkudce[] = [
  baseSablona,
  {
    ...baseSablona,
    id: "s2",
    nazev: "Dezinsekce — švábi a rusi",
    typ_zasahu: "dezinsekce",
    obsah: "Byla provedena dezinsekce zaměřená na šváby/rusy domácí.",
    skudce_id: "sk2",
    skudci: { nazev: "Rus domácí" },
  },
  {
    ...baseSablona,
    id: "s3",
    nazev: "Dezinsekce — postřik obecné",
    typ_zasahu: "postrik",
    obsah: "Byl proveden insekticidní postřik objektu.",
  },
  {
    ...baseSablona,
    id: "s4",
    nazev: "Neaktivní šablona",
    typ_zasahu: "obecne",
    obsah: "Toto je neaktivní šablona.",
    aktivni: false,
  },
];

describe("SablonyPouceniList", () => {
  it("renders all sablony for non-admin", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );

    expect(screen.getByText("Deratizace — obecné poučení")).toBeInTheDocument();
    expect(screen.getByText("Dezinsekce — švábi a rusi")).toBeInTheDocument();
    expect(screen.getByText("Dezinsekce — postřik obecné")).toBeInTheDocument();
    expect(screen.getByText("Neaktivní šablona")).toBeInTheDocument();
  });

  it("shows correct count", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    expect(screen.getByText("4 šablony")).toBeInTheDocument();
  });

  it("shows singular count for 1 item", () => {
    render(
      <SablonyPouceniList
        sablony={[baseSablona]}
        skudci={skudci}
        isAdmin={false}
      />,
    );
    expect(screen.getByText("1 šablona")).toBeInTheDocument();
  });

  it("shows empty state when no sablony", () => {
    render(
      <SablonyPouceniList sablony={[]} skudci={skudci} isAdmin={false} />,
    );
    expect(
      screen.getByText("Zatím žádné šablony poučení"),
    ).toBeInTheDocument();
  });

  it("displays typ_zasahu badges", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    // Each badge appears in both filter buttons and card badges
    expect(screen.getAllByText("Deratizace").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Dezinsekce").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Postřik").length).toBeGreaterThanOrEqual(2);
  });

  it("displays skudce badge when present", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    expect(screen.getByText("Rus domácí")).toBeInTheDocument();
  });

  it("displays obsah preview (line-clamped)", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    expect(
      screen.getByText(
        "Byla provedena deratizace objektu pomocí rodenticidních přípravků.",
      ),
    ).toBeInTheDocument();
  });

  // --- Filtrování ---

  it("filters by typ_zasahu deratizace", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );

    const filterButtons = screen.getAllByRole("button");
    const deratBtn = filterButtons.find(
      (btn) =>
        btn.textContent === "Deratizace" && !btn.closest("[class*='card']"),
    );
    if (deratBtn) fireEvent.click(deratBtn);

    expect(screen.getByText("Deratizace — obecné poučení")).toBeInTheDocument();
    expect(
      screen.queryByText("Dezinsekce — švábi a rusi"),
    ).not.toBeInTheDocument();
  });

  it("filters by search query (nazev)", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Hledat šablonu, obsah, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "švábi" } });

    expect(screen.getByText("Dezinsekce — švábi a rusi")).toBeInTheDocument();
    expect(
      screen.queryByText("Deratizace — obecné poučení"),
    ).not.toBeInTheDocument();
  });

  it("filters by search query (obsah)", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Hledat šablonu, obsah, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "postřik" } });

    expect(screen.getByText("Dezinsekce — postřik obecné")).toBeInTheDocument();
    expect(
      screen.queryByText("Deratizace — obecné poučení"),
    ).not.toBeInTheDocument();
  });

  it("shows no-match message when search yields no results", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Hledat šablonu, obsah, škůdce...",
    );
    fireEvent.change(searchInput, { target: { value: "xxxxxxxxx" } });

    expect(
      screen.getByText("Žádné šablony neodpovídají filtru"),
    ).toBeInTheDocument();
  });

  // --- Admin funkce ---

  it("does not show CRUD buttons for non-admin", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    expect(screen.queryByText("Přidat")).not.toBeInTheDocument();
  });

  it("shows Přidat button for admin", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={true} />,
    );
    expect(screen.getByText("Přidat")).toBeInTheDocument();
  });

  it("shows edit and delete buttons for admin", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={true} />,
    );
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

  // --- Neaktivní ---

  it("shows Neaktivní badge on inactive items", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    expect(screen.getByText("Neaktivní")).toBeInTheDocument();
  });

  // --- Mobile/A11y ---

  it("search input has minimum tap target", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    const input = screen.getByPlaceholderText(
      "Hledat šablonu, obsah, škůdce...",
    );
    expect(input.className).toContain("min-h-[44px]");
  });

  it("search input has 16px font for iOS zoom prevention", () => {
    render(
      <SablonyPouceniList sablony={sablony} skudci={skudci} isAdmin={false} />,
    );
    const input = screen.getByPlaceholderText(
      "Hledat šablonu, obsah, škůdce...",
    );
    expect(input.className).toContain("text-base");
  });
});
