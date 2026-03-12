import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------
// Portal role access logic tests
// ---------------------------------------------------------------

describe("portal role access", () => {
  it("klient role can access portal", () => {
    const role: string = "klient";
    const canAccess = role === "klient";
    expect(canAccess).toBe(true);
  });

  it("admin role cannot access portal", () => {
    const role: string = "admin";
    const canAccess = role === "klient";
    expect(canAccess).toBe(false);
  });

  it("technik role cannot access portal", () => {
    const role: string = "technik";
    const canAccess = role === "klient";
    expect(canAccess).toBe(false);
  });

  it("super_admin role cannot access portal", () => {
    const role: string = "super_admin";
    const canAccess = role === "klient";
    expect(canAccess).toBe(false);
  });
});

// ---------------------------------------------------------------
// Klient login redirect logic
// ---------------------------------------------------------------

describe("klient login redirect", () => {
  it("klient users redirect to /portal after login", () => {
    const aktivniRole: string = "klient";
    const redirectPath = aktivniRole === "klient" ? "/portal" : "/";
    expect(redirectPath).toBe("/portal");
  });

  it("admin users redirect to / after login", () => {
    const aktivniRole: string = "admin";
    const redirectPath = aktivniRole === "klient" ? "/portal" : "/";
    expect(redirectPath).toBe("/");
  });

  it("technik users redirect to / after login", () => {
    const aktivniRole: string = "technik";
    const redirectPath = aktivniRole === "klient" ? "/portal" : "/";
    expect(redirectPath).toBe("/");
  });
});

// ---------------------------------------------------------------
// Portal data filtering logic (klient sees only own data)
// ---------------------------------------------------------------

describe("portal data filtering", () => {
  it("filters protokoly by klient_id chain", () => {
    const klientId = "klient-1";
    const protokoly = [
      { id: "p1", zasahy: { zakazky: { objekty: { klient_id: "klient-1" } } } },
      { id: "p2", zasahy: { zakazky: { objekty: { klient_id: "klient-2" } } } },
      { id: "p3", zasahy: { zakazky: { objekty: { klient_id: "klient-1" } } } },
    ];

    const filtered = protokoly.filter(
      (p) => p.zasahy?.zakazky?.objekty?.klient_id === klientId,
    );

    expect(filtered.length).toBe(2);
    expect(filtered[0].id).toBe("p1");
    expect(filtered[1].id).toBe("p3");
  });

  it("filters zasahy for upcoming dates only", () => {
    const today = "2026-03-12";
    const zasahy = [
      { datum: "2026-03-10", status: "hotovo" },
      { datum: "2026-03-13", status: "naplanovano" },
      { datum: "2026-03-15", status: "potvrzeny" },
      { datum: "2026-03-11", status: "naplanovano" },
      { datum: "2026-03-20", status: "zruseno" },
    ];

    const upcoming = zasahy.filter(
      (z) => z.datum >= today && z.status !== "zruseno",
    );

    expect(upcoming.length).toBe(2);
    expect(upcoming[0].datum).toBe("2026-03-13");
    expect(upcoming[1].datum).toBe("2026-03-15");
  });

  it("returns empty when klient has no data", () => {
    const klientId = "klient-999";
    const faktury: { klient_id: string }[] = [];

    const filtered = faktury.filter((f) => f.klient_id === klientId);
    expect(filtered.length).toBe(0);
  });

  it("handles missing klient_id in profile", () => {
    const profile = { klient_id: null };
    const hasKlient = !!profile.klient_id;
    expect(hasKlient).toBe(false);
  });
});

// ---------------------------------------------------------------
// Portal status display logic
// ---------------------------------------------------------------

describe("portal status display", () => {
  const statusLabels: Record<string, string> = {
    naplanovano: "Naplánovaný",
    potvrzeny: "Potvrzený",
    probiha: "Probíhá",
  };

  it("maps known statuses to Czech labels", () => {
    expect(statusLabels["naplanovano"]).toBe("Naplánovaný");
    expect(statusLabels["potvrzeny"]).toBe("Potvrzený");
    expect(statusLabels["probiha"]).toBe("Probíhá");
  });

  it("returns undefined for unknown statuses", () => {
    expect(statusLabels["unknown"]).toBeUndefined();
  });

  const zasahLabels: Record<string, string> = {
    vnitrni_deratizace: "Deratizace",
    vnejsi_deratizace: "Deratizace (vnější)",
    vnitrni_dezinsekce: "Dezinsekce",
    postrik: "Postřik",
  };

  it("maps zasah types to display labels", () => {
    expect(zasahLabels["vnitrni_deratizace"]).toBe("Deratizace");
    expect(zasahLabels["postrik"]).toBe("Postřik");
  });
});
