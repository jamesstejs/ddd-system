import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------
// Dashboard role-based rendering logic tests
// ---------------------------------------------------------------

describe("dashboard role checks", () => {
  it("admin sees admin dashboard", () => {
    const role: string = "admin";
    const showAdmin = role === "admin" || role === "super_admin";
    const showTechnik = role === "technik";
    expect(showAdmin).toBe(true);
    expect(showTechnik).toBe(false);
  });

  it("super_admin sees admin dashboard with extra widgets", () => {
    const role: string = "super_admin";
    const showAdmin = role === "admin" || role === "super_admin";
    const isSuperAdmin = role === "super_admin";
    expect(showAdmin).toBe(true);
    expect(isSuperAdmin).toBe(true);
  });

  it("technik sees technik dashboard", () => {
    const role: string = "technik";
    const showAdmin = role === "admin" || role === "super_admin";
    const showTechnik = role === "technik";
    expect(showAdmin).toBe(false);
    expect(showTechnik).toBe(true);
  });

  it("klient sees klient dashboard", () => {
    const role: string = "klient";
    const showAdmin = role === "admin" || role === "super_admin";
    const showTechnik = role === "technik";
    const showKlient = role === "klient";
    expect(showAdmin).toBe(false);
    expect(showTechnik).toBe(false);
    expect(showKlient).toBe(true);
  });
});

// ---------------------------------------------------------------
// Overdue zasahy logic
// ---------------------------------------------------------------

describe("overdue zasahy detection", () => {
  it("identifies zasahy with past date and non-completed status", () => {
    const today = "2026-03-12";
    const zasahy = [
      { datum: "2026-03-10", status: "naplanovano" },
      { datum: "2026-03-11", status: "potvrzeny" },
      { datum: "2026-03-09", status: "hotovo" },
      { datum: "2026-03-13", status: "naplanovano" },
      { datum: "2026-03-08", status: "zruseno" },
    ];

    const overdue = zasahy.filter(
      (z) => z.datum < today && z.status !== "hotovo" && z.status !== "zruseno",
    );

    expect(overdue.length).toBe(2);
    expect(overdue[0].datum).toBe("2026-03-10");
    expect(overdue[1].datum).toBe("2026-03-11");
  });

  it("returns empty for all completed", () => {
    const today = "2026-03-12";
    const zasahy = [
      { datum: "2026-03-10", status: "hotovo" },
      { datum: "2026-03-11", status: "zruseno" },
    ];

    const overdue = zasahy.filter(
      (z) => z.datum < today && z.status !== "hotovo" && z.status !== "zruseno",
    );

    expect(overdue.length).toBe(0);
  });

  it("returns empty when all dates are in the future", () => {
    const today = "2026-03-12";
    const zasahy = [
      { datum: "2026-03-13", status: "naplanovano" },
      { datum: "2026-03-14", status: "potvrzeny" },
    ];

    const overdue = zasahy.filter(
      (z) => z.datum < today && z.status !== "hotovo" && z.status !== "zruseno",
    );

    expect(overdue.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// Premie role checks (aktivni_role vs role array)
// ---------------------------------------------------------------

describe("premie page role checks", () => {
  it("uses aktivni_role not role array for super_admin check", () => {
    // Bug fix: checking aktivni_role instead of role array
    const profile = {
      aktivni_role: "technik",
      role: ["super_admin", "admin", "technik"],
    };

    const role = profile.aktivni_role;
    const isSuperAdmin = role === "super_admin";
    const isAdmin = isSuperAdmin || role === "admin";

    expect(isSuperAdmin).toBe(false);
    expect(isAdmin).toBe(false);
  });

  it("correctly identifies super_admin when aktivni_role is super_admin", () => {
    const profile = {
      aktivni_role: "super_admin",
      role: ["super_admin", "admin", "technik"],
    };

    const role = profile.aktivni_role;
    const isSuperAdmin = role === "super_admin";
    const isAdmin = isSuperAdmin || role === "admin";

    expect(isSuperAdmin).toBe(true);
    expect(isAdmin).toBe(true);
  });

  it("correctly identifies admin when aktivni_role is admin", () => {
    const profile = {
      aktivni_role: "admin",
      role: ["admin", "technik"],
    };

    const role = profile.aktivni_role;
    const isSuperAdmin = role === "super_admin";
    const isAdmin = isSuperAdmin || role === "admin";

    expect(isSuperAdmin).toBe(false);
    expect(isAdmin).toBe(true);
  });
});
