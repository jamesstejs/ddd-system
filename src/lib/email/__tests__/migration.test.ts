import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Tests that validate the email_log migration SQL file contains
 * all required structural elements per the project DB rules.
 */

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260323000000_create_email_log.sql",
);

let sql: string;

try {
  sql = readFileSync(MIGRATION_PATH, "utf-8");
} catch {
  sql = "";
}

describe("email_log migration SQL", () => {
  it("migration file exists and is readable", () => {
    expect(sql.length).toBeGreaterThan(0);
  });
});

// ============================================================
// ENUM types
// ============================================================

describe("email_log migration — ENUM types", () => {
  it("creates typ_emailu ENUM type", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+typ_emailu\s+AS\s+ENUM/i);
  });

  it("typ_emailu includes 'protokol' value", () => {
    expect(sql).toContain("'protokol'");
  });

  it("typ_emailu includes 'faktura' value", () => {
    expect(sql).toContain("'faktura'");
  });

  it("typ_emailu includes 'terminy' value", () => {
    expect(sql).toContain("'terminy'");
  });

  it("typ_emailu includes 'pripominky' value", () => {
    expect(sql).toContain("'pripominky'");
  });

  it("creates stav_emailu ENUM type", () => {
    expect(sql).toMatch(/CREATE\s+TYPE\s+stav_emailu\s+AS\s+ENUM/i);
  });

  it("stav_emailu includes 'odeslano' value", () => {
    expect(sql).toContain("'odeslano'");
  });

  it("stav_emailu includes 'doruceno' value", () => {
    expect(sql).toContain("'doruceno'");
  });

  it("stav_emailu includes 'chyba' value", () => {
    expect(sql).toContain("'chyba'");
  });

  it("stav_emailu includes 'cekajici' value", () => {
    expect(sql).toContain("'cekajici'");
  });
});

// ============================================================
// CREATE TABLE
// ============================================================

describe("email_log migration — CREATE TABLE", () => {
  it("creates the email_log table", () => {
    expect(sql).toMatch(/CREATE\s+TABLE\s+email_log/i);
  });
});

// ============================================================
// Required columns
// ============================================================

describe("email_log migration — required columns", () => {
  it("has id column with UUID PRIMARY KEY", () => {
    expect(sql).toMatch(/id\s+UUID\s+PRIMARY\s+KEY/i);
  });

  it("has id with gen_random_uuid() default", () => {
    expect(sql).toMatch(/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i);
  });

  it("has protokol_id column", () => {
    expect(sql).toMatch(/protokol_id\s+UUID/i);
  });

  it("has prijemce column as TEXT NOT NULL", () => {
    expect(sql).toMatch(/prijemce\s+TEXT\s+NOT\s+NULL/i);
  });

  it("has predmet column as TEXT NOT NULL", () => {
    expect(sql).toMatch(/predmet\s+TEXT\s+NOT\s+NULL/i);
  });

  it("has typ column with typ_emailu type", () => {
    expect(sql).toMatch(/typ\s+typ_emailu/i);
  });

  it("has typ with default 'protokol'", () => {
    expect(sql).toMatch(/typ\s+typ_emailu\s+NOT\s+NULL\s+DEFAULT\s+'protokol'/i);
  });

  it("has stav column with stav_emailu type", () => {
    expect(sql).toMatch(/stav\s+stav_emailu/i);
  });

  it("has stav with default 'cekajici'", () => {
    expect(sql).toMatch(/stav\s+stav_emailu\s+NOT\s+NULL\s+DEFAULT\s+'cekajici'/i);
  });

  it("has resend_id column as TEXT", () => {
    expect(sql).toMatch(/resend_id\s+TEXT/i);
  });

  it("has chyba_detail column as TEXT", () => {
    expect(sql).toMatch(/chyba_detail\s+TEXT/i);
  });

  it("has odeslano_at column as TIMESTAMPTZ", () => {
    expect(sql).toMatch(/odeslano_at\s+TIMESTAMPTZ/i);
  });

  it("has created_at column as TIMESTAMPTZ NOT NULL DEFAULT now()", () => {
    expect(sql).toMatch(/created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i);
  });

  it("has updated_at column as TIMESTAMPTZ NOT NULL DEFAULT now()", () => {
    expect(sql).toMatch(/updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+now\(\)/i);
  });

  it("has deleted_at column as TIMESTAMPTZ (for soft delete)", () => {
    expect(sql).toMatch(/deleted_at\s+TIMESTAMPTZ/i);
  });
});

// ============================================================
// RLS enabled
// ============================================================

describe("email_log migration — RLS", () => {
  it("enables Row Level Security on email_log", () => {
    expect(sql).toMatch(
      /ALTER\s+TABLE\s+email_log\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
  });
});

// ============================================================
// moddatetime trigger
// ============================================================

describe("email_log migration — moddatetime trigger", () => {
  it("creates set_updated_at trigger on email_log", () => {
    expect(sql).toMatch(
      /CREATE\s+TRIGGER\s+set_updated_at\s+BEFORE\s+UPDATE\s+ON\s+email_log/i,
    );
  });

  it("trigger uses moddatetime function for updated_at", () => {
    expect(sql).toMatch(/EXECUTE\s+FUNCTION\s+moddatetime\(updated_at\)/i);
  });
});

// ============================================================
// Indexes
// ============================================================

describe("email_log migration — indexes", () => {
  it("has index on protokol_id", () => {
    expect(sql).toMatch(/CREATE\s+INDEX.*email_log.*protokol_id/i);
  });

  it("protokol_id index filters deleted_at IS NULL (partial index)", () => {
    expect(sql).toMatch(
      /idx_email_log_protokol_id\s+ON\s+email_log\(protokol_id\)\s+WHERE\s+deleted_at\s+IS\s+NULL/i,
    );
  });

  it("has index on stav", () => {
    expect(sql).toMatch(/CREATE\s+INDEX.*email_log.*stav/i);
  });

  it("stav index filters deleted_at IS NULL (partial index)", () => {
    expect(sql).toMatch(
      /idx_email_log_stav\s+ON\s+email_log\(stav\)\s+WHERE\s+deleted_at\s+IS\s+NULL/i,
    );
  });
});

// ============================================================
// Foreign key reference to protokoly
// ============================================================

describe("email_log migration — foreign keys", () => {
  it("has FK reference from protokol_id to protokoly(id)", () => {
    expect(sql).toMatch(/protokol_id\s+UUID\s+REFERENCES\s+protokoly\(id\)/i);
  });
});

// ============================================================
// Admin policy
// ============================================================

describe("email_log migration — admin policy", () => {
  it("creates admin_full_access policy on email_log", () => {
    expect(sql).toMatch(/CREATE\s+POLICY\s+"admin_full_access"\s+ON\s+email_log/i);
  });

  it("admin policy applies FOR ALL operations", () => {
    expect(sql).toMatch(/FOR\s+ALL/i);
  });

  it("admin policy checks for admin or super_admin role", () => {
    expect(sql).toContain("'admin'");
    expect(sql).toContain("'super_admin'");
  });

  it("admin policy references profiles table for role check", () => {
    expect(sql).toContain("profiles");
    expect(sql).toContain("auth.uid()");
  });
});
