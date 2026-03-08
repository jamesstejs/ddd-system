import { describe, it, expect } from "vitest";

type AppRole = "super_admin" | "admin" | "technik" | "klient";

const ROLE_ROUTES: Record<string, AppRole[]> = {
  "/klienti": ["admin", "super_admin"],
  "/zakazky": ["admin", "super_admin", "technik"],
  "/kalendar": ["admin", "super_admin", "technik"],
  "/uzivatele": ["admin", "super_admin"],
  "/nastaveni": ["super_admin"],
};

function isRouteAllowed(pathname: string, aktivniRole: AppRole): boolean {
  const protectedRoute = Object.keys(ROLE_ROUTES).find(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (!protectedRoute) return true;
  return ROLE_ROUTES[protectedRoute].includes(aktivniRole);
}

describe("Middleware role-based route protection", () => {
  it("allows admin to access /klienti", () => {
    expect(isRouteAllowed("/klienti", "admin")).toBe(true);
  });

  it("allows super_admin to access /klienti", () => {
    expect(isRouteAllowed("/klienti", "super_admin")).toBe(true);
  });

  it("blocks technik from /klienti", () => {
    expect(isRouteAllowed("/klienti", "technik")).toBe(false);
  });

  it("blocks klient from /klienti", () => {
    expect(isRouteAllowed("/klienti", "klient")).toBe(false);
  });

  it("allows technik to access /zakazky", () => {
    expect(isRouteAllowed("/zakazky", "technik")).toBe(true);
  });

  it("blocks klient from /zakazky", () => {
    expect(isRouteAllowed("/zakazky", "klient")).toBe(false);
  });

  it("allows technik to access /kalendar", () => {
    expect(isRouteAllowed("/kalendar", "technik")).toBe(true);
  });

  it("blocks klient from /kalendar", () => {
    expect(isRouteAllowed("/kalendar", "klient")).toBe(false);
  });

  it("allows admin to access /uzivatele", () => {
    expect(isRouteAllowed("/uzivatele", "admin")).toBe(true);
  });

  it("blocks technik from /uzivatele", () => {
    expect(isRouteAllowed("/uzivatele", "technik")).toBe(false);
  });

  it("allows super_admin to access /nastaveni", () => {
    expect(isRouteAllowed("/nastaveni", "super_admin")).toBe(true);
  });

  it("blocks admin from /nastaveni", () => {
    expect(isRouteAllowed("/nastaveni", "admin")).toBe(false);
  });

  it("blocks technik from /nastaveni", () => {
    expect(isRouteAllowed("/nastaveni", "technik")).toBe(false);
  });

  it("blocks klient from /nastaveni", () => {
    expect(isRouteAllowed("/nastaveni", "klient")).toBe(false);
  });

  it("allows any role to access /", () => {
    expect(isRouteAllowed("/", "klient")).toBe(true);
    expect(isRouteAllowed("/", "technik")).toBe(true);
    expect(isRouteAllowed("/", "admin")).toBe(true);
    expect(isRouteAllowed("/", "super_admin")).toBe(true);
  });

  it("allows any role to access /vice", () => {
    expect(isRouteAllowed("/vice", "klient")).toBe(true);
    expect(isRouteAllowed("/vice", "technik")).toBe(true);
  });

  it("protects sub-routes like /klienti/123", () => {
    expect(isRouteAllowed("/klienti/123", "admin")).toBe(true);
    expect(isRouteAllowed("/klienti/123", "technik")).toBe(false);
  });
});
