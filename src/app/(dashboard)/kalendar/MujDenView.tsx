"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toDateString } from "@/lib/utils/dateUtils";
import {
  formatDatumCzLong,
  formatCasCz,
} from "@/lib/utils/dostupnostUtils";
import {
  STATUS_ZASAHU_LABELS,
  TECHNIK_STATUS_TRANSITIONS,
  TECHNIK_STATUS_ACTION_LABELS,
  getGoogleMapsUrl,
  formatDelka,
} from "@/lib/utils/zasahUtils";
import {
  computeTravelEstimates,
  formatTravelTime,
  type TravelEstimate,
} from "@/lib/utils/travelUtils";
import {
  getMojeZasahyAction,
  getKontaktniOsobyAction,
  updateZasahStatusTechnikAction,
} from "./technikActions";
import { geocodeMissingObjektyTechnikAction } from "./geocodeActions";
import { DalsiTerminSheet } from "./DalsiTerminSheet";
import { ProformaSheet } from "./ProformaSheet";
import { initProtokolAction } from "../protokoly/[id]/protokolActions";
import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

export type TechnikZasahRow = {
  id: string;
  zakazka_id: string;
  technik_id: string;
  datum: string;
  cas_od: string;
  cas_do: string;
  status: string;
  odhadovana_delka_min: number | null;
  poznamka: string | null;
  zakazky: {
    id: string;
    typ: string;
    status: string;
    typy_zasahu: unknown;
    skudci: unknown;
    cetnost_dny: number | null;
    platba_predem: boolean | null;
    objekty: {
      id: string;
      nazev: string;
      adresa: string;
      plocha_m2: number | null;
      typ_objektu: string;
      klient_id: string;
      lat: number | null;
      lng: number | null;
      klienti: {
        id: string;
        nazev: string;
        jmeno: string;
        prijmeni: string;
        typ: string;
        telefon: string | null;
        email: string | null;
      };
    };
  } | null;
};

export type KontaktniOsobaRow = {
  id: string;
  klient_id: string;
  jmeno: string;
  funkce: string | null;
  telefon: string | null;
  email: string | null;
  je_primarni: boolean;
  poznamka: string | null;
};

interface MujDenViewProps {
  initialZasahy: TechnikZasahRow[];
  initialKontakty: KontaktniOsobaRow[];
  initialDate: string;
}

function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ---------- Component ----------

export function MujDenView({
  initialZasahy,
  initialKontakty,
  initialDate,
}: MujDenViewProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [zasahy, setZasahy] = useState<TechnikZasahRow[]>(initialZasahy);
  const [kontakty, setKontakty] = useState<KontaktniOsobaRow[]>(initialKontakty);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingZasahId, setPendingZasahId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Další termín sheet state
  const [dalsiTerminOpen, setDalsiTerminOpen] = useState(false);
  const [dalsiTerminZasah, setDalsiTerminZasah] = useState<TechnikZasahRow | null>(null);

  // Protokol navigation
  const router = useRouter();
  const [pendingProtokolZasahId, setPendingProtokolZasahId] = useState<string | null>(null);

  // Proforma sheet state
  const [proformaOpen, setProformaOpen] = useState(false);
  const [proformaZasah, setProformaZasah] = useState<TechnikZasahRow | null>(null);

  // Guard against infinite geocoding retries (track already-attempted objekt IDs)
  const geocodedIdsRef = useRef<Set<string>>(new Set());

  // Kontaktní osoby grouped by klient_id
  const kontaktyByKlient = useMemo(() => {
    const map = new Map<string, KontaktniOsobaRow[]>();
    for (const k of kontakty) {
      const existing = map.get(k.klient_id) || [];
      existing.push(k);
      map.set(k.klient_id, existing);
    }
    return map;
  }, [kontakty]);

  // Compute travel estimates between active zasahy
  const activeZasahy = useMemo(
    () => zasahy.filter((z) => z.status !== "zruseno"),
    [zasahy],
  );
  const cancelledZasahy = useMemo(
    () => zasahy.filter((z) => z.status === "zruseno"),
    [zasahy],
  );

  const travelEstimates = useMemo(() => {
    return computeTravelEstimates(
      activeZasahy,
      (z) => z.id,
      (z) => ({
        lat: z.zakazky?.objekty?.lat ?? null,
        lng: z.zakazky?.objekty?.lng ?? null,
      }),
      (z) => z.cas_do,
      (z) => z.cas_od,
    );
  }, [activeZasahy]);

  // Map: toZasahId → TravelEstimate for quick lookup
  const travelByToId = useMemo(() => {
    const map = new Map<string, TravelEstimate>();
    for (const te of travelEstimates) {
      map.set(te.toZasahId, te);
    }
    return map;
  }, [travelEstimates]);

  // Auto-geocode missing objekty when zasahy are loaded
  useEffect(() => {
    const missingIds = activeZasahy
      .filter(
        (z) =>
          z.zakazky?.objekty &&
          (z.zakazky.objekty.lat == null || z.zakazky.objekty.lng == null),
      )
      .map((z) => z.zakazky!.objekty.id);

    // Filter out IDs we've already attempted to geocode (prevents infinite retries)
    const uniqueIds = [...new Set(missingIds)].filter(
      (id) => !geocodedIdsRef.current.has(id),
    );
    if (uniqueIds.length === 0) return;

    // Mark as attempted BEFORE the async call to prevent double-triggers
    for (const id of uniqueIds) {
      geocodedIdsRef.current.add(id);
    }

    let cancelled = false;
    setIsGeocoding(true);

    geocodeMissingObjektyTechnikAction(uniqueIds)
      .then((count) => {
        if (!cancelled && count > 0) {
          // Reload zasahy to get updated lat/lng
          loadData(selectedDate);
        }
      })
      .catch(() => {
        // Geocoding failure is non-critical — ignore silently
      })
      .finally(() => {
        if (!cancelled) setIsGeocoding(false);
      });

    return () => {
      cancelled = true;
    };
    // Only trigger on zasahy change (not selectedDate to avoid infinite loop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zasahy]);

  // Load data for a given date
  const loadData = useCallback(async (datum: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMojeZasahyAction(datum);
      const zasahyTyped = data as TechnikZasahRow[];
      setZasahy(zasahyTyped);

      // Load kontaktni osoby for all klient IDs
      const klientIds = [
        ...new Set(
          zasahyTyped
            .map((z) => z.zakazky?.objekty?.klient_id)
            .filter(Boolean) as string[],
        ),
      ];
      if (klientIds.length > 0) {
        const kontaktyData = await getKontaktniOsobyAction(klientIds);
        setKontakty(kontaktyData as KontaktniOsobaRow[]);
      } else {
        setKontakty([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při načítání");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Navigate to previous/next day
  function goToDay(offset: number) {
    const current = parseDateLocal(selectedDate);
    current.setDate(current.getDate() + offset);
    const newDate = toDateString(current);
    setSelectedDate(newDate);
    geocodedIdsRef.current.clear();
    loadData(newDate);
  }

  function goToToday() {
    const today = toDateString(new Date());
    setSelectedDate(today);
    geocodedIdsRef.current.clear();
    loadData(today);
  }

  // Status change
  async function handleStatusChange(
    zasahId: string,
    newStatus: Database["public"]["Enums"]["status_zasahu"],
  ) {
    setPendingZasahId(zasahId);
    setError(null);
    try {
      // Save reference to the zasah BEFORE status change (for DalsiTerminSheet)
      const completingZasah = zasahy.find((z) => z.id === zasahId) || null;

      await updateZasahStatusTechnikAction(zasahId, newStatus);
      // Reload data
      await loadData(selectedDate);

      // After completing → open "Další termín" sheet
      if (newStatus === "hotovo" && completingZasah) {
        setDalsiTerminZasah(completingZasah);
        setDalsiTerminOpen(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při změně statusu");
    } finally {
      setPendingZasahId(null);
    }
  }

  // Další termín callbacks
  function handleDalsiTerminScheduled() {
    setDalsiTerminOpen(false);
    setDalsiTerminZasah(null);
    loadData(selectedDate);
  }

  function handleDalsiTerminSkipped() {
    setDalsiTerminOpen(false);
    setDalsiTerminZasah(null);
    loadData(selectedDate);
  }

  // Vyplnit protokol — init + navigate
  async function handleVyplnitProtokol(zasah: TechnikZasahRow) {
    setPendingProtokolZasahId(zasah.id);
    setError(null);
    try {
      const protokol = await initProtokolAction(zasah.id);
      router.push(`/protokoly/${protokol.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Chyba při vytváření protokolu",
      );
      setPendingProtokolZasahId(null);
    }
  }

  // Helpers
  function getKlientName(zasah: TechnikZasahRow): string {
    const klient = zasah.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  function getPrimaryKontakt(klientId: string): KontaktniOsobaRow | null {
    const klientKontakty = kontaktyByKlient.get(klientId);
    if (!klientKontakty || klientKontakty.length === 0) return null;
    // Already sorted by je_primarni DESC from DB
    return klientKontakty[0];
  }

  const isToday = selectedDate === toDateString(new Date());

  // Count collisions for summary
  const collisionCount = travelEstimates.filter((te) => te.hasCollision).length;

  return (
    <div className="space-y-4">
      {/* Day navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => goToDay(-1)}
          aria-label="Předchozí den"
        >
          ←
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-bold">
            {formatDatumCzLong(parseDateLocal(selectedDate))}
          </h2>
          {!isToday && (
            <Button
              variant="link"
              size="sm"
              className="min-h-[44px] min-w-[44px] text-sm"
              onClick={goToToday}
            >
              Dnes
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-[44px] min-w-[44px]"
          onClick={() => goToDay(1)}
          aria-label="Další den"
        >
          →
        </Button>
      </div>

      {/* Summary */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {activeZasahy.length === 0
            ? "Žádné zásahy"
            : `${activeZasahy.length} ${activeZasahy.length === 1 ? "zásah" : activeZasahy.length < 5 ? "zásahy" : "zásahů"}`}
          {collisionCount > 0 && (
            <span className="ml-1 text-amber-600 font-medium">
              · {collisionCount} {collisionCount < 5 ? "kolize" : "kolizí"} v čase
            </span>
          )}
        </p>
        {isGeocoding && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Zjišťuji vzdálenosti...
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3" role="alert">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-5 w-24 rounded bg-muted" />
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-4 w-36 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && activeZasahy.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              🗓️ Volný den
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Na tento den nemáte naplánované žádné zásahy.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Zasah cards with travel indicators */}
      {!isLoading &&
        activeZasahy.map((zasah, idx) => {
          const statusInfo = STATUS_ZASAHU_LABELS[zasah.status];
          const nextStatuses = TECHNIK_STATUS_TRANSITIONS[zasah.status] || [];
          const klientId = zasah.zakazky?.objekty?.klient_id;
          const kontakt = klientId ? getPrimaryKontakt(klientId) : null;
          const adresa = zasah.zakazky?.objekty?.adresa;
          const isPending = pendingZasahId === zasah.id;

          // Travel estimate TO this zasah (from previous)
          const travel = travelByToId.get(zasah.id);

          return (
            <div key={zasah.id}>
              {/* Travel time indicator (between cards) */}
              {idx > 0 && travel && travel.travelMinutes !== null && (
                <TravelIndicator travel={travel} />
              )}

              <Card
                className={`overflow-hidden ${
                  travel?.hasCollision ? "ring-2 ring-amber-400" : ""
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Status + Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${statusInfo?.bgColor} ${statusInfo?.color} text-sm px-2 py-0.5`}
                      >
                        {statusInfo?.label ?? zasah.status}
                      </Badge>
                      {travel?.hasCollision && (
                        <Badge className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5">
                          Kolize
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">
                        {formatCasCz(zasah.cas_od.substring(0, 5))}–
                        {formatCasCz(zasah.cas_do.substring(0, 5))}
                      </span>
                      {zasah.odhadovana_delka_min && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatDelka(zasah.odhadovana_delka_min)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Client name */}
                  <div>
                    <p className="text-base font-semibold">
                      {getKlientName(zasah)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {zasah.zakazky?.objekty?.nazev}
                    </p>
                  </div>

                  {/* Address + Navigation */}
                  {adresa && (
                    <a
                      href={getGoogleMapsUrl(adresa)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-800 active:bg-blue-100"
                    >
                      <span className="text-lg">📍</span>
                      <span className="flex-1 text-sm font-medium">{adresa}</span>
                      <span className="text-sm font-bold">→</span>
                    </a>
                  )}

                  {/* Zakázka type badges */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {zasah.zakazky?.typ === "smluvni"
                        ? "Smluvní"
                        : "Jednorázová"}
                    </Badge>
                    {Array.isArray(zasah.zakazky?.typy_zasahu) &&
                      (zasah.zakazky.typy_zasahu as string[]).map((t: string) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    {zasah.zakazky?.platba_predem === true && (
                      <Badge className="bg-purple-100 text-purple-800 text-xs border-purple-200">
                        💳 Předem
                      </Badge>
                    )}
                  </div>

                  {/* Client contact */}
                  {(zasah.zakazky?.objekty?.klienti?.telefon ||
                    zasah.zakazky?.objekty?.klienti?.email) && (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Kontakt na klienta
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {zasah.zakazky?.objekty?.klienti?.telefon && (
                          <a
                            href={`tel:${zasah.zakazky.objekty.klienti.telefon}`}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 active:bg-green-100"
                          >
                            📞 {zasah.zakazky.objekty.klienti.telefon}
                          </a>
                        )}
                        {zasah.zakazky?.objekty?.klienti?.email && (
                          <a
                            href={`mailto:${zasah.zakazky.objekty.klienti.email}`}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 active:bg-gray-100"
                          >
                            ✉️ {zasah.zakazky.objekty.klienti.email}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Contact person on-site */}
                  {kontakt && (
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Kontaktní osoba na místě
                      </p>
                      <p className="text-sm font-semibold">
                        {kontakt.jmeno}
                        {kontakt.funkce && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            ({kontakt.funkce})
                          </span>
                        )}
                      </p>
                      {kontakt.telefon && (
                        <a
                          href={`tel:${kontakt.telefon}`}
                          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-medium text-green-800 active:opacity-70"
                        >
                          📞 {kontakt.telefon}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  {zasah.poznamka && (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Poznámka</p>
                      <p className="mt-0.5 text-sm">{zasah.poznamka}</p>
                    </div>
                  )}

                  {/* Proforma + QR platba button */}
                  {zasah.zakazky?.platba_predem === true &&
                    zasah.status !== "zruseno" && (
                    <Button
                      className="min-h-[44px] w-full bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800"
                      onClick={() => {
                        setProformaZasah(zasah);
                        setProformaOpen(true);
                      }}
                    >
                      💳 Proforma + QR platba
                    </Button>
                  )}

                  {/* Status action buttons */}
                  {nextStatuses.length > 0 && (
                    <div className="flex gap-2">
                      {nextStatuses.map((s) => {
                        const sInfo = STATUS_ZASAHU_LABELS[s];
                        const actionLabel =
                          TECHNIK_STATUS_ACTION_LABELS[s] || sInfo?.label;
                        return (
                          <Button
                            key={s}
                            className={`min-h-[44px] flex-1 ${sInfo?.bgColor} ${sInfo?.color} border-transparent hover:opacity-90 active:opacity-80`}
                            variant="outline"
                            disabled={isPending}
                            aria-label={`Změnit status na ${sInfo?.label}`}
                            onClick={() =>
                              handleStatusChange(
                                zasah.id,
                                s as Database["public"]["Enums"]["status_zasahu"],
                              )
                            }
                          >
                            {isPending ? "..." : actionLabel}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {/* Completed indicator + protokol button */}
                  {zasah.status === "hotovo" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-1 rounded-lg bg-emerald-50 p-2">
                        <span className="text-lg">✅</span>
                        <span className="text-sm font-medium text-emerald-800">
                          Dokončeno
                        </span>
                      </div>
                      <Button
                        className="min-h-[44px] w-full bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                        disabled={pendingProtokolZasahId === zasah.id}
                        onClick={() => handleVyplnitProtokol(zasah)}
                      >
                        {pendingProtokolZasahId === zasah.id
                          ? "Připravuji..."
                          : "📋 Vyplnit protokol"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}

      {/* Cancelled zasahy (collapsible) */}
      {!isLoading && cancelledZasahy.length > 0 && (
        <details className="space-y-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground list-none flex items-center gap-1 min-h-[44px]">
            <span className="text-muted-foreground/60">▶</span>
            Zrušené zásahy ({cancelledZasahy.length})
          </summary>
          <div className="space-y-2">
            {cancelledZasahy.map((zasah) => (
              <Card key={zasah.id} className="opacity-50">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-800 text-xs px-2 py-0.5">
                        Zrušeno
                      </Badge>
                      <span className="text-sm line-through">
                        {getKlientName(zasah)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatCasCz(zasah.cas_od.substring(0, 5))}–
                      {formatCasCz(zasah.cas_do.substring(0, 5))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {/* Další termín Bottom Sheet */}
      <DalsiTerminSheet
        open={dalsiTerminOpen}
        onOpenChange={setDalsiTerminOpen}
        zasah={dalsiTerminZasah}
        onScheduled={handleDalsiTerminScheduled}
        onSkipped={handleDalsiTerminSkipped}
      />

      {proformaZasah && (
        <ProformaSheet
          open={proformaOpen}
          onOpenChange={setProformaOpen}
          zasahId={proformaZasah.id}
          zakazkaId={proformaZasah.zakazka_id}
        />
      )}
    </div>
  );
}

// ---------- Travel Indicator Component ----------

function TravelIndicator({ travel }: { travel: TravelEstimate }) {
  if (travel.travelMinutes == null || travel.travelMinutes === 0) return null;

  const isCollision = travel.hasCollision;

  return (
    <div className="flex items-center justify-center gap-2 py-2" aria-label={`Přejezd ${formatTravelTime(travel.travelMinutes)}${travel.distanceKm ? `, ${travel.distanceKm} km` : ""}`}>
      <div
        className={`h-px flex-1 ${isCollision ? "bg-amber-400" : "bg-muted-foreground/20"}`}
      />
      <div
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
          isCollision
            ? "bg-amber-100 text-amber-800 font-medium"
            : "bg-muted/50 text-muted-foreground"
        }`}
      >
        <span>🚗</span>
        <span>{formatTravelTime(travel.travelMinutes)}</span>
        {travel.distanceKm != null && travel.distanceKm > 0 && (
          <span className="text-xs opacity-70">
            ({travel.distanceKm} km)
          </span>
        )}
        {isCollision && <span className="text-xs font-bold">⚠️</span>}
      </div>
      <div
        className={`h-px flex-1 ${isCollision ? "bg-amber-400" : "bg-muted-foreground/20"}`}
      />
    </div>
  );
}
