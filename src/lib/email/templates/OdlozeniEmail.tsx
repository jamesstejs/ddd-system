interface OdlozeniEmailProps {
  klientName: string;
  objektNazev: string;
  objektAdresa: string;
  puvodniDatum: string;
  novyDatum: string;
  duvod: string | null;
  iniciator: "admin" | "klient";
}

/**
 * Branded HTML email sablona pro informovani klienta o posunuti terminu zasahu.
 * Posila se po posunuti terminu adminem nebo klientem.
 */
export function renderOdlozeniEmailHtml({
  klientName,
  objektNazev,
  objektAdresa,
  puvodniDatum,
  novyDatum,
  duvod,
  iniciator,
}: OdlozeniEmailProps): string {
  const introText =
    iniciator === "klient"
      ? "Na Vasi zadost byl termin zasahu posunut."
      : "Dovolujeme si Vas informovat o zmene terminu planovaneho zasahu.";

  const duvodSection = duvod
    ? `
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 6px; border: 1px solid #fde68a;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #92400e; font-weight: 600;">
                Duvod posunuti
              </p>
              <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">
                ${escapeHtml(duvod)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zmena terminu zasahu - Deraplus</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #16a34a; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                DERAPLUS
              </h1>
              <p style="margin: 4px 0 0 0; color: #bbf7d0; font-size: 13px;">
                Dezinfekce | Dezinsekce | Deratizace
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.5;">
                Dobry den,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #374151; line-height: 1.5;">
                ${escapeHtml(introText)}
              </p>
            </td>
          </tr>

          <!-- Info box -->
          <tr>
            <td style="padding: 0 24px 16px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Klient</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px; color: #111827; font-weight: 600;">${escapeHtml(klientName)}</p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Objekt</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px; color: #111827; font-weight: 600;">${escapeHtml(objektNazev)}</p>
                    ${objektAdresa ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">${escapeHtml(objektAdresa)}</p>` : ""}
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Puvodni termin</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px; color: #dc2626; font-weight: 600; text-decoration: line-through;">${escapeHtml(puvodniDatum)}</p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Novy termin</p>
                    <p style="margin: 0; font-size: 18px; color: #16a34a; font-weight: 700;">${escapeHtml(novyDatum)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Duvod section -->
          ${duvodSection}

          <!-- Divider -->
          <tr>
            <td style="padding: 8px 24px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px 24px 24px; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #9ca3af;">
                AHELP Group, s.r.o. | ICO: 01483056 | DIC: CZ01483056
              </p>
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #9ca3af;">
                Dvorakova 475, 252 64 Velke Prilepy
              </p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #16a34a; font-weight: 600;">
                Tel: 800 130 303 | www.deraplus.cz | info@deraplus.cz
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                Tento email byl vygenerovan automaticky systemem Deraplus.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
