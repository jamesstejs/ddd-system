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
  // Set env so getResend() doesn't throw before reaching the mocked Resend class
  process.env.RESEND_API_KEY = "re_test_key";
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

  // ==========================================================
  // Empty attachment array
  // ==========================================================

  it("sends email with empty attachment array", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_empty_att" },
      error: null,
    });

    const result = await sendProtokolEmail({
      to: "klient@example.com",
      subject: "Test",
      html: "<p>No attachments</p>",
      attachments: [],
    });

    expect(result).toBe("resend_empty_att");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [],
      }),
    );
  });

  // ==========================================================
  // Very large attachment (Buffer handling)
  // ==========================================================

  it("accepts large Buffer attachment (1MB+)", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_large" },
      error: null,
    });

    const largeBuf = Buffer.alloc(1024 * 1024, 0x41); // 1MB of 'A'
    const result = await sendProtokolEmail({
      to: "klient@example.com",
      subject: "Large file",
      html: "<p>Large</p>",
      attachments: [{ filename: "big.pdf", content: largeBuf }],
    });

    expect(result).toBe("resend_large");
    const calledAttachments = mockSend.mock.calls[0][0].attachments;
    expect(calledAttachments[0].content).toBe(largeBuf);
    expect(calledAttachments[0].content.length).toBe(1024 * 1024);
  });

  it("passes Buffer instance directly to Resend", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_buf" },
      error: null,
    });

    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF magic bytes
    await sendProtokolEmail({
      to: "test@example.com",
      subject: "PDF",
      html: "<p>PDF</p>",
      attachments: [{ filename: "doc.pdf", content: buf }],
    });

    const sentAttachment = mockSend.mock.calls[0][0].attachments[0];
    expect(Buffer.isBuffer(sentAttachment.content)).toBe(true);
    expect(sentAttachment.content[0]).toBe(0x25);
  });

  // ==========================================================
  // Special characters in subject line
  // ==========================================================

  it("sends email with special characters in subject", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_special" },
      error: null,
    });

    const subject = 'Protokol P-ŽŘČ-001 — Deraplus "test" & <taggy>';
    await sendProtokolEmail({
      to: "klient@example.com",
      subject,
      html: "<p>Test</p>",
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    );
  });

  it("sends email with Czech diacritics in subject", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_czech" },
      error: null,
    });

    const subject = "Protokol č. P-ABC-001 — ěščřžýáíéúůďťňó";
    await sendProtokolEmail({
      to: "test@example.com",
      subject,
      html: "<p>Czech</p>",
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    );
  });

  it("sends email with em dash in subject", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_dash" },
      error: null,
    });

    const subject = "Protokol P-001 \u2014 Deraplus";
    await sendProtokolEmail({
      to: "test@example.com",
      subject,
      html: "<p>Dash</p>",
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    );
  });

  // ==========================================================
  // Unicode in recipient email
  // ==========================================================

  it("sends email to address with unicode domain (IDN)", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_unicode" },
      error: null,
    });

    const to = "user@p\u0159\u00EDklad.cz";
    await sendProtokolEmail({
      to,
      subject: "Test",
      html: "<p>Unicode</p>",
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to }),
    );
  });

  it("sends email to address with plus addressing", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: "resend_plus" },
      error: null,
    });

    const to = "klient+protokol@example.com";
    await sendProtokolEmail({
      to,
      subject: "Plus",
      html: "<p>Plus</p>",
      attachments: [],
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to }),
    );
  });

  // ==========================================================
  // Error message variations
  // ==========================================================

  it("includes Resend error message in thrown error", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: "Rate limit exceeded" },
    });

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("Resend error: Rate limit exceeded");
  });

  it("throws specific message when data exists but id is null", async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: null },
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

  it("throws specific message when data is null (no error either)", async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    // data is null, error is null → data?.id is undefined → throws
    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("Resend: žádné ID v odpovědi");
  });
});
