interface ZasahPredEmailProps {
  klientName: string;
  objektNazev: string;
  objektAdresa: string;
  datumZasahu: string;
  casOd: string;
  skudci: string[];
  typyZasahu: string[];
  pouceniTexty: { nazev: string; obsah: string }[];
  bezpecnostniListy: string[];
}

/**
 * Branded HTML email šablona pro odeslání BL + poučení před zásahem.
 * Posílá se klientovi při potvrzení/naplánování zásahu v kalendáři.
 */
export function renderZasahPredEmailHtml({
  klientName,
  objektNazev,
  objektAdresa,
  datumZasahu,
  casOd,
  skudci,
  typyZasahu,
  pouceniTexty,
  bezpecnostniListy,
}: ZasahPredEmailProps): string {
  const pouceniSection =
    pouceniTexty.length > 0
      ? pouceniTexty
          .map(
            (p) => `
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 6px; border: 1px solid #fde68a;">
          <tr>
            <td style="padding: 16px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; font-weight: 600;">
                ${escapeHtml(p.nazev)}
              </p>
              <div style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.6; white-space: pre-line;">
                ${escapeHtml(p.obsah)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`,
          )
          .join("")
      : "";

  const blSection =
    bezpecnostniListy.length > 0
      ? `
    <tr>
      <td style="padding: 0 24px 16px 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151; font-weight: 600;">
          Bezpecnostni listy v priloze:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #6b7280;">
          ${bezpecnostniListy.map((bl) => `<li style="margin-bottom: 4px;">${escapeHtml(bl)}</li>`).join("")}
        </ul>
      </td>
    </tr>`
      : "";

  const skudciText = skudci.length > 0 ? skudci.join(", ") : "Dle objednavky";
  const typyText = typyZasahu.length > 0 ? typyZasahu.join(", ") : "";

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Informace pred zasahem - Deraplus</title>
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
                dovolujeme si Vas informovat o planovane navsteve naseho technika.
                Nize naleznete dulezite informace a pouceni k zasahu.
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
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Datum zasahu</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px; color: #16a34a; font-weight: 700;">${escapeHtml(datumZasahu)}${casOd ? ` od ${escapeHtml(casOd)}` : ""}</p>
                    ${typyText ? `
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Typ zasahu</p>
                    <p style="margin: 0 0 12px 0; font-size: 15px; color: #111827;">${escapeHtml(typyText)}</p>
                    ` : ""}
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">Cilovy skudce</p>
                    <p style="margin: 0; font-size: 15px; color: #111827;">${escapeHtml(skudciText)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pouceni sections -->
          ${pouceniSection}

          <!-- BL section -->
          ${blSection}

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
