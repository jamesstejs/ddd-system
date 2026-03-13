"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DezinsBodSummary } from "./DezinsBodSummary";
import { DezinsBodForm, type DezinsBodFormData } from "./DezinsBodForm";
import { DezinsInlineRow } from "./DezinsInlineRow";
import { useAutoSave } from "./useAutoSave";
import { getNextCisloBodu } from "@/lib/utils/protokolUtils";
import { saveDezinsBodyAction } from "./protokolActions";
import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

type TypLapace = Database["public"]["Enums"]["typ_lapace"];
type StatusProtokolu = Database["public"]["Enums"]["status_protokolu"];

type BodData = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_lapace: TypLapace;
  druh_hmyzu: string | null;
  pocet: number;
};

type Okruh = { id: string; nazev: string };
type Skudce = { id: string; nazev: string; typ: string };

type Props = {
  protokolId: string;
  status: StatusProtokolu;
  initialBody: BodData[];
  okruhy: Okruh[];
  skudci: Skudce[];
  poznamka: string;
  onPoznamkaChange: (v: string) => void;
  forceEditable?: boolean;
};

type ViewMode = "overview" | "inline";

// ---------- Auto-save wrapper ----------

async function saveDezinsBodyWrapper(
  protokolId: string,
  body: DezinsBodFormData[],
  poznamka: string,
) {
  await saveDezinsBodyAction(protokolId, body, poznamka);
}

// ---------- Component ----------

export function DezinsFormView({
  protokolId,
  status,
  initialBody,
  okruhy,
  skudci,
  poznamka,
  onPoznamkaChange,
  forceEditable,
}: Props) {
  const topRef = useRef<HTMLDivElement>(null);

  // State
  const [body, setBody] = useState<DezinsBodFormData[]>(
    initialBody.map((b) => ({ ...b })),
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View mode
  const isReadonly = forceEditable ? false : status !== "rozpracovany";
  const [viewMode, setViewMode] = useState<ViewMode>(
    isReadonly ? "overview" : "inline",
  );

  // Tracked IDs for delete detection
  const [originalIds] = useState<Set<string>>(
    new Set(initialBody.filter((b) => b.id).map((b) => b.id!)),
  );

  // Auto-save
  const autoSave = useAutoSave<DezinsBodFormData>({
    protokolId,
    data: body,
    poznamka,
    originalIds,
    saveFn: saveDezinsBodyWrapper,
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
    (index: number, updated: DezinsBodFormData) => {
      setBody((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
    },
    [],
  );

  const handleAddBod = useCallback(() => {
    let prefix = "";
    if (body.length > 0) {
      const match = body[0].cislo_bodu.match(/^([A-Za-z]+)/);
      if (match) prefix = match[1];
    }

    const newBod: DezinsBodFormData = {
      cislo_bodu: getNextCisloBodu(body, prefix),
      okruh_id: null,
      typ_lapace: "lezouci_hmyz" as TypLapace,
      druh_hmyzu: null,
      pocet: 0,
    };

    setBody((prev) => [...prev, newBod]);
    if (viewMode === "overview") {
      setActiveIndex(body.length);
    }
  }, [body, viewMode]);

  const handleDeleteBod = useCallback(
    (index: number) => {
      setBody((prev) => prev.filter((_, i) => i !== index));
      setActiveIndex(null);
    },
    [],
  );

  // ---------- Save (manual, for overview mode) ----------

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const currentIds = new Set(body.filter((b) => b.id).map((b) => b.id!));
      const deletedIds = [...originalIds].filter((id) => !currentIds.has(id));

      const bodyToSave = [
        ...body,
        ...deletedIds.map((id) => ({
          id,
          _deleted: true as const,
          cislo_bodu: "",
          okruh_id: null,
          typ_lapace: "lezouci_hmyz" as TypLapace,
          druh_hmyzu: null,
          pocet: 0,
        })),
      ];

      await saveDezinsBodyAction(
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

  const isDirty = (() => {
    if (body.length !== initialBody.length) return true;
    return body.some((b, i) => {
      const orig = initialBody[i];
      if (!orig) return true;
      return (
        b.cislo_bodu !== orig.cislo_bodu ||
        b.okruh_id !== orig.okruh_id ||
        b.typ_lapace !== orig.typ_lapace ||
        b.druh_hmyzu !== orig.druh_hmyzu ||
        b.pocet !== orig.pocet
      );
    });
  })();

  // ================================================================
  // EDIT MODE — single bod
  // ================================================================

  if (activeIndex !== null && activeIndex < body.length) {
    const currentBod = body[activeIndex];

    return (
      <div className="space-y-4">
        <div ref={topRef} />
        <DezinsBodForm
          bod={currentBod}
          okruhy={okruhy}
          skudci={skudci}
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

        {/* Mode toggle */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {body.length}{" "}
            {body.length === 1 ? "bod" : body.length < 5 ? "body" : "bodů"}
          </span>

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
            <DezinsInlineRow
              key={b.id || `new-${idx}`}
              bod={b}
              onChange={(updated) => handleBodChange(idx, updated)}
              onSettingsTap={() => setActiveIndex(idx)}
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
      </div>
    );
  }

  // ================================================================
  // OVERVIEW MODE
  // ================================================================

  return (
    <div className="space-y-4">
      <div ref={topRef} />

      {/* Mode toggle */}
      <div className="flex items-center justify-end gap-2">
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
          <DezinsBodSummary
            key={b.id || `new-${idx}`}
            cislo_bodu={b.cislo_bodu}
            typ_lapace={b.typ_lapace}
            druh_hmyzu={b.druh_hmyzu}
            pocet={b.pocet}
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

      {/* Save section */}
      {!isReadonly && (
        <div className="space-y-2 pt-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {saveMessage && (
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-sm font-medium text-emerald-800">{saveMessage}</p>
            </div>
          )}

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
