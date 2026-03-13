"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postponeZasahKlientAction } from "./actions";

type Props = {
  zasahId: string;
  currentDatum: string;
  puvodni_datum: string | null;
};

const QUICK_OPTIONS = [
  { label: "+1 týden", posun: { typ: "weeks" as const, hodnota: 1 } },
  { label: "+2 týdny", posun: { typ: "weeks" as const, hodnota: 2 } },
  { label: "+1 měsíc", posun: { typ: "months" as const, hodnota: 1 } },
];

export function PostponementCard({ zasahId, currentDatum, puvodni_datum }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    newDatum?: string;
    error?: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePostpone = (
    posun: { typ: "days" | "weeks" | "months"; hodnota: number } | { datum: string },
  ) => {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await postponeZasahKlientAction({ zasahId, posun });
        setResult({ success: true, newDatum: res.newDatum });
        setExpanded(false);
      } catch (err) {
        setResult({
          success: false,
          error: err instanceof Error ? err.message : "Chyba",
        });
      }
    });
  };

  // Success state
  if (result?.success && result.newDatum) {
    return (
      <div className="mt-2 rounded-lg bg-green-50 p-3 text-sm">
        <span className="text-green-800">
          ✓ Termín posunut na{" "}
          <strong>
            {new Date(result.newDatum).toLocaleDateString("cs-CZ")}
          </strong>
        </span>
      </div>
    );
  }

  // Show postponement history if applicable
  const historyNote = puvodni_datum ? (
    <p className="mt-1 text-xs text-muted-foreground">
      Původně plánováno:{" "}
      {new Date(puvodni_datum).toLocaleDateString("cs-CZ")}
    </p>
  ) : null;

  return (
    <div className="mt-2">
      {historyNote}

      {!expanded ? (
        <Button
          variant="outline"
          className="mt-1 min-h-[44px] w-full text-sm"
          onClick={() => setExpanded(true)}
        >
          Posunout termín
        </Button>
      ) : (
        <div className="mt-1 space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">Posunout termín</p>

          {/* Quick options */}
          <div className="flex gap-2">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handlePostpone(opt.posun)}
                disabled={isPending}
                className="min-h-[44px] flex-1 rounded-lg bg-blue-100 px-2 text-sm font-medium text-blue-700 active:bg-blue-200 disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom date */}
          <div className="flex gap-2">
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              max={(() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 2);
                return d.toISOString().split("T")[0];
              })()}
              className="min-h-[44px] flex-1 text-base"
            />
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => {
                if (customDate) handlePostpone({ datum: customDate });
              }}
              disabled={isPending || !customDate}
            >
              OK
            </Button>
          </div>

          {/* Error */}
          {result?.error && (
            <p className="text-sm text-red-600">{result.error}</p>
          )}

          {/* Cancel */}
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setResult(null);
            }}
            className="text-xs text-muted-foreground"
          >
            Zrušit
          </button>

          {isPending && (
            <p className="text-xs text-muted-foreground">Posunuji...</p>
          )}
        </div>
      )}
    </div>
  );
}
