import { describe, it, expect } from "vitest";

type AppRole = "super_admin" | "admin" | "technik" | "klient";

function isAdminOrSuperAdmin(role: AppRole[]): boolean {
  return role.includes("admin") || role.includes("super_admin");
}

describe("Klienti RLS logic", () => {
  it("admin can access klienti", () => {
    expect(isAdminOrSuperAdmin(["admin"])).toBe(true);
  });

  it("super_admin can access klienti", () => {
    expect(isAdminOrSuperAdmin(["super_admin"])).toBe(true);
  });

  it("user with both admin and technik roles can access klienti", () => {
    expect(isAdminOrSuperAdmin(["admin", "technik"])).toBe(true);
  });

  it("technik cannot access klienti", () => {
    expect(isAdminOrSuperAdmin(["technik"])).toBe(false);
  });

  it("klient cannot access klienti", () => {
    expect(isAdminOrSuperAdmin(["klient"])).toBe(false);
  });
});
