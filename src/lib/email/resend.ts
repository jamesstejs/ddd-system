import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new Error(
        "SMTP credentials nejsou nastaveny. Nastavte SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS v .env.local.",
      );
    }
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return _transporter;
}

const FROM_EMAIL = "Deraplus <info@deraplus.cz>";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendProtokolEmailParams {
  to: string;
  subject: string;
  html: string;
  attachments: EmailAttachment[];
}

/**
 * Odešle email s protokolem a přílohami (PDF + BL).
 * Vrací SMTP messageId při úspěchu nebo vyhodí chybu.
 */
export async function sendProtokolEmail({
  to,
  subject,
  html,
  attachments,
}: SendProtokolEmailParams): Promise<string> {
  const info = await getTransporter().sendMail({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (!info.messageId) {
    throw new Error("SMTP: žádné messageId v odpovědi");
  }

  return info.messageId;
}
