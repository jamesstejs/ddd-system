import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleSwitch } from "../RoleSwitch";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ refresh: vi.fn() }),
}));

vi.mock("@/app/(dashboard)/actions", () => ({
  switchRoleAction: vi.fn(),
}));

describe("RoleSwitch", () => {
  it("displays the active role label", () => {
    render(<RoleSwitch roles={["admin", "technik"]} aktivniRole="admin" />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("displays Super Admin label for super_admin role", () => {
    render(
      <RoleSwitch roles={["super_admin", "admin"]} aktivniRole="super_admin" />
    );

    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("renders a button with minimum tap target", () => {
    render(<RoleSwitch roles={["admin", "technik"]} aktivniRole="admin" />);

    const trigger = screen.getByRole("button");
    expect(trigger.className).toContain("min-h-[44px]");
    expect(trigger.className).toContain("min-w-[44px]");
  });
});
