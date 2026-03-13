"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DeratBodSummary } from "./DeratBodSummary";
import { DeratBodForm, type DeratBodFormData } from "./DeratBodForm";
import { DeratInlineRow } from "./DeratInlineRow";
import { StavSheet } from "./StavSheet";
import { AddBodSheet } from "./AddBodSheet";
import { useAutoSave } from "./useAutoSave";
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
  protokolId: string;
  status: StatusProtokolu;
  initialBody: BodData[];
  okruhy: Okruh[];
  pripravky: Pripravek[];
  poznamka: string;
  onPoznamkaChange: (v: string) => void;
  forceEditable?: boolean;
};

type ViewMode = "overview" | "inline";

// ---------- Auto-save wrapper ----------

async function saveDeratBodyWrapper(
  protokolId: string,
  body: DeratBodFormData[],
  poznamka: string,
) {
  // We pass body as-is; the action handles create/update
  await saveDeratBodyAction(protokolId, body, poznamka);
}

// ---------- Component ----------

export function DeratFormView({
  protokolId,
  status,
  initialBody,
  okruhy,
  pripravky,
  poznamka,
  onPoznamkaChange,
  forceEditable,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  // State
  const [body, setBody] = useState<DeratBodFormData[]>(
    initialBody.map((b) => ({ ...b })),
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View mode: inline (field mode) vs overview (card list)
  const isReadonly = forceEditable ? false : status !== "rozpracovany";
  const [viewMode, setViewMode] = useState<ViewMode>(
    isReadonly ? "overview" : "inline",
  );

  // StavSheet state
  const [stavSheetIndex, setStavSheetIndex] = useState<number | null>(null);
  // AddBodSheet state
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Tracked IDs for delete detection
  const [originalIds] = useState<Set<string>>(
    new Set(initialBody.filter((b) => b.id).map((b) => b.id!)),
  );

  // Auto-save (only in inline mode when editable)
  const autoSave = useAutoSave<DeratBodFormData>({
    protokolId,
    data: body,
    poznamka,
    originalIds,
    saveFn: saveDeratBodyWrapper,
    enabled: !isReadonly && viewMode === "inline",
  });

  // Scroll to top when switching between edit/overview modes
  useEffect(() => {
    if (topRef.current && typeof topRef.current.scrollIntoView === "function") {
      topRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeIndex]);

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
    // For overview mode: direct add (old behavior)
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

  const handleAddBodFromSheet = useCallback(
    (newBod: DeratBodFormData) => {
      setBody((prev) => [...prev, newBod]);
    },
    [],
  );

  const handleDeleteBod = useCallback(
    (index: number) => {
      setBody((prev) => prev.filter((_, i) => i !== index));
      setActiveIndex(null); // back to overview
    },
    [],
  );

  // ---------- Save (manual, for overview mode) ----------

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

      await saveDeratBodyAction(
        protokolId,
        bodyToSave,
        poznamka,
      );

      setSaveMessage("Uloženo");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při ukládání");
    } finally {
      setIsSaving(false);
    }
  }, [body, poznamka, protokolId, originalIds]);

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

  // Dirty state — technik má neuložené změny (for overview mode)
  const isDirty = (() => {
    if (body.length !== initialBody.length) return true;
    return body.some((b, i) => {
      const orig = initialBody[i];
      if (!orig) return true;
      return (
        b.cislo_bodu !== orig.cislo_bodu ||
        b.okruh_id !== orig.okruh_id ||
        b.typ_stanicky !== orig.typ_stanicky ||
        b.pripravek_id !== orig.pripravek_id ||
        b.pozer_procent !== orig.pozer_procent ||
        b.stav_stanicky !== orig.stav_stanicky
      );
    });
  })();

  // ================================================================
  // EDIT MODE — single bod (from overview mode tap)
  // ================================================================

  if (activeIndex !== null && activeIndex < body.length) {
    const currentBod = body[activeIndex];

    return (
      <div className="space-y-4">
        <div ref={topRef} />
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
  // AUTO-SAVE STATUS BAR
  // ================================================================

  const autoSaveStatusBar = viewMode === "inline" && !isReadonly && (
    <div className="flex items-center justify-center gap-1.5 py-1">
      {autoSave.status === "saved" && (
        <span className="text-xs text-emerald-600 font-medium">{"\u2713"} Uloženo</span>
      )}
      {autoSave.status === "saving" && (
        <span className="text-xs text-blue-600 font-medium animate-pulse">{"\u25CF"} Ukládám...</span>
      )}
      {autoSave.status === "unsaved" && (
        <span className="text-xs text-amber-600 font-medium">{"\u25CB"} Neuložené změny</span>
      )}
      {autoSave.status === "error" && (
        <span className="text-xs text-destructive font-medium">{"\u2717"} {autoSave.error || "Chyba"}</span>
      )}
    </div>
  );

  // ================================================================
  // INLINE MODE (Terénní režim)
  // ================================================================

  if (viewMode === "inline") {
    return (
      <div className="space-y-3">
        <div ref={topRef} />

        {/* Mode toggle + avg požer */}
        <div className="flex items-center justify-between gap-2">
          {/* Avg požer */}
          {body.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Badge
                className={`${avgPozerColor.bg} ${avgPozerColor.text} text-xs font-bold px-2 py-0.5`}
              >
                {avgPozer}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({body.length}{" "}
                {body.length === 1 ? "bod" : body.length < 5 ? "body" : "bodů"})
              </span>
            </div>
          )}

          {/* Mode toggle */}
          {!isReadonly && (
            <div className="flex rounded-lg border bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("inline")}
                className="rounded-md px-3 py-1 text-xs font-medium bg-white text-foreground shadow-sm"
              >
                Terénní
              </button>
              <button
                type="button"
                onClick={() => setViewMode("overview")}
                className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                Přehled
              </button>
            </div>
          )}
        </div>

        {/* Auto-save status */}
        {autoSaveStatusBar}

        {/* Inline body list */}
        <div className="space-y-1">
          {body.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Žádné body. Přidejte první bod.
            </p>
          )}
          {body.map((b, idx) => (
            <DeratInlineRow
              key={b.id || `new-${idx}`}
              bod={b}
              onChange={(updated) => handleBodChange(idx, updated)}
              onSettingsTap={() => setStavSheetIndex(idx)}
              readonly={isReadonly}
            />
          ))}
        </div>

        {/* Přidat bod */}
        {!isReadonly && (
          <Button
            variant="outline"
            className="min-h-[44px] w-full border-dashed"
            onClick={() => setAddSheetOpen(true)}
          >
            + Přidat bod
          </Button>
        )}

        {/* Auto-save error retry */}
        {autoSave.status === "error" && (
          <div className="space-y-2">
            <div className="rounded-lg bg-destructive/10 p-3" role="alert">
              <p className="text-sm text-destructive">{autoSave.error}</p>
            </div>
            <Button
              variant="outline"
              className="min-h-[44px] w-full"
              onClick={() => autoSave.saveNow()}
            >
              Zkusit znovu uložit
            </Button>
          </div>
        )}

        {/* StavSheet */}
        {stavSheetIndex !== null && stavSheetIndex < body.length && (
          <StavSheet
            open={true}
            onOpenChange={(v) => {
              if (!v) setStavSheetIndex(null);
            }}
            bod={body[stavSheetIndex]}
            okruhy={okruhy}
            pripravky={pripravky}
            onChange={(updated) => handleBodChange(stavSheetIndex, updated)}
            onDelete={() => {
              handleDeleteBod(stavSheetIndex);
              setStavSheetIndex(null);
            }}
          />
        )}

        {/* AddBodSheet */}
        <AddBodSheet
          open={addSheetOpen}
          onOpenChange={setAddSheetOpen}
          existingBody={body}
          okruhy={okruhy}
          pripravky={pripravky}
          onAdd={handleAddBodFromSheet}
        />
      </div>
    );
  }

  // ================================================================
  // OVERVIEW MODE (Přehled)
  // ================================================================

  return (
    <div className="space-y-4">
      <div ref={topRef} />

      {/* Mode toggle + avg požer */}
      <div className="flex items-center justify-between gap-2">
        {/* Průměrný požer */}
        {body.length > 0 && (
          <div className="flex items-center gap-1.5">
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

        {/* Mode toggle */}
        {!isReadonly && (
          <div className="flex rounded-lg border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("inline")}
              className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              Terénní
            </button>
            <button
              type="button"
              onClick={() => setViewMode("overview")}
              className="rounded-md px-3 py-1 text-xs font-medium bg-white text-foreground shadow-sm"
            >
              Přehled
            </button>
          </div>
        )}
      </div>

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
            onTap={() => setActiveIndex(idx)}
            readonly={isReadonly}
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

      {/* Save section — messages + button (overview mode only) */}
      {!isReadonly && (
        <div className="space-y-2 pt-2">
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
          <Button
            className={`min-h-[48px] w-full text-base font-semibold ${
              isDirty
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving
              ? "Ukládám..."
              : isDirty
                ? "Uložit změny"
                : "Uloženo"}
          </Button>

          {/* Dirty state hint */}
          {isDirty && !isSaving && !saveMessage && (
            <p className="text-center text-xs text-muted-foreground">
              Máte neuložené změny
            </p>
          )}
        </div>
      )}
    </div>
  );
}
