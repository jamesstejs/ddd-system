"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportCsvAction } from "./actions";

type ExportType = "klienti" | "zakazky" | "faktury" | "zasahy";

const EXPORT_OPTIONS: { type: ExportType; label: string }[] = [
  { type: "klienti", label: "Klienti" },
  { type: "zakazky", label: "Zakázky" },
  { type: "faktury", label: "Faktury" },
  { type: "zasahy", label: "Zásahy" },
];

export default function ExportSection() {
  const [isPending, startTransition] = useTransition();
  const [activeExport, setActiveExport] = useState<ExportType | null>(null);

  const handleExport = (type: ExportType) => {
    setActiveExport(type);
    startTransition(async () => {
      try {
        const csv = await exportCsvAction(type);
        // Trigger download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${type}_export_${new Date().toISOString().substring(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        alert("Export se nezdařil.");
      } finally {
        setActiveExport(null);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Export dat (CSV)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {EXPORT_OPTIONS.map((opt) => (
            <Button
              key={opt.type}
              variant="outline"
              className="min-h-[44px]"
              disabled={isPending}
              onClick={() => handleExport(opt.type)}
            >
              {isPending && activeExport === opt.type
                ? "Exportuji..."
                : `Export ${opt.label}`}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
