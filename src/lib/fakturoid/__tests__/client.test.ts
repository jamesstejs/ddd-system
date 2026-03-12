import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fakturoid/client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.FAKTUROID_CLIENT_ID = "test-client-id";
    process.env.FAKTUROID_CLIENT_SECRET = "test-client-secret";
    process.env.FAKTUROID_SLUG = "testslug";
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("gets OAuth token and makes authenticated request", async () => {
    // Token response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "tok123",
        token_type: "Bearer",
        expires_in: 7200,
      }),
    });

    // API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, name: "Test" }),
    });

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    const result = await fakturoidFetch("/subjects.json");

    // First call: token
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const tokenCall = mockFetch.mock.calls[0];
    expect(tokenCall[0]).toBe(
      "https://app.fakturoid.cz/api/v3/oauth/token",
    );
    expect(tokenCall[1].method).toBe("POST");
    expect(tokenCall[1].headers.Authorization).toContain("Basic ");

    // Second call: API
    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toBe(
      "https://app.fakturoid.cz/api/v3/accounts/testslug/subjects.json",
    );
    expect(apiCall[1].headers.Authorization).toBe("Bearer tok123");

    expect(result).toEqual({ id: 1, name: "Test" });
  });

  it("throws on missing credentials", async () => {
    delete process.env.FAKTUROID_CLIENT_ID;

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    await expect(fakturoidFetch("/test")).rejects.toThrow(
      /chybí FAKTUROID_CLIENT_ID/,
    );
  });

  it("throws on OAuth error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    await expect(fakturoidFetch("/test")).rejects.toThrow(
      /Fakturoid OAuth chyba 401/,
    );
  });

  it("throws on API error", async () => {
    // Token OK
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "tok",
        token_type: "Bearer",
        expires_in: 7200,
      }),
    });
    // API 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    });

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    await expect(fakturoidFetch("/bad")).rejects.toThrow(
      /Fakturoid API GET \/bad — 404/,
    );
  });

  it("handles 204 No Content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "tok",
        token_type: "Bearer",
        expires_in: 7200,
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    const result = await fakturoidFetch("/fire", { method: "POST" });
    expect(result).toBeUndefined();
  });

  it("sends JSON body for POST requests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "tok",
        token_type: "Bearer",
        expires_in: 7200,
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 42 }),
    });

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    await fakturoidFetch("/subjects.json", {
      method: "POST",
      body: { name: "Test" },
    });

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[1].headers["Content-Type"]).toBe("application/json");
    expect(apiCall[1].body).toBe(JSON.stringify({ name: "Test" }));
  });

  it("defaults slug to deratizacelevne", async () => {
    delete process.env.FAKTUROID_SLUG;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "tok",
        token_type: "Bearer",
        expires_in: 7200,
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const { fakturoidFetch, _resetTokenCache } = await import("../client");
    _resetTokenCache();

    await fakturoidFetch("/test.json");

    const apiCall = mockFetch.mock.calls[1];
    expect(apiCall[0]).toContain("/accounts/deratizacelevne/");
  });
});
