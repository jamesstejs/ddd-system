import type { AppRole } from "@/lib/auth";

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  technik: "Technik",
  klient: "Klient",
};

export const ROLE_ROUTES: Record<string, AppRole[]> = {
  "/klienti": ["admin", "super_admin"],
  "/zakazky": ["admin", "super_admin", "technik"],
  "/kalendar": ["admin", "super_admin", "technik"],
  "/uzivatele": ["admin", "super_admin"],
  "/nastaveni": ["super_admin"],
};

export const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/klienti": "Klienti",
  "/zakazky": "Zakázky",
  "/kalendar": "Kalendář",
  "/vice": "Více",
  "/uzivatele": "Uživatelé",
  "/nastaveni": "Nastavení",
};
