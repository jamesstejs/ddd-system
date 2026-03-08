import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "../BottomNav";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn().mockReturnValue("/"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("BottomNav", () => {
  it("shows Dashboard and Více for klient role", () => {
    render(<BottomNav aktivniRole="klient" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Více")).toBeInTheDocument();
    expect(screen.queryByText("Klienti")).not.toBeInTheDocument();
    expect(screen.queryByText("Zakázky")).not.toBeInTheDocument();
    expect(screen.queryByText("Kalendář")).not.toBeInTheDocument();
  });

  it("shows Dashboard, Zakázky, Kalendář, Více for technik role", () => {
    render(<BottomNav aktivniRole="technik" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Zakázky")).toBeInTheDocument();
    expect(screen.getByText("Kalendář")).toBeInTheDocument();
    expect(screen.getByText("Více")).toBeInTheDocument();
    expect(screen.queryByText("Klienti")).not.toBeInTheDocument();
  });

  it("shows all 5 items for admin role", () => {
    render(<BottomNav aktivniRole="admin" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Klienti")).toBeInTheDocument();
    expect(screen.getByText("Zakázky")).toBeInTheDocument();
    expect(screen.getByText("Kalendář")).toBeInTheDocument();
    expect(screen.getByText("Více")).toBeInTheDocument();
  });

  it("shows all 5 items for super_admin role", () => {
    render(<BottomNav aktivniRole="super_admin" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Klienti")).toBeInTheDocument();
    expect(screen.getByText("Zakázky")).toBeInTheDocument();
    expect(screen.getByText("Kalendář")).toBeInTheDocument();
    expect(screen.getByText("Více")).toBeInTheDocument();
  });

  it("renders links with min tap target sizes", () => {
    render(<BottomNav aktivniRole="admin" />);

    const links = screen.getAllByRole("link");
    links.forEach((link) => {
      expect(link.className).toContain("min-h-[56px]");
      expect(link.className).toContain("min-w-[44px]");
    });
  });
});
