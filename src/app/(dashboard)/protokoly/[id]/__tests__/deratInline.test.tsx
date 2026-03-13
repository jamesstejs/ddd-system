import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DeratInlineRow } from "../DeratInlineRow";

const baseBod = {
  id: "bod-1",
  cislo_bodu: "L1",
  okruh_id: null,
  typ_stanicky: "mys" as const,
  pripravek_id: null,
  pozer_procent: 25,
  stav_stanicky: "ok" as const,
};

describe("DeratInlineRow", () => {
  it("renders bod number and type", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={baseBod}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    expect(screen.getByText("L1")).toBeInTheDocument();
    // "Myš" → short label "Myš"
    expect(screen.getByText("Myš")).toBeInTheDocument();
  });

  it("highlights active požer value", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={{ ...baseBod, pozer_procent: 50 }}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    const btn50 = screen.getByLabelText("Požer 50%");
    expect(btn50).toHaveAttribute("aria-pressed", "true");

    const btn25 = screen.getByLabelText("Požer 25%");
    expect(btn25).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with updated požer on tap", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={baseBod}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    const btn75 = screen.getByLabelText("Požer 75%");
    fireEvent.click(btn75);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      ...baseBod,
      pozer_procent: 75,
    });
  });

  it("disables buttons in readonly mode", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={baseBod}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
        readonly
      />,
    );

    const btn0 = screen.getByLabelText("Požer 0%");
    expect(btn0).toBeDisabled();

    fireEvent.click(btn0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not show settings button in readonly mode", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={baseBod}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
        readonly
      />,
    );

    expect(
      screen.queryByLabelText(`Nastavení bodu ${baseBod.cislo_bodu}`),
    ).not.toBeInTheDocument();
  });

  it("calls onSettingsTap when settings button is clicked", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={baseBod}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    const settingsBtn = screen.getByLabelText(
      `Nastavení bodu ${baseBod.cislo_bodu}`,
    );
    fireEvent.click(settingsBtn);

    expect(onSettingsTap).toHaveBeenCalledTimes(1);
  });

  it("shows stav icon for non-ok statuses", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    const { rerender } = render(
      <DeratInlineRow
        bod={{ ...baseBod, stav_stanicky: "ok" }}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    // OK status has no icon
    expect(screen.queryByTitle("OK")).not.toBeInTheDocument();

    // Rerender with "poskozena" — should show warning icon
    rerender(
      <DeratInlineRow
        bod={{ ...baseBod, stav_stanicky: "poskozena" }}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    expect(screen.getByTitle("Poškozená")).toBeInTheDocument();
  });

  it("renders all 5 požer buttons", () => {
    const onChange = vi.fn();
    const onSettingsTap = vi.fn();

    render(
      <DeratInlineRow
        bod={baseBod}
        onChange={onChange}
        onSettingsTap={onSettingsTap}
      />,
    );

    expect(screen.getByLabelText("Požer 0%")).toBeInTheDocument();
    expect(screen.getByLabelText("Požer 25%")).toBeInTheDocument();
    expect(screen.getByLabelText("Požer 50%")).toBeInTheDocument();
    expect(screen.getByLabelText("Požer 75%")).toBeInTheDocument();
    expect(screen.getByLabelText("Požer 100%")).toBeInTheDocument();
  });
});
