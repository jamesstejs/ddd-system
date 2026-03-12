import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObjektDetail } from "../ObjektDetail";
import type { Tables } from "@/lib/supabase/database.types";

type Klient = Tables<"klienti">;
type Objekt = Tables<"objekty">;
type Okruh = Tables<"okruhy">;

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

vi.mock("../../actions", () => ({
  updateObjektAction: vi.fn(),
  deleteObjektAction: vi.fn(),
  uploadPlanekAction: vi.fn(),
  deletePlanekAction: vi.fn(),
  createOkruhAction: vi.fn(),
  updateOkruhAction: vi.fn(),
  deleteOkruhAction: vi.fn(),
}));

vi.mock("../../kalkulacka-actions", () => ({
  vypocitejBodyBatchAction: vi.fn(),
}));

const testKlient: Klient = {
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
  poznamka: null,
  dph_sazba: 21,
  individualni_sleva_procent: 0,
  platba_predem: false,
  fakturoid_subject_id: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const testObjekt: Objekt = {
  id: "obj1",
  klient_id: "k1",
  nazev: "Provozovna Praha",
  adresa: "Hlavní 1, Praha",
  plocha_m2: 150,
  typ_objektu: "gastro",
  poznamka: "Testovací poznámka objektu",
  planek_url: null,
  lat: null,
  lng: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
};

const objektSPlankem: Objekt = {
  ...testObjekt,
  id: "obj2",
  planek_url: "https://example.com/planky/obj2/planek.jpg",
};

const testOkruhy: Okruh[] = [
  {
    id: "okr1",
    objekt_id: "obj1",
    nazev: "Kuchyně",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
  },
  {
    id: "okr2",
    objekt_id: "obj1",
    nazev: "Sklad",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
  },
];

describe("ObjektDetail", () => {
  it("displays objekt info", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    // Name appears in breadcrumb + card title
    const names = screen.getAllByText("Provozovna Praha");
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Hlavní 1, Praha")).toBeInTheDocument();
    // "Gastro" appears in objekt badge + kalkulačka badge
    expect(screen.getAllByText("Gastro").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("150 m²")).toBeInTheDocument();
    expect(screen.getByText("Testovací poznámka objektu")).toBeInTheDocument();
  });

  it("shows breadcrumb with klient name", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    expect(screen.getByText("Klienti")).toBeInTheDocument();
    expect(screen.getByText("Alfa s.r.o.")).toBeInTheDocument();
  });

  it("shows back link to klient detail", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    const backLink = screen.getByText("Zpět na klienta");
    expect(backLink.closest("a")).toHaveAttribute("href", "/klienti/k1");
  });

  it("has edit and delete buttons for objekt", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    expect(screen.getByText("Upravit")).toBeInTheDocument();
    expect(screen.getByText("Smazat")).toBeInTheDocument();
  });

  it("shows planek section with empty state when no planek", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    expect(screen.getByText("Plánek objektu")).toBeInTheDocument();
    expect(screen.getByText("Žádný plánek")).toBeInTheDocument();
    expect(screen.getByText("Nahrát")).toBeInTheDocument();
  });

  it("shows planek image when planek_url exists", () => {
    render(<ObjektDetail klient={testKlient} objekt={objektSPlankem} okruhy={[]} />);

    const img = screen.getByAltText("Plánek - Provozovna Praha");
    expect(img).toBeInTheDocument();
    expect(screen.getByText("Nahradit")).toBeInTheDocument();
  });

  it("shows delete planek button when planek exists", () => {
    render(<ObjektDetail klient={testKlient} objekt={objektSPlankem} okruhy={[]} />);

    // "Smazat" appears for objekt delete + planek delete
    const smazatButtons = screen.getAllByText("Smazat");
    expect(smazatButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty okruhy state", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    expect(screen.getByText("Žádné okruhy")).toBeInTheDocument();
  });

  it("shows okruhy section title", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    expect(screen.getByText("Okruhy")).toBeInTheDocument();
  });

  it("renders okruhy list", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={testOkruhy} />);

    expect(screen.getByText("Kuchyně")).toBeInTheDocument();
    expect(screen.getByText("Sklad")).toBeInTheDocument();
  });

  it("has add okruh button", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

    const addButtons = screen.getAllByText("Přidat");
    expect(addButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("shows edit and delete buttons per okruh", () => {
    render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={testOkruhy} />);

    // 2 okruhy × edit + delete buttons
    const editButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-pencil")
    );
    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.querySelector(".lucide-trash-2")
    );
    // Objekt has edit + 2 okruhy each have edit
    expect(editButtons.length).toBeGreaterThanOrEqual(2);
    expect(deleteButtons.length).toBeGreaterThanOrEqual(2);
  });

  describe("Kalkulačka bodů — multi-select typ zásahu", () => {
    it("renders all 4 checkbox options", () => {
      render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

      expect(screen.getByText("Vnitřní deratizace")).toBeInTheDocument();
      expect(screen.getByText("Vnější deratizace")).toBeInTheDocument();
      expect(screen.getByText("Vnitřní dezinsekce")).toBeInTheDocument();
      expect(screen.getByText("Postřik")).toBeInTheDocument();
    });

    it("uses checkboxes, not a select dropdown", () => {
      render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(4);
    });

    it("has 'Vnitřní deratizace' checked by default", () => {
      render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

      const checkboxes = screen.getAllByRole("checkbox");
      // First checkbox = Vnitřní deratizace (checked by default)
      expect(checkboxes[0]).toBeChecked();
      // Others unchecked
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();
      expect(checkboxes[3]).not.toBeChecked();
    });

    it("allows toggling multiple checkboxes", async () => {
      const user = userEvent.setup();
      render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

      const checkboxes = screen.getAllByRole("checkbox");

      // Check dezinsekce (index 2)
      await user.click(checkboxes[2]);
      expect(checkboxes[0]).toBeChecked(); // deratizace still checked
      expect(checkboxes[2]).toBeChecked(); // dezinsekce now checked

      // Uncheck deratizace (index 0)
      await user.click(checkboxes[0]);
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });

    it("pre-fills plocha from objekt", () => {
      render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

      const plochaInput = screen.getByPlaceholderText("Zadejte plochu v m²");
      expect(plochaInput).toHaveValue(150);
    });

    it("shows 'Spočítat body' button", () => {
      render(<ObjektDetail klient={testKlient} objekt={testObjekt} okruhy={[]} />);

      expect(screen.getByText("Spočítat body")).toBeInTheDocument();
    });
  });
});
