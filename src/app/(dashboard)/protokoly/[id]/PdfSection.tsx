"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  protokolId: string;
  cisloProtokolu: string | null;
  hasPostrik: boolean;
  hasDeratBody?: boolean;
  hasDezinsBody?: boolean;
};

export function PdfSection({ protokolId, cisloProtokolu, hasPostrik, hasDeratBody, hasDezinsBody }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasPostrik && !hasDeratBody && !hasDezinsBody) return null;

  const pdfUrl = `/api/protokoly/${protokolId}/pdf`;

  async function handleDownload() {
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Chyba ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cisloProtokolu || "protokol"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chyba při generování PDF");
    } finally {
      setIsGenerating(false);
    }
  }

  function handlePreview() {
    window.open(pdfUrl, "_blank");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-bold text-foreground">
          PDF protokol
        </h3>

        <p className="text-xs text-muted-foreground">
          {hasDeratBody && !hasPostrik && !hasDezinsBody
            ? "Deratizační protokol"
            : [
                hasPostrik && "postřik",
                hasDeratBody && "deratizace",
                hasDezinsBody && "dezinsekce",
              ].filter(Boolean).length > 0
              ? `Dezinsekční protokol (${[hasPostrik && "postřik", hasDeratBody && "deratizace", hasDezinsBody && "dezinsekce"].filter(Boolean).join(" + ")})`
              : "Protokol"}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] flex-1 text-sm"
            onClick={handlePreview}
          >
            Náhled
          </Button>
          <Button
            type="button"
            className="min-h-[44px] flex-1 text-sm"
            onClick={handleDownload}
            disabled={isGenerating}
          >
            {isGenerating ? "Generuji\u2026" : "Stáhnout PDF"}
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2" role="alert">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
