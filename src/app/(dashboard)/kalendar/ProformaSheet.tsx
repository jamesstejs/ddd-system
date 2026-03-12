"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { buildSpdString } from "@/lib/utils/qrPayment";
import {
  createProformaAction,
  checkProformaPaymentAction,
  type ProformaData,
} from "./proformaActions";

interface ProformaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zasahId: string;
  zakazkaId: string;
}

type SheetState = "idle" | "loading" | "created" | "checking" | "paid" | "error";

export function ProformaSheet({
  open,
  onOpenChange,
  zasahId,
}: ProformaSheetProps) {
  const [state, setState] = useState<SheetState>("idle");
  const [proforma, setProforma] = useState<ProformaData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const result = await createProformaAction(zasahId);
      if (result.success && result.data) {
        setProforma(result.data);
        setState("created");
      } else {
        setError(result.error || "Nepodařilo se vytvořit proformu");
        setState("error");
      }
    } catch {
      setError("Nepodařilo se vytvořit proformu");
      setState("error");
    }
  }, [zasahId]);

  const handleCheckPayment = useCallback(async () => {
    if (!proforma) return;
    setState("checking");
    setError(null);
    try {
      const result = await checkProformaPaymentAction(proforma.proformaId);
      if (result.success) {
        setState(result.paid ? "paid" : "created");
        if (!result.paid) {
          setError("Platba zatím nebyla přijata. Zkuste to za chvíli znovu.");
        }
      } else {
        setError(result.error || "Nepodařilo se zkontrolovat platbu");
        setState("created");
      }
    } catch {
      setError("Nepodařilo se zkontrolovat platbu");
      setState("created");
    }
  }, [proforma]);

  // Auto-create on open
  useEffect(() => {
    if (open && state === "idle") {
      handleCreate();
    }
  }, [open, state, handleCreate]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      // Delay reset to avoid flicker
      const t = setTimeout(() => {
        setState("idle");
        setProforma(null);
        setError(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const formatCzk = (amount: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const spdString =
    proforma
      ? buildSpdString({
          iban: proforma.iban,
          amount: proforma.castka_s_dph,
          vs: proforma.vs,
          message: `Proforma ${proforma.cislo}`,
        })
      : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {state === "paid" ? "Platba přijata" : "Proforma + QR platba"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col items-center gap-4">
          {/* Loading */}
          {(state === "loading" || state === "idle") && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Vytvářím proformu...
              </p>
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-center text-sm text-destructive">{error}</p>
              <Button
                onClick={handleCreate}
                className="min-h-[44px]"
                variant="outline"
              >
                Zkusit znovu
              </Button>
            </div>
          )}

          {/* Created — QR zobrazeno */}
          {(state === "created" || state === "checking") && proforma && (
            <>
              {/* Číslo proformy */}
              <p className="text-sm text-muted-foreground">
                Proforma č. {proforma.cislo}
              </p>

              {/* Částka */}
              <p className="text-3xl font-bold">
                {formatCzk(proforma.castka_s_dph)}
              </p>
              <p className="text-xs text-muted-foreground">
                ({formatCzk(proforma.castka_bez_dph)} bez DPH)
              </p>

              {/* QR kód */}
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={spdString}
                  size={220}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Naskenujte QR kód bankovní aplikací
              </p>

              {/* Chybová zpráva (platba ještě nepřišla) */}
              {error && (
                <p className="text-center text-sm text-amber-600">{error}</p>
              )}

              {/* Akce */}
              <Button
                onClick={handleCheckPayment}
                disabled={state === "checking"}
                className="min-h-[44px] w-full bg-purple-600 hover:bg-purple-700"
              >
                {state === "checking" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Kontroluji...
                  </span>
                ) : (
                  "Zkontrolovat platbu"
                )}
              </Button>

              {/* Odkaz na Fakturoid */}
              {proforma.fakturoidPublicUrl && (
                <a
                  href={proforma.fakturoidPublicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] flex items-center text-sm text-purple-600 underline"
                >
                  Zobrazit ve Fakturoidu ↗
                </a>
              )}
            </>
          )}

          {/* Paid */}
          {state === "paid" && proforma && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-xl font-semibold text-green-700">Uhrazeno</p>
              <p className="text-sm text-muted-foreground">
                Proforma č. {proforma.cislo} —{" "}
                {formatCzk(proforma.castka_s_dph)}
              </p>
              <Button
                onClick={() => onOpenChange(false)}
                className="min-h-[44px] w-full mt-2"
                variant="outline"
              >
                Zavřít
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
