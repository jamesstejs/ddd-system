import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
 * Vrací Resend ID při úspěchu nebo vyhodí chybu.
 */
export async function sendProtokolEmail({
  to,
  subject,
  html,
  attachments,
}: SendProtokolEmailParams): Promise<string> {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend: žádné ID v odpovědi");
  }

  return data.id;
}
