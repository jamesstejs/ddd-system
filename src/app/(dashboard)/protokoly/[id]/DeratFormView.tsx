"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DeratBodSummary } from "./DeratBodSummary";
import { DeratBodForm, type DeratBodFormData } from "./DeratBodForm";
import {
  prumernyPozer,
  getNextCisloBodu,
  POZER_COLORS,
} from "@/lib/utils/protokolUtils";
import { saveDeratBodyAction } from "./protokolActions";
import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];
type StatusProtokolu = Database["public"]["Enums"]["status_protokolu"];

type ProtokolData = {
  id: string;
  cislo_protokolu: string | null;
  status: StatusProtokolu;
  poznamka: string | null;
  zasah_id: string;
};

type BodData = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: TypStanicky;
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: StavStanicky;
};

type Okruh = { id: string; nazev: string };
type Pripravek = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
};

type Props = {
  protokol: ProtokolData;
  initialBody: BodData[];
  okruhy: Okruh[];
  pripravky: Pripravek[];
  klientName: string;
  objektNazev: string;
};

// ---------- Component ----------

export function DeratFormView({
  protokol,
  initialBody,
  okruhy,
  pripravky,
  klientName,
  objektNazev,
}: Props) {
  const router = useRouter();

  // State
  const [body, setBody] = useState<DeratBodFormData[]>(
    initialBody.map((b) => ({ ...b })),
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [poznamka, setPoznamka] = useState(protokol.poznamka || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tracked IDs for delete detection
  const [originalIds] = useState<Set<string>>(
    new Set(initialBody.filter((b) => b.id).map((b) => b.id!)),
  );

  const isReadonly = protokol.status !== "rozpracovany";

  // ---------- Body operations ----------

  const handleBodChange = useCallback(
    (index: number, updated: DeratBodFormData) => {
      setBody((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
    },
    [],
  );

  const handleAddBod = useCallback(() => {
    // Detect prefix from existing bods
    let prefix = "";
    if (body.length > 0) {
      const match = body[0].cislo_bodu.match(/^([A-Za-z]+)/);
      if (match) prefix = match[1];
    }

    const newBod: DeratBodFormData = {
      cislo_bodu: getNextCisloBodu(body, prefix),
      okruh_id: null,
      typ_stanicky: "mys" as TypStanicky,
      pripravek_id: null,
      pozer_procent: 0,
      stav_stanicky: "ok" as StavStanicky,
    };

    setBody((prev) => [...prev, newBod]);
    setActiveIndex(body.length); // navigate to new bod
  }, [body]);

  const handleDeleteBod = useCallback(
    (index: number) => {
      setBody((prev) => prev.filter((_, i) => i !== index));
      setActiveIndex(null); // back to overview
    },
    [],
  );

  // ---------- Save ----------

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      // Find deleted bods (were in original, not in current)
      const currentIds = new Set(body.filter((b) => b.id).map((b) => b.id!));
      const deletedIds = [...originalIds].filter((id) => !currentIds.has(id));

      // Build body list including deletions
      const bodyToSave = [
        ...body,
        ...deletedIds.map((id) => ({
          id,
          _deleted: true as const,
          cislo_bodu: "",
          okruh_id: null,
          typ_stanicky: "mys" as TypStanicky,
          pripravek_id: null,
          pozer_procent: 0,
          stav_stanicky: "ok" as StavStanicky,
        })),
      ];

      // Uloží body + poznámku v jednom požadavku (1 server action místo 2)
      const poznamkaChanged = poznamka !== (protokol.poznamka || "");
      await saveDeratBodyAction(
        protokol.id,
        bodyToSave,
        poznamkaChanged ? poznamka : undefined,
      );

      setSaveMessage("Uloženo");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setIsSaving(false);
    }
  }, [body, poznamka, protokol.id, protokol.poznamka, originalIds]);

  // ---------- Computed ----------

  const avgPozer = prumernyPozer(body);
  const avgPozerColor =
    POZER_COLORS[
      avgPozer === 0
        ? 0
        : avgPozer <= 25
          ? 25
          : avgPozer <= 50
            ? 50
            : avgPozer <= 75
              ? 75
              : 100
    ];

  // ================================================================
  // EDIT MODE — single bod
  // ================================================================

  if (activeIndex !== null && activeIndex < body.length) {
    const currentBod = body[activeIndex];

    return (
      <div className="space-y-4 p-4">
        <DeratBodForm
          bod={currentBod}
          okruhy={okruhy}
          pripravky={pripravky}
          onChange={(updated) => handleBodChange(activeIndex, updated)}
          onDelete={() => handleDeleteBod(activeIndex)}
          onPrev={activeIndex > 0 ? () => setActiveIndex(activeIndex - 1) : null}
          onNext={
            activeIndex < body.length - 1
              ? () => setActiveIndex(activeIndex + 1)
              : null
          }
          onBack={() => setActiveIndex(null)}
          bodIndex={activeIndex}
          totalCount={body.length}
        />
      </div>
    );
  }

  // ================================================================
  // OVERVIEW MODE
  // ================================================================

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/kalendar")}
          className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-blue-600 active:opacity-70"
          aria-label="Zpět na kalendář"
        >
          ← Zpět
        </button>
        <span className="text-sm font-bold text-foreground">
          {protokol.cislo_protokolu || "Protokol"}
        </span>
      </div>

      {/* Client + Object info */}
      <Card>
        <CardContent className="p-3">
          <p className="text-base font-semibold">{klientName}</p>
          {objektNazev && (
            <p className="text-sm text-muted-foreground">{objektNazev}</p>
          )}
          <Badge
            variant="outline"
            className="mt-1.5 text-xs"
          >
            {protokol.status === "rozpracovany"
              ? "Rozpracovaný"
              : protokol.status}
          </Badge>
        </CardContent>
      </Card>

      {/* Průměrný požer */}
      {body.length > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/30 p-3">
          <span className="text-sm text-muted-foreground">Průměrný požer:</span>
          <Badge
            className={`${avgPozerColor.bg} ${avgPozerColor.text} text-sm font-bold px-3 py-0.5`}
          >
            {avgPozer}%
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({body.length}{" "}
            {body.length === 1 ? "bod" : body.length < 5 ? "body" : "bodů"})
          </span>
        </div>
      )}

      {/* Body seznam */}
      <div className="space-y-1.5">
        {body.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Žádné body. Přidejte první bod.
          </p>
        )}
        {body.map((b, idx) => (
          <DeratBodSummary
            key={b.id || `new-${idx}`}
            cislo_bodu={b.cislo_bodu}
            typ_stanicky={b.typ_stanicky}
            pozer_procent={b.pozer_procent}
            stav_stanicky={b.stav_stanicky}
            onTap={() => !isReadonly && setActiveIndex(idx)}
          />
        ))}
      </div>

      {/* Přidat bod */}
      {!isReadonly && (
        <Button
          variant="outline"
          className="min-h-[44px] w-full border-dashed"
          onClick={handleAddBod}
        >
          + Přidat bod
        </Button>
      )}

      {/* Poznámka */}
      <div className="space-y-1.5 pt-2">
        <Label htmlFor="poznamka" className="text-sm font-medium">
          Poznámka
        </Label>
        <Textarea
          id="poznamka"
          value={poznamka}
          onChange={(e) => setPoznamka(e.target.value)}
          placeholder="Poznámka k protokolu..."
          rows={3}
          className="text-base"
          disabled={isReadonly}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3" role="alert">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Success message */}
      {saveMessage && (
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">{saveMessage}</p>
        </div>
      )}

      {/* Save button */}
      {!isReadonly && (
        <Button
          className="min-h-[48px] w-full bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 active:bg-blue-800"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Ukládám..." : "Uložit rozpracovaný"}
        </Button>
      )}
    </div>
  );
}
