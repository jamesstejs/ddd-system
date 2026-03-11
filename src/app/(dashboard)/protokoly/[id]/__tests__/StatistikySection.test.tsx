import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatistikySection } from "../StatistikySection";
import type {
  DeratStatistiky,
  DezinsStatistiky,
} from "@/lib/utils/protokolUtils";

describe("StatistikySection", () => {
  it("nerender\u00ed nic kdy\u017e \u017e\u00e1dn\u00e1 data", () => {
    const { container } = render(<StatistikySection />);
    expect(container.innerHTML).toBe("");
  });

  it("nerender\u00ed nic kdy\u017e oba props null", () => {
    const { container } = render(
      <StatistikySection deratStatistiky={null} dezinsStatistiky={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("zobrazuje 'Prvn\u00ed protokol' bez p\u0159edchoz\u00edch dat (derat)", () => {
    const stats: DeratStatistiky = {
      currentAvgPozer: 25,
      previousAvgPozer: null,
      trend: null,
      currentBodyCount: 5,
      previousBodyCount: null,
    };

    render(<StatistikySection deratStatistiky={stats} />);
    expect(
      screen.getByText(/Prvn\u00ed protokol pro tento objekt/),
    ).toBeTruthy();
  });

  it("zobrazuje trend badge se spr\u00e1vnou barvou (klesaj\u00edc\u00ed)", () => {
    const stats: DeratStatistiky = {
      currentAvgPozer: 25,
      previousAvgPozer: 50,
      trend: "klesajici",
      currentBodyCount: 10,
      previousBodyCount: 10,
    };

    render(<StatistikySection deratStatistiky={stats} />);
    expect(screen.getByText(/Klesaj\u00edc\u00ed/)).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText(/d\u0159\u00edve 50%/)).toBeTruthy();
  });

  it("zobrazuje dezinsekce statistiky", () => {
    const stats: DezinsStatistiky = {
      currentTotalPocet: 8,
      previousTotalPocet: 15,
      trend: "klesajici",
      currentBodyCount: 6,
      previousBodyCount: 6,
    };

    render(<StatistikySection dezinsStatistiky={stats} />);
    expect(screen.getByText(/8 ks/)).toBeTruthy();
    expect(screen.getByText(/d\u0159\u00edve 15 ks/)).toBeTruthy();
  });

  it("zobrazuje stoupaj\u00edc\u00ed trend", () => {
    const stats: DeratStatistiky = {
      currentAvgPozer: 75,
      previousAvgPozer: 25,
      trend: "stoupajici",
      currentBodyCount: 10,
      previousBodyCount: 8,
    };

    render(<StatistikySection deratStatistiky={stats} />);
    expect(screen.getByText(/Stoupaj\u00edc\u00ed/)).toBeTruthy();
  });

  it("zobrazuje oba typy statistik najednou", () => {
    const deratStats: DeratStatistiky = {
      currentAvgPozer: 30,
      previousAvgPozer: 40,
      trend: "klesajici",
      currentBodyCount: 12,
      previousBodyCount: 12,
    };
    const dezinsStats: DezinsStatistiky = {
      currentTotalPocet: 5,
      previousTotalPocet: 10,
      trend: "klesajici",
      currentBodyCount: 4,
      previousBodyCount: 4,
    };

    render(
      <StatistikySection
        deratStatistiky={deratStats}
        dezinsStatistiky={dezinsStats}
      />,
    );

    // Oba typy statistik p\u0159\u00edtomny
    expect(screen.getByText(/Pr\u016fm\u011brn\u00fd po\u017eer/)).toBeTruthy();
    expect(screen.getByText(/Celkem hmyzu/)).toBeTruthy();
  });
});
