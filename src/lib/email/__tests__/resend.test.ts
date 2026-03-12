import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer before importing module — vi.hoisted runs before vi.mock factory
const { mockSendMail } = vi.hoisted(() => {
  const mockSendMail = vi.fn();
  return { mockSendMail };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
}));

import { sendProtokolEmail } from "../resend";

beforeEach(() => {
  vi.clearAllMocks();
  // Set env so getTransporter() doesn't throw before reaching the mocked transporter
  process.env.SMTP_HOST = "wes1-smtp.wedos.net";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_USER = "info@deraplus.cz";
  process.env.SMTP_PASS = "test_password";
});

describe("sendProtokolEmail", () => {
  it("sends email and returns messageId on success", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<test-123@wes1-smtp.wedos.net>",
    });

    const result = await sendProtokolEmail({
      to: "klient@example.com",
      subject: "Protokol P-TST-001",
      html: "<p>Test</p>",
      attachments: [
        { filename: "test.pdf", content: Buffer.from("pdf-content") },
      ],
    });

    expect(result).toBe("<test-123@wes1-smtp.wedos.net>");
    expect(mockSendMail).toHaveBeenCalledWith({
      from: "Deraplus <info@deraplus.cz>",
      to: "klient@example.com",
      subject: "Protokol P-TST-001",
      html: "<p>Test</p>",
      attachments: [
        { filename: "test.pdf", content: Buffer.from("pdf-content") },
      ],
    });
  });

  it("throws on SMTP transport error", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("Connection refused");
  });

  it("throws when no messageId returned", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "",
    });

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("SMTP: žádné messageId v odpovědi");
  });

  it("sends multiple attachments", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<test-456@wes1-smtp.wedos.net>",
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

    expect(mockSendMail).toHaveBeenCalledWith(
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
    mockSendMail.mockResolvedValueOnce({
      messageId: "<id1@wes1-smtp.wedos.net>",
    });

    await sendProtokolEmail({
      to: "x@x.com",
      subject: "s",
      html: "h",
      attachments: [],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Deraplus <info@deraplus.cz>",
      }),
    );
  });

  // ==========================================================
  // Empty attachment array
  // ==========================================================

  it("sends email with empty attachment array", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<empty-att@wes1-smtp.wedos.net>",
    });

    const result = await sendProtokolEmail({
      to: "klient@example.com",
      subject: "Test",
      html: "<p>No attachments</p>",
      attachments: [],
    });

    expect(result).toBe("<empty-att@wes1-smtp.wedos.net>");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [],
      }),
    );
  });

  // ==========================================================
  // Very large attachment (Buffer handling)
  // ==========================================================

  it("accepts large Buffer attachment (1MB+)", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<large@wes1-smtp.wedos.net>",
    });

    const largeBuf = Buffer.alloc(1024 * 1024, 0x41); // 1MB of 'A'
    const result = await sendProtokolEmail({
      to: "klient@example.com",
      subject: "Large file",
      html: "<p>Large</p>",
      attachments: [{ filename: "big.pdf", content: largeBuf }],
    });

    expect(result).toBe("<large@wes1-smtp.wedos.net>");
    const calledAttachments = mockSendMail.mock.calls[0][0].attachments;
    expect(calledAttachments[0].content).toBe(largeBuf);
    expect(calledAttachments[0].content.length).toBe(1024 * 1024);
  });

  it("passes Buffer instance directly to Nodemailer", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<buf@wes1-smtp.wedos.net>",
    });

    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF magic bytes
    await sendProtokolEmail({
      to: "test@example.com",
      subject: "PDF",
      html: "<p>PDF</p>",
      attachments: [{ filename: "doc.pdf", content: buf }],
    });

    const sentAttachment = mockSendMail.mock.calls[0][0].attachments[0];
    expect(Buffer.isBuffer(sentAttachment.content)).toBe(true);
    expect(sentAttachment.content[0]).toBe(0x25);
  });

  // ==========================================================
  // Special characters in subject line
  // ==========================================================

  it("sends email with special characters in subject", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<special@wes1-smtp.wedos.net>",
    });

    const subject = 'Protokol P-ŽŘČ-001 — Deraplus "test" & <taggy>';
    await sendProtokolEmail({
      to: "klient@example.com",
      subject,
      html: "<p>Test</p>",
      attachments: [],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    );
  });

  it("sends email with Czech diacritics in subject", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<czech@wes1-smtp.wedos.net>",
    });

    const subject = "Protokol č. P-ABC-001 — ěščřžýáíéúůďťňó";
    await sendProtokolEmail({
      to: "test@example.com",
      subject,
      html: "<p>Czech</p>",
      attachments: [],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    );
  });

  it("sends email with em dash in subject", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<dash@wes1-smtp.wedos.net>",
    });

    const subject = "Protokol P-001 \u2014 Deraplus";
    await sendProtokolEmail({
      to: "test@example.com",
      subject,
      html: "<p>Dash</p>",
      attachments: [],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject }),
    );
  });

  // ==========================================================
  // Unicode in recipient email
  // ==========================================================

  it("sends email to address with unicode domain (IDN)", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<unicode@wes1-smtp.wedos.net>",
    });

    const to = "user@p\u0159\u00EDklad.cz";
    await sendProtokolEmail({
      to,
      subject: "Test",
      html: "<p>Unicode</p>",
      attachments: [],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to }),
    );
  });

  it("sends email to address with plus addressing", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: "<plus@wes1-smtp.wedos.net>",
    });

    const to = "klient+protokol@example.com";
    await sendProtokolEmail({
      to,
      subject: "Plus",
      html: "<p>Plus</p>",
      attachments: [],
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to }),
    );
  });

  // ==========================================================
  // Error variations
  // ==========================================================

  it("propagates SMTP authentication error", async () => {
    mockSendMail.mockRejectedValueOnce(
      new Error("Invalid login: 535 Authentication failed"),
    );

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("Invalid login: 535 Authentication failed");
  });

  it("throws when messageId is undefined", async () => {
    mockSendMail.mockResolvedValueOnce({
      messageId: undefined,
    });

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("SMTP: žádné messageId v odpovědi");
  });

  it("throws when response has no messageId property", async () => {
    mockSendMail.mockResolvedValueOnce({});

    await expect(
      sendProtokolEmail({
        to: "klient@example.com",
        subject: "Test",
        html: "<p>Test</p>",
        attachments: [],
      }),
    ).rejects.toThrow("SMTP: žádné messageId v odpovědi");
  });
});
