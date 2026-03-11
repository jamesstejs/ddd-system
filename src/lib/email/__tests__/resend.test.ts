import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Resend before importing module — vi.hoisted runs before vi.mock factory
const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
  },
}));

import { sendProtokolEmail } from "../resend";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendProtokolEmail", () => {
  it("sends email and returns resend ID on success", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_123" },
      error: null,
    });

    const result = await sendProtokolEmail({
      to: "klient@example.com",
      subject: "Protokol P-TST-001",
      html: "<p>Test</p>",
      attachments: [
        { filename: "test.pdf", content: Buffer.from("pdf-content") },
      ],
    });

    expect(result).toBe("resend_123");
    expect(mockSend).toHaveBeenCalledWith({
      from: "Deraplus <info@deraplus.cz>",
      to: "klient@example.com",
      subject: "Protokol P-TST-001",
      html: "<p>Test</p>",
      attachments: [
        { filename: "test.pdf", content: Buffer.from("pdf-content") },
      ],
    });
  });

  it("throws on Resend API error", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid API key" },
    });

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("Resend error: Invalid API key");
  });

  it("throws when no ID returned", async () => {
    mockSend.mockResolvedValueOnce({
      data: {},
      error: null,
    });

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("Resend: žádné ID v odpovědi");
  });

  it("sends multiple attachments", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_456" },
      error: null,
    });

    const attachments = [
      { filename: "protokol.pdf", content: Buffer.from("pdf") },
      { filename: "bl1.pdf", content: Buffer.from("bl1") },
      { filename: "bl2.pdf", content: Buffer.from("bl2") },
    ];

    await sendProtokolEmail({
      to: "test@example.com",
      subject: "Multi",
      html: "<p>Multi</p>",
      attachments,
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: expect.arrayContaining([
          expect.objectContaining({ filename: "protokol.pdf" }),
          expect.objectContaining({ filename: "bl1.pdf" }),
          expect.objectContaining({ filename: "bl2.pdf" }),
        ]),
      }),
    );
  });

  it("uses correct sender address", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "id1" },
      error: null,
    });

    await sendProtokolEmail({
      to: "x@x.com",
      subject: "s",
      html: "h",
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Deraplus <info@deraplus.cz>",
      }),
    );
  });
});
