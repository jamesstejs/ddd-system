import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Anthropic SDK
const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor(_opts: { apiKey: string }) {}
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset module cache so getClient() creates fresh instance
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = "test-key-123";
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

describe("callAnthropic", () => {
  it("calls Anthropic API with correct parameters", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Odpověď modelu" }],
    });

    const { callAnthropic } = await import("../client");
    const result = await callAnthropic("system prompt", "user prompt");

    expect(result).toBe("Odpověď modelu");
    expect(mockCreate).toHaveBeenCalledWith({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: 0.3,
      system: "system prompt",
      messages: [{ role: "user", content: "user prompt" }],
    });
  });

  it("uses custom temperature when provided", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "ok" }],
    });

    const { callAnthropic } = await import("../client");
    await callAnthropic("sys", "usr", 0.7);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.7 }),
    );
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const { callAnthropic } = await import("../client");
    await expect(callAnthropic("sys", "usr")).rejects.toThrow(
      "ANTHROPIC_API_KEY is not set",
    );
  });

  it("throws when response has no text block", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
    });

    const { callAnthropic } = await import("../client");
    await expect(callAnthropic("sys", "usr")).rejects.toThrow(
      "AI: žádný textový blok v odpovědi",
    );
  });

  it("throws when response content is empty", async () => {
    mockCreate.mockResolvedValueOnce({ content: [] });

    const { callAnthropic } = await import("../client");
    await expect(callAnthropic("sys", "usr")).rejects.toThrow(
      "AI: žádný textový blok v odpovědi",
    );
  });

  it("propagates API errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("rate_limit_exceeded"));

    const { callAnthropic } = await import("../client");
    await expect(callAnthropic("sys", "usr")).rejects.toThrow(
      "rate_limit_exceeded",
    );
  });
});
