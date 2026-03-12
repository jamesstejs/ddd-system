import { describe, it, expect } from "vitest";
import { buildSpdString, extractDigits, getCompanyIban } from "../qrPayment";

describe("buildSpdString", () => {
  it("builds correct SPD string with all fields", () => {
    const result = buildSpdString({
      iban: "CZ6508000000192000145399",
      amount: 2500,
      vs: "2024001",
      message: "Proforma 2024001",
    });

    expect(result).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:2500.00*CC:CZK*X-VS:2024001*MSG:Proforma 2024001",
    );
  });

  it("defaults currency to CZK", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
    });

    expect(result).toContain("CC:CZK");
  });

  it("supports custom currency", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 50,
      currency: "EUR",
    });

    expect(result).toContain("CC:EUR");
  });

  it("formats amount with 2 decimal places", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 1234.5,
    });

    expect(result).toContain("AM:1234.50");
  });

  it("omits VS when empty", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
    });

    expect(result).not.toContain("X-VS:");
  });

  it("omits MSG when empty", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
    });

    expect(result).not.toContain("MSG:");
  });

  it("extracts only digits from VS", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
      vs: "FA-2024-001",
    });

    expect(result).toContain("X-VS:2024001");
  });

  it("strips spaces from IBAN", () => {
    const result = buildSpdString({
      iban: "CZ65 0800 0000 1920 0014 5399",
      amount: 100,
    });

    expect(result).toContain("ACC:CZ6508000000192000145399");
  });

  it("removes asterisks from message (SPD separator)", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
      message: "Test*message*here",
    });

    expect(result).toContain("MSG:Testmessagehere");
  });

  it("truncates VS to 10 digits", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
      vs: "12345678901234",
    });

    expect(result).toContain("X-VS:1234567890");
  });

  it("truncates message to 60 chars", () => {
    const longMessage = "A".repeat(100);
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 100,
      message: longMessage,
    });

    // MSG value should be 60 chars
    const msgPart = result.split("*").find((p) => p.startsWith("MSG:"));
    expect(msgPart).toBe(`MSG:${"A".repeat(60)}`);
  });

  it("handles zero amount", () => {
    const result = buildSpdString({
      iban: "CZ1234567890",
      amount: 0,
    });

    expect(result).toContain("AM:0.00");
  });
});

describe("extractDigits", () => {
  it("extracts digits from string", () => {
    expect(extractDigits("FA-2024-001")).toBe("2024001");
  });

  it("returns empty for no digits", () => {
    expect(extractDigits("abc")).toBe("");
  });

  it("handles pure number string", () => {
    expect(extractDigits("123456")).toBe("123456");
  });

  it("handles empty string", () => {
    expect(extractDigits("")).toBe("");
  });
});

describe("getCompanyIban", () => {
  it("returns a string", () => {
    const iban = getCompanyIban();
    expect(typeof iban).toBe("string");
    expect(iban.length).toBeGreaterThan(0);
  });
});
