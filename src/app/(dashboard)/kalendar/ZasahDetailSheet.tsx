"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ConfirmDeleteSheet } from "@/components/layout/ConfirmDeleteSheet";
import { formatCasCz, formatDatumCzLong } from "@/lib/utils/dostupnostUtils";
import {
  STATUS_ZASAHU_LABELS,
  ADMIN_STATUS_TRANSITIONS,
  formatDelka,
  getTechnikColor,
  getGoogleMapsUrl,
} from "@/lib/utils/zasahUtils";
import { updateZasahAction, deleteZasahAction } from "./actions";
import type { ZasahRow } from "./KalendarView";
import type { Database } from "@/lib/supabase/database.types";

interface ZasahDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zasah: ZasahRow | null;
  technikColorMap: Map<string, number>;
  onDone: () => void;
}

function parseDateLocal(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Using shared admin transitions from zasahUtils

export function ZasahDetailSheet({
  open,
  onOpenChange,
  zasah,
  technikColorMap,
  onDone,
}: ZasahDetailSheetProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!zasah) return null;

  const colorIdx = technikColorMap.get(zasah.technik_id) ?? 0;
  const color = getTechnikColor(colorIdx);
  const statusInfo = STATUS_ZASAHU_LABELS[zasah.status];
  const nextStatuses = ADMIN_STATUS_TRANSITIONS[zasah.status] || [];

  function getKlientName(): string {
    const klient = zasah?.zakazky?.objekty?.klienti;
    if (!klient) return "—";
    if (klient.typ === "firma") return klient.nazev;
    return `${klient.prijmeni} ${klient.jmeno}`.trim();
  }

  async function handleStatusChange(
    newStatus: Database["public"]["Enums"]["status_zasahu"],
  ) {
    setError(null);
    setIsPending(true);
    try {
      await updateZasahAction(zasah!.id, { status: newStatus });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při aktualizaci");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsPending(true);
    try {
      await deleteZasahAction(zasah!.id);
      setDeleteOpen(false);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při mazání");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title="Detail zásahu"
        description={
          zasah.datum ? formatDatumCzLong(parseDateLocal(zasah.datum)) : ""
        }
      >
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge
              className={`${statusInfo?.bgColor} ${statusInfo?.color} text-sm px-2 py-0.5`}
            >
              {statusInfo?.label}
            </Badge>
            <span className="text-sm font-bold">
              {formatCasCz(zasah.cas_od.substring(0, 5))}–
              {formatCasCz(zasah.cas_do.substring(0, 5))}
            </span>
            {zasah.odhadovana_delka_min && (
              <span className="text-xs text-muted-foreground">
                ({formatDelka(zasah.odhadovana_delka_min)})
              </span>
            )}
          </div>

          {/* Technik */}
          <div className={`rounded-lg ${color.bg} p-3`}>
            <p className="text-xs text-muted-foreground">Technik</p>
            <p className={`text-sm font-semibold ${color.text}`}>
              {zasah.profiles?.jmeno} {zasah.profiles?.prijmeni}
            </p>
            {zasah.profiles?.email && (
              <p className="text-xs text-muted-foreground">
                {zasah.profiles.email}
              </p>
            )}
          </div>

          {/* Klient + Objekt */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Klient</p>
            <p className="text-sm font-semibold">{getKlientName()}</p>
            {zasah.zakazky?.objekty?.klienti?.telefon && (
              <a
                href={`tel:${zasah.zakazky.objekty.klienti.telefon}`}
                className="inline-flex min-h-[44px] items-center text-sm text-blue-600 underline"
              >
                {zasah.zakazky.objekty.klienti.telefon}
              </a>
            )}

            <div className="mt-2">
              <p className="text-xs text-muted-foreground">Objekt</p>
              <p className="text-sm font-medium">
                {zasah.zakazky?.objekty?.nazev}
              </p>
              {zasah.zakazky?.objekty?.adresa && (
                <a
                  href={getGoogleMapsUrl(zasah.zakazky.objekty.adresa)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex min-h-[44px] items-center gap-2 rounded-lg bg-blue-50 p-2 text-blue-800 active:bg-blue-100"
                >
                  <span className="text-base">📍</span>
                  <span className="flex-1 text-sm">{zasah.zakazky.objekty.adresa}</span>
                  <span className="text-sm font-bold">→</span>
                </a>
              )}
            </div>
          </div>

          {/* Zakázka info */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Zakázka</p>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline" className="text-xs">
                {zasah.zakazky?.typ === "smluvni" ? "Smluvní" : "Jednorázová"}
              </Badge>
              {Array.isArray(zasah.zakazky?.typy_zasahu) &&
                (zasah.zakazky.typy_zasahu as string[]).map((t: string) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t.replace(/_/g, " ")}
                  </Badge>
                ))}
            </div>
          </div>

          {/* Poznámka */}
          {zasah.poznamka && (
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Poznámka</p>
              <p className="mt-0.5 text-sm">{zasah.poznamka}</p>
            </div>
          )}

          {/* Status change buttons */}
          {nextStatuses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Změna statusu:</p>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((s) => {
                  const sInfo = STATUS_ZASAHU_LABELS[s];
                  return (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className={`min-h-[44px] ${sInfo?.bgColor} ${sInfo?.color} border-transparent`}
                      disabled={isPending}
                      aria-label={`Změnit status na ${sInfo?.label}`}
                      onClick={() =>
                        handleStatusChange(
                          s as Database["public"]["Enums"]["status_zasahu"],
                        )
                      }
                    >
                      {sInfo?.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Delete */}
          <Button
            variant="destructive"
            className="min-h-[44px] w-full"
            disabled={isPending}
            onClick={() => setDeleteOpen(true)}
          >
            Smazat zásah
          </Button>
        </div>
      </BottomSheet>

      <ConfirmDeleteSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Smazat zásah"
        description={
          <>
            Opravdu chcete smazat zásah pro <strong>{getKlientName()}</strong>{" "}
            dne{" "}
            {zasah.datum ? formatDatumCzLong(parseDateLocal(zasah.datum)) : ""}?
          </>
        }
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  );
}
