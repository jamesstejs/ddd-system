/**
 * Geocoding via OpenStreetMap Nominatim (free, no API key).
 * Rate limit: 1 request/second — caller must respect this.
 * Used server-side only.
 *
 * @see https://nominatim.org/release-docs/develop/api/Search/
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Geocoduje českou adresu přes Nominatim.
 * Vrací null pokud adresa nebyla nalezena.
 *
 * DŮLEŽITÉ: Volat max 1× za sekundu (Nominatim rate limit).
 */
export async function geocodeAddress(
  adresa: string,
): Promise<GeocodingResult | null> {
  if (!adresa.trim()) return null;

  const params = new URLSearchParams({
    q: adresa,
    format: "json",
    limit: "1",
    countrycodes: "cz",
    addressdetails: "0",
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "DDD-System-Deraplus/1.0 (info@deraplus.cz)",
          Accept: "application/json",
        },
        // Next.js: cache for 30 days (addresses don't move)
        next: { revalidate: 2592000 },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) return null;

    return {
      lat,
      lng,
      displayName: result.display_name || adresa,
    };
  } catch {
    return null;
  }
}

/**
 * Batch geocoding s respektem k rate limitu (1 req/s).
 * Pro N adres trvá ~N sekund.
 */
export async function batchGeocodeAddresses(
  addresses: { id: string; adresa: string }[],
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>();

  for (let i = 0; i < addresses.length; i++) {
    const { id, adresa } = addresses[i];
    const result = await geocodeAddress(adresa);
    if (result) {
      results.set(id, result);
    }

    onProgress?.(i + 1, addresses.length);

    // Rate limit: wait 1.1s between requests (Nominatim requires 1s)
    if (i < addresses.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return results;
}
