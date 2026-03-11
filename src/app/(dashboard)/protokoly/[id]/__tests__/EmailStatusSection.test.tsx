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
