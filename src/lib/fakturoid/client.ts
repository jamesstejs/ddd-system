/**
 * Fakturoid API v3 client — OAuth 2 Client Credentials
 *
 * Token endpoint: POST https://app.fakturoid.cz/api/v3/oauth/token
 * Base URL: https://app.fakturoid.cz/api/v3/accounts/{slug}
 * Token expires after 7200s (2h), auto-refreshed.
 */

const BASE_URL = "https://app.fakturoid.cz/api/v3";
const USER_AGENT = "DeraplusDDD (info@deraplus.cz)";

// In-memory token cache
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

function getConfig() {
  const clientId = process.env.FAKTUROID_CLIENT_ID;
  const clientSecret = process.env.FAKTUROID_CLIENT_SECRET;
  const slug = process.env.FAKTUROID_SLUG || "ahelpgroup";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Fakturoid: chybí FAKTUROID_CLIENT_ID nebo FAKTUROID_CLIENT_SECRET",
    );
  }

  return { clientId, clientSecret, slug };
}

/**
 * Get a valid access token, refreshing if expired.
 */
async function getAccessToken(): Promise<string> {
  // Return cached if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { clientId, clientSecret } = getConfig();

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fakturoid OAuth chyba ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken;
}

/**
 * Build the full URL for an account-scoped API path.
 */
function accountUrl(path: string): string {
  const { slug } = getConfig();
  return `${BASE_URL}/accounts/${slug}${path}`;
}

/**
 * Make an authenticated API request to Fakturoid.
 */
export async function fakturoidFetch<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    isAccountScoped?: boolean;
  } = {},
): Promise<T> {
  const { method = "GET", body, isAccountScoped = true } = options;
  const token = await getAccessToken();

  const url = isAccountScoped ? accountUrl(path) : `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content (e.g., fire event)
  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Fakturoid API ${method} ${path} — ${res.status}: ${text}`);
  }

  return (await res.json()) as T;
}

/**
 * Reset cached token (for testing).
 */
export function _resetTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}
