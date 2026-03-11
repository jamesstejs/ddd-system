"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { uploadPodpisAction } from "./protokolActions";

type Props = {
  protokolId: string;
  initialPodpisUrl: string | null;
  isReadonly: boolean;
};

/**
 * Podpis klienta — canvas pro kreslení + export PNG + upload.
 * touch-action: none zabraňuje scrollu při kreslení.
 */
export function PodpisCanvas({
  protokolId,
  initialPodpisUrl,
  isReadonly,
}: Props) {
  const [podpisUrl, setPodpisUrl] = useState(initialPodpisUrl);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showCanvas, setShowCanvas] = useState(!initialPodpisUrl);
  const [isPending, startTransition] = useTransition();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Inicializace canvasu
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Nastavit DPR pro ostré vykreslení
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Bílé pozadí
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Styl čáry
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [showCanvas]);

  const getCanvasPoint = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const point = getCanvasPoint(e);
      if (!point) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      isDrawingRef.current = true;
      setIsDrawing(true);
      setHasDrawn(true);

      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    },
    [getCanvasPoint],
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();

      const point = getCanvasPoint(e);
      if (!point) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    },
    [getCanvasPoint],
  );

  const handleEnd = useCallback(() => {
    isDrawingRef.current = false;
    setIsDrawing(false);
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    startTransition(async () => {
      try {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) {
          alert("Nepodařilo se vytvořit obrázek podpisu");
          return;
        }

        const formData = new FormData();
        formData.append("file", blob, "podpis.png");
        const url = await uploadPodpisAction(protokolId, formData);
        setPodpisUrl(url);
        setShowCanvas(false);
      } catch (err) {
        console.error("Chyba při ukládání podpisu:", err);
        alert(err instanceof Error ? err.message : "Chyba při ukládání");
      }
    });
  }, [protokolId]);

  // Readonly: jen zobrazení uloženého podpisu
  if (isReadonly) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Podpis klienta
        </h3>
        {podpisUrl ? (
          <div className="rounded-lg border border-muted bg-white p-2">
            <img
              src={podpisUrl}
              alt="Podpis klienta"
              className="w-full h-auto max-h-[200px] object-contain"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Podpis nebyl zadán.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        Podpis klienta
      </h3>

      {showCanvas ? (
        <>
          {/* Canvas */}
          <div className="rounded-lg border-2 border-muted overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full bg-white cursor-crosshair"
              style={{
                height: "200px",
                touchAction: "none",
              }}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
            />
          </div>

          {/* Akce */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={handleClear}
              disabled={!hasDrawn || isPending}
            >
              Smazat podpis
            </Button>
            <Button
              type="button"
              className="min-h-[44px] flex-1"
              onClick={handleSave}
              disabled={!hasDrawn || isPending}
            >
              {isPending ? "Ukládám…" : "Uložit podpis"}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Zobrazení uloženého podpisu */}
          {podpisUrl && (
            <div className="rounded-lg border border-muted bg-white p-2">
              <img
                src={podpisUrl}
                alt="Podpis klienta"
                className="w-full h-auto max-h-[200px] object-contain"
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full"
            onClick={() => setShowCanvas(true)}
          >
            {podpisUrl ? "Podepsat znovu" : "Podepsat"}
          </Button>
        </>
      )}
    </div>
  );
}
