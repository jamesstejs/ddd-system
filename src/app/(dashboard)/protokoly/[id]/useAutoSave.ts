"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type AutoSaveStatus = "saved" | "saving" | "unsaved" | "error";

interface UseAutoSaveOptions<T> {
  /** Unique protocol ID */
  protokolId: string;
  /** Current body data */
  data: T[];
  /** Current poznamka */
  poznamka: string;
  /** Original IDs for delete detection */
  originalIds: Set<string>;
  /** Save function — receives (protokolId, bodyToSave, poznamka) */
  saveFn: (protokolId: string, body: T[], poznamka: string) => Promise<void>;
  /** Whether auto-save is enabled */
  enabled: boolean;
  /** Debounce delay in ms (default: 1500) */
  debounceMs?: number;
}

interface UseAutoSaveResult {
  status: AutoSaveStatus;
  error: string | null;
  /** Force an immediate save */
  saveNow: () => Promise<void>;
}

/**
 * Auto-save hook with debounce.
 * Saves after `debounceMs` of inactivity, and on unmount.
 */
export function useAutoSave<T extends { id?: string }>({
  protokolId,
  data,
  poznamka,
  originalIds,
  saveFn,
  enabled,
  debounceMs = 1500,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);

  // Refs to keep latest values accessible in callbacks/cleanup
  const dataRef = useRef(data);
  const poznamkaRef = useRef(poznamka);
  const originalIdsRef = useRef(originalIds);
  const protokolIdRef = useRef(protokolId);
  const saveFnRef = useRef(saveFn);
  const enabledRef = useRef(enabled);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  // Initialize with current data as "already saved" baseline (data from DB is already saved)
  const [initialSnapshot] = useState(() => JSON.stringify({ data, poznamka }));
  const lastSavedRef = useRef<string>(initialSnapshot);

  // Update refs
  dataRef.current = data;
  poznamkaRef.current = poznamka;
  originalIdsRef.current = originalIds;
  protokolIdRef.current = protokolId;
  saveFnRef.current = saveFn;
  enabledRef.current = enabled;

  // Snapshot for comparison
  const currentSnapshot = JSON.stringify({ data, poznamka });

  // Core save function
  const executeSave = useCallback(async () => {
    if (isSavingRef.current) return;
    if (!enabledRef.current) return;

    const snapshot = JSON.stringify({
      data: dataRef.current,
      poznamka: poznamkaRef.current,
    });

    // Nothing changed since last save
    if (snapshot === lastSavedRef.current) {
      setStatus("saved");
      return;
    }

    isSavingRef.current = true;
    setStatus("saving");
    setError(null);

    try {
      await saveFnRef.current(
        protokolIdRef.current,
        dataRef.current,
        poznamkaRef.current,
      );
      lastSavedRef.current = snapshot;
      setStatus("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při ukládání");
      setStatus("error");
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // Manual save
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await executeSave();
  }, [executeSave]);

  // Debounced auto-save on data change
  useEffect(() => {
    if (!enabled) return;

    // Check if data actually changed from last save
    if (currentSnapshot === lastSavedRef.current) {
      setStatus("saved");
      return;
    }

    setStatus("unsaved");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      executeSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentSnapshot, enabled, debounceMs, executeSave]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // Fire-and-forget save on unmount if there are unsaved changes
      if (enabledRef.current) {
        const snapshot = JSON.stringify({
          data: dataRef.current,
          poznamka: poznamkaRef.current,
        });
        if (snapshot !== lastSavedRef.current && !isSavingRef.current) {
          saveFnRef.current(
            protokolIdRef.current,
            dataRef.current,
            poznamkaRef.current,
          ).catch(() => {
            // Silently fail on unmount — nothing we can show
          });
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, saveNow };
}
