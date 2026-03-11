import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProtokolyList } from "../ProtokolyList";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

function makeProtokol(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    cislo_protokolu: "P-TEST-001",
    status: "ke_schvaleni" as const,
    created_at: "2026-03-10T10:00:00Z",
    poznamka: null,
    profiles: { id: "t-1", jmeno: "Jan", prijmeni: "Nov\u00e1k" },
    zasahy: {
      id: "z-1",
      datum: "2026-03-10",
      zakazky: {
        id: "zak-1",
        objekty: {
          id: "obj-1",
          nazev: "Hlavn\u00ed sklad",
          adresa: "Testovac\u00ed 1",
          klienti: {
            id: "k-1",
            nazev: "Test Firma s.r.o.",
            jmeno: null,
            prijmeni: null,
          },
        },
      },
    },
    ...overrides,
  };
}

describe("ProtokolyList", () => {
  it("renderuje seznam protokol\u016f", () => {
    render(<ProtokolyList protokoly={[makeProtokol()]} />);

    expect(screen.getByText("P-TEST-001")).toBeDefined();
    expect(screen.getByText(/Test Firma s.r.o./)).toBeDefined();
    // "Ke schválení" appears in both filter chip and badge
    expect(screen.getAllByText("Ke schv\u00e1len\u00ed").length).toBeGreaterThanOrEqual(1);
  });

  it("filtruje podle statusu", () => {
    const protokoly = [
      makeProtokol({ id: "p-1", status: "ke_schvaleni" }),
      makeProtokol({
        id: "p-2",
        cislo_protokolu: "P-TEST-002",
        status: "schvaleny",
      }),
    ];

    render(<ProtokolyList protokoly={protokoly} />);

    // Default filter is ke_schvaleni — should show only p-1
    expect(screen.getByText("P-TEST-001")).toBeDefined();
    expect(screen.queryByText("P-TEST-002")).toBeNull();

    // Click "V\u0161e" filter
    fireEvent.click(screen.getByText("V\u0161e"));
    expect(screen.getByText("P-TEST-001")).toBeDefined();
    expect(screen.getByText("P-TEST-002")).toBeDefined();

    // Click "Schv\u00e1len\u00fd" filter chip (badge also has this text)
    const schvalenyElements = screen.getAllByText("Schv\u00e1len\u00fd");
    const filterChip = schvalenyElements.find((el) => el.tagName === "BUTTON");
    fireEvent.click(filterChip!);
    expect(screen.queryByText("P-TEST-001")).toBeNull();
    expect(screen.getByText("P-TEST-002")).toBeDefined();
  });

  it("filtruje podle vyhled\u00e1v\u00e1n\u00ed", () => {
    const protokoly = [
      makeProtokol({ id: "p-1", cislo_protokolu: "P-ALFA-001" }),
      makeProtokol({ id: "p-2", cislo_protokolu: "P-BETA-001" }),
    ];

    render(<ProtokolyList protokoly={protokoly} />);

    // Show all first
    fireEvent.click(screen.getByText("V\u0161e"));

    const searchInput = screen.getByPlaceholderText("Hledat protokol...");
    fireEvent.change(searchInput, { target: { value: "ALFA" } });

    expect(screen.getByText("P-ALFA-001")).toBeDefined();
    expect(screen.queryByText("P-BETA-001")).toBeNull();
  });

  it("zobrazuje pr\u00e1zdn\u00fd stav", () => {
    render(<ProtokolyList protokoly={[]} />);

    expect(screen.getByText("\u017d\u00e1dn\u00e9 protokoly")).toBeDefined();
  });

  it("odkazuje na detail protokolu", () => {
    render(<ProtokolyList protokoly={[makeProtokol()]} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/protokoly/p-1");
  });

  it("zobrazuje technika a datum", () => {
    render(<ProtokolyList protokoly={[makeProtokol()]} />);

    expect(screen.getByText(/Jan Nov\u00e1k/)).toBeDefined();
    expect(screen.getByText(/10\. 3\. 2026/)).toBeDefined();
  });

  it("hled\u00e1 podle klienta", () => {
    const protokoly = [
      makeProtokol({
        id: "p-1",
        cislo_protokolu: "P-001",
        zasahy: {
          id: "z-1",
          datum: "2026-03-10",
          zakazky: {
            id: "zak-1",
            objekty: {
              id: "obj-1",
              nazev: "Sklad",
              adresa: null,
              klienti: {
                id: "k-1",
                nazev: "Restaurace U Modr\u00e9ho slona",
                jmeno: null,
                prijmeni: null,
              },
            },
          },
        },
      }),
      makeProtokol({
        id: "p-2",
        cislo_protokolu: "P-002",
        zasahy: {
          id: "z-2",
          datum: "2026-03-11",
          zakazky: {
            id: "zak-2",
            objekty: {
              id: "obj-2",
              nazev: "Kancel\u00e1\u0159",
              adresa: null,
              klienti: {
                id: "k-2",
                nazev: "Tech Corp a.s.",
                jmeno: null,
                prijmeni: null,
              },
            },
          },
        },
      }),
    ];

    render(<ProtokolyList protokoly={protokoly} />);

    // Show all
    fireEvent.click(screen.getByText("V\u0161e"));

    const searchInput = screen.getByPlaceholderText("Hledat protokol...");
    fireEvent.change(searchInput, { target: { value: "modr\u00e9ho" } });

    expect(screen.getByText("P-001")).toBeDefined();
    expect(screen.queryByText("P-002")).toBeNull();
  });
});
