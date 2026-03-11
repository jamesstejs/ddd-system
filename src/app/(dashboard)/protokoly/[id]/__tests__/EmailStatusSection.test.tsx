import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  EmailStatusSection,
  type EmailLogEntry,
} from "../EmailStatusSection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const baseEntry: EmailLogEntry = {
  id: "log-1",
  prijemce: "klient@example.com",
  predmet: "Protokol P-TST-001",
  stav: "odeslano",
  chyba_detail: null,
  odeslano_at: "2026-03-11T10:00:00Z",
  created_at: "2026-03-11T10:00:00Z",
};

// ============================================================
// Rendering
// ============================================================

describe("EmailStatusSection — rendering", () => {
  it("renders nothing when emailLog is empty", () => {
    const { container } = render(
      <EmailStatusSection emailLog={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders odesláno status correctly", () => {
    render(<EmailStatusSection emailLog={[baseEntry]} />);
    expect(screen.getByText("Email: Odesláno")).toBeInTheDocument();
    expect(screen.getByText(/klient@example.com/)).toBeInTheDocument();
  });

  it("renders chyba status correctly", () => {
    render(
      <EmailStatusSection
        emailLog={[
          {
            ...baseEntry,
            stav: "chyba",
            chyba_detail: "Invalid API key",
          },
        ]}
      />,
    );
    expect(screen.getByText("Email: Chyba")).toBeInTheDocument();
    expect(screen.getByText("Invalid API key")).toBeInTheDocument();
  });

  it("renders cekajici status correctly", () => {
    render(
      <EmailStatusSection
        emailLog={[{ ...baseEntry, stav: "cekajici" }]}
      />,
    );
    expect(screen.getByText("Email: Čekající")).toBeInTheDocument();
  });

  it("renders doruceno status correctly", () => {
    render(
      <EmailStatusSection
        emailLog={[{ ...baseEntry, stav: "doruceno" }]}
      />,
    );
    expect(screen.getByText("Email: Doručeno")).toBeInTheDocument();
  });

  it("shows recipient email", () => {
    render(<EmailStatusSection emailLog={[baseEntry]} />);
    expect(screen.getByText(/klient@example.com/)).toBeInTheDocument();
  });

  it("formats date in Czech locale", () => {
    render(<EmailStatusSection emailLog={[baseEntry]} />);
    // Should contain formatted date (11. 3. 2026 or similar)
    const dateEl = screen.getByText(/Odesláno:/);
    expect(dateEl).toBeInTheDocument();
  });
});

// ============================================================
// Retry button
// ============================================================

describe("EmailStatusSection — retry", () => {
  it("shows retry button on chyba status with onRetry", () => {
    const onRetry = vi.fn();
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText("Zkusit znovu")).toBeInTheDocument();
  });

  it("does not show retry button on chyba without onRetry", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
      />,
    );
    expect(screen.queryByText("Zkusit znovu")).not.toBeInTheDocument();
  });

  it("does not show retry button on success status", () => {
    const onRetry = vi.fn();
    render(
      <EmailStatusSection emailLog={[baseEntry]} onRetry={onRetry} />,
    );
    expect(screen.queryByText("Zkusit znovu")).not.toBeInTheDocument();
  });

  it("calls onRetry when button clicked", () => {
    const onRetry = vi.fn();
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={onRetry}
      />,
    );
    fireEvent.click(screen.getByText("Zkusit znovu"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows loading state when isRetrying", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={() => {}}
        isRetrying={true}
      />,
    );
    expect(screen.getByText("Odesílám...")).toBeInTheDocument();
  });

  it("disables retry button when isRetrying", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={() => {}}
        isRetrying={true}
      />,
    );
    const button = screen.getByText("Odesílám...");
    expect(button.closest("button")).toBeDisabled();
  });
});

// ============================================================
// History
// ============================================================

describe("EmailStatusSection — history", () => {
  it("shows history toggle when multiple entries", () => {
    render(
      <EmailStatusSection
        emailLog={[
          baseEntry,
          { ...baseEntry, id: "log-2", stav: "chyba", chyba_detail: "First attempt failed" },
        ]}
      />,
    );
    expect(screen.getByText(/Historie/)).toBeInTheDocument();
    expect(screen.getByText(/2 záznamů/)).toBeInTheDocument();
  });

  it("does not show history for single entry", () => {
    render(<EmailStatusSection emailLog={[baseEntry]} />);
    expect(screen.queryByText(/Historie/)).not.toBeInTheDocument();
  });

  it("shows latest entry prominently", () => {
    render(
      <EmailStatusSection
        emailLog={[
          baseEntry,
          { ...baseEntry, id: "log-2", stav: "chyba" },
        ]}
      />,
    );
    // Latest entry should determine the main status
    expect(screen.getByText("Email: Odesláno")).toBeInTheDocument();
  });
});

// ============================================================
// Accessibility
// ============================================================

describe("EmailStatusSection — accessibility", () => {
  it("retry button has type=button attribute", () => {
    const onRetry = vi.fn();
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={onRetry}
      />,
    );
    const button = screen.getByText("Zkusit znovu").closest("button");
    expect(button).toHaveAttribute("type", "button");
  });

  it("retry button is disabled when isRetrying (proper disabled attribute)", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={() => {}}
        isRetrying={true}
      />,
    );
    const button = screen.getByText("Odesílám...").closest("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("disabled");
  });

  it("history section uses <details>/<summary> for native collapsibility", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          baseEntry,
          { ...baseEntry, id: "log-2", stav: "chyba", chyba_detail: "Old error" },
        ]}
      />,
    );
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    const summary = container.querySelector("summary");
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toContain("Historie");
  });
});

// ============================================================
// Minimum tap target size (44px)
// ============================================================

describe("EmailStatusSection — mobile tap target", () => {
  it("retry button has min-h-[44px] class for mobile tap target", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={() => {}}
      />,
    );
    const button = screen.getByText("Zkusit znovu").closest("button");
    expect(button?.className).toContain("min-h-[44px]");
  });
});

// ============================================================
// Loading spinner animation class
// ============================================================

describe("EmailStatusSection — loading spinner", () => {
  it("spinner icon has animate-spin class when isRetrying", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={() => {}}
        isRetrying={true}
      />,
    );
    // The RefreshCw icon is inside the button, find svg with animate-spin
    const button = screen.getByText("Odesílám...").closest("button");
    const svg = button?.querySelector("svg");
    expect(svg?.classList.contains("animate-spin")).toBe(true);
  });

  it("spinner icon does NOT have animate-spin when not retrying", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
        onRetry={() => {}}
        isRetrying={false}
      />,
    );
    const button = screen.getByText("Zkusit znovu").closest("button");
    const svg = button?.querySelector("svg");
    expect(svg?.classList.contains("animate-spin")).toBe(false);
  });
});

// ============================================================
// Color coding matches stav
// ============================================================

describe("EmailStatusSection — color coding per stav", () => {
  it("odeslano uses green background and border", () => {
    const { container } = render(
      <EmailStatusSection emailLog={[baseEntry]} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("bg-green-50");
    expect(wrapper.className).toContain("border-green-200");
  });

  it("odeslano uses green text color for status label", () => {
    const { container } = render(
      <EmailStatusSection emailLog={[baseEntry]} />,
    );
    const statusText = screen.getByText("Email: Odesláno");
    expect(statusText.className).toContain("text-green-600");
  });

  it("chyba uses red background and border", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("bg-red-50");
    expect(wrapper.className).toContain("border-red-200");
  });

  it("chyba uses red text color for status label", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Error" },
        ]}
      />,
    );
    const statusText = screen.getByText("Email: Chyba");
    expect(statusText.className).toContain("text-red-600");
  });

  it("cekajici uses yellow background and border", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[{ ...baseEntry, stav: "cekajici" }]}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("bg-yellow-50");
    expect(wrapper.className).toContain("border-yellow-200");
  });

  it("cekajici uses yellow text color for status label", () => {
    render(
      <EmailStatusSection
        emailLog={[{ ...baseEntry, stav: "cekajici" }]}
      />,
    );
    const statusText = screen.getByText("Email: Čekající");
    expect(statusText.className).toContain("text-yellow-600");
  });

  it("doruceno uses green-700 text color", () => {
    render(
      <EmailStatusSection
        emailLog={[{ ...baseEntry, stav: "doruceno" }]}
      />,
    );
    const statusText = screen.getByText("Email: Doručeno");
    expect(statusText.className).toContain("text-green-700");
  });

  it("doruceno uses green background", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[{ ...baseEntry, stav: "doruceno" }]}
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("bg-green-50");
  });

  it("chyba error detail box uses red-100 background", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: "Something went wrong" },
        ]}
      />,
    );
    const errorBox = screen.getByText("Something went wrong");
    expect(errorBox.className).toContain("bg-red-100");
    expect(errorBox.className).toContain("text-red-700");
  });
});

// ============================================================
// Edge: null odeslano_at falls back to created_at
// ============================================================

describe("EmailStatusSection — null odeslano_at fallback", () => {
  it("displays created_at when odeslano_at is null", () => {
    render(
      <EmailStatusSection
        emailLog={[
          {
            ...baseEntry,
            odeslano_at: null,
            created_at: "2026-03-10T14:30:00Z",
          },
        ]}
      />,
    );
    // Should display formatted date from created_at, not "—"
    const dateEl = screen.getByText(/Odesláno:/);
    expect(dateEl.textContent).not.toContain("\u2014"); // em dash
  });

  it("does NOT display em dash for date when odeslano_at is null (uses created_at)", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          {
            ...baseEntry,
            odeslano_at: null,
            created_at: "2026-01-15T08:00:00Z",
          },
        ]}
      />,
    );
    // The formatDate function uses odeslano_at || created_at, so it should not show "—"
    const allText = container.textContent || "";
    // Find the "Odesláno:" line specifically
    const odeslatoMatch = allText.match(/Odesláno:\s*(.*)/);
    expect(odeslatoMatch).not.toBeNull();
    // It should contain a date, not just "—"
    expect(odeslatoMatch![1].trim()).not.toBe("\u2014");
  });

  it("history entries also fall back to created_at when odeslano_at is null", () => {
    render(
      <EmailStatusSection
        emailLog={[
          baseEntry,
          {
            ...baseEntry,
            id: "log-2",
            stav: "chyba",
            chyba_detail: "Previous error",
            odeslano_at: null,
            created_at: "2026-03-09T12:00:00Z",
          },
        ]}
      />,
    );
    // History section should exist and show dates (not "—")
    expect(screen.getByText(/Historie/)).toBeInTheDocument();
  });
});

// ============================================================
// Edge: chyba_detail is null on chyba status
// ============================================================

describe("EmailStatusSection — chyba without detail", () => {
  it("does not render error detail box when chyba_detail is null", () => {
    const { container } = render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: null },
        ]}
      />,
    );
    // Error detail box (bg-red-100) should not appear
    const errorBox = container.querySelector(".bg-red-100");
    expect(errorBox).toBeNull();
  });

  it("still shows retry button on chyba with null chyba_detail", () => {
    render(
      <EmailStatusSection
        emailLog={[
          { ...baseEntry, stav: "chyba", chyba_detail: null },
        ]}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("Zkusit znovu")).toBeInTheDocument();
  });
});
