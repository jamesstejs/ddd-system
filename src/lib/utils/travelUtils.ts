/**
 * Pure utility functions pro odhad přejezdů — vzdálenost + čas.
 * Žádné DB volání, žádné API calls.
 */

/**
 * Haversine formula — vzdušná vzdálenost (km) mezi dvěma body.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Poloměr Země v km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Koeficient pro převod vzdušné vzdálenosti na silniční vzdálenost.
 * Běžně 1.3–1.5 (závisí na regionu, město vs venkov).
 * Pro Česko (mix město/venkov) použijeme 1.4.
 */
export const ROAD_COEFFICIENT = 1.4;

/**
 * Odhadne silniční vzdálenost (km) z vzdušné vzdálenosti.
 */
export function estimateRoadDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return haversineDistanceKm(lat1, lng1, lat2, lng2) * ROAD_COEFFICIENT;
}

/**
 * Průměrná rychlost (km/h) pro odhad přejezdu.
 * - Ve městě: ~30 km/h
 * - Meziměsto: ~60 km/h
 * Pragmatic approach: pro krátké vzdálenosti (město) 30 km/h,
 * pro delší vzdálenosti stoupá až na 60 km/h.
 */
export function getAverageSpeedKmh(roadDistanceKm: number): number {
  if (roadDistanceKm <= 5) return 30; // Město
  if (roadDistanceKm <= 15) return 40; // Příměstské
  if (roadDistanceKm <= 50) return 50; // Meziměstské
  return 60; // Dálnice / mimo město
}

/**
 * Odhadne čas přejezdu v minutách mezi dvěma body (lat/lng).
 * Vrací zaokrouhleno na celé minuty nahoru, minimum 5 min.
 *
 * Pokud body nemají souřadnice (null), vrací null.
 */
export function estimateTravelTimeMinutes(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined,
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null;
  }

  const roadKm = estimateRoadDistanceKm(lat1, lng1, lat2, lng2);

  // Příliš blízko (< 0.2 km) = pravděpodobně stejný objekt
  if (roadKm < 0.2) return 0;

  const speedKmh = getAverageSpeedKmh(roadKm);
  const minutes = (roadKm / speedKmh) * 60;

  // Minimum 5 minut (parkování, přesun), zaokrouhlení nahoru
  return Math.max(5, Math.ceil(minutes));
}

/**
 * Formátuje čas přejezdu v minutách na český text.
 * "~15 min" / "~1h 10 min"
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `~${hours}h`;
  return `~${hours}h ${mins} min`;
}

/**
 * Odhadne vzdálenost + čas přejezdu v km (silniční).
 * Pokud body nemají souřadnice, vrací null.
 */
export function estimateTravelInfo(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined,
): { distanceKm: number; travelMinutes: number } | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return null;
  }

  const roadKm = estimateRoadDistanceKm(lat1, lng1, lat2, lng2);

  // Příliš blízko
  if (roadKm < 0.2) return { distanceKm: 0, travelMinutes: 0 };

  const speedKmh = getAverageSpeedKmh(roadKm);
  const minutes = (roadKm / speedKmh) * 60;

  return {
    distanceKm: Math.round(roadKm * 10) / 10,
    travelMinutes: Math.max(5, Math.ceil(minutes)),
  };
}

/**
 * Typ pro přejezd mezi dvěma zásahy.
 */
export type TravelEstimate = {
  fromZasahId: string;
  toZasahId: string;
  distanceKm: number | null;
  travelMinutes: number | null;
  hasCollision: boolean; // true pokud zásah + přejezd nestíhá
};

/**
 * Zjistí, jestli je mezi dvěma po sobě jdoucími zásahy kolize.
 * Kolize = konec předchozího zásahu (cas_do) + přejezd > začátek dalšího (cas_od).
 */
export function detectCollision(
  prevCasDo: string, // "HH:MM" or "HH:MM:SS"
  nextCasOd: string, // "HH:MM" or "HH:MM:SS"
  travelMinutes: number,
): boolean {
  const prevEnd = parseTimeToMinutes(prevCasDo);
  const nextStart = parseTimeToMinutes(nextCasOd);
  if (prevEnd === null || nextStart === null) return false;

  return prevEnd + travelMinutes > nextStart;
}

/**
 * Parsuje čas "HH:MM" nebo "HH:MM:SS" na počet minut od půlnoci.
 */
export function parseTimeToMinutes(time: string): number | null {
  const parts = time.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Vypočítá přejezdy (travel estimates) pro seznam zásahů seřazených chronologicky.
 * Vrací pole TravelEstimate pro každý pár po sobě jdoucích zásahů.
 *
 * Parametr getCoords: funkce která pro zasah ID vrátí { lat, lng } nebo null.
 * Parametr getCasDo/getCasOd: funkce pro časy.
 */
export function computeTravelEstimates<T>(
  zasahy: T[],
  getId: (z: T) => string,
  getCoords: (z: T) => { lat: number | null; lng: number | null },
  getCasDo: (z: T) => string,
  getCasOd: (z: T) => string,
): TravelEstimate[] {
  const estimates: TravelEstimate[] = [];

  for (let i = 0; i < zasahy.length - 1; i++) {
    const prev = zasahy[i];
    const next = zasahy[i + 1];

    const prevCoords = getCoords(prev);
    const nextCoords = getCoords(next);

    const info = estimateTravelInfo(
      prevCoords.lat,
      prevCoords.lng,
      nextCoords.lat,
      nextCoords.lng,
    );

    const travelMinutes = info?.travelMinutes ?? null;
    const hasCollision =
      travelMinutes !== null
        ? detectCollision(getCasDo(prev), getCasOd(next), travelMinutes)
        : false;

    estimates.push({
      fromZasahId: getId(prev),
      toZasahId: getId(next),
      distanceKm: info?.distanceKm ?? null,
      travelMinutes,
      hasCollision,
    });
  }

  return estimates;
}
