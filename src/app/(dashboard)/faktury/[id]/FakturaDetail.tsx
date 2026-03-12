"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sendFakturaAction } from "@/app/(dashboard)/protokoly/[id]/protokolActions";
import { checkProformaPaymentAction } from "@/app/(dashboard)/kalendar/proformaActions";
import { QRCodeSVG } from "qrcode.react";
import { buildSpdString, getCompanyIban, extractDigits } from "@/lib/utils/qrPayment";

type FakturaData = {
  id: string;
  cislo: string | null;
  castka_bez_dph: number | null;
  castka_s_dph: number | null;
  dph_sazba: number;
  splatnost_dnu: number;
  datum_vystaveni: string;
  datum_splatnosti: string | null;
  stav: "vytvorena" | "odeslana" | "uhrazena" | "po_splatnosti" | "storno";
  fakturoid_id: number | null;
  fakturoid_url: string | null;
  fakturoid_pdf_url: string | null;
  poznamka: string | null;
  is_proforma: boolean;
  proforma_public_url: string | null;
  zakazky: Record<string, unknown> | null;
  protokoly: Record<string, unknown> | null;
};

type PolozkaRow = {
  id: string;
  nazev: string;
  pocet: number;
  cena_za_kus: number;
  cena_celkem: number;
  poradi: number;
};

const STAV_LABELS: Record<string, string> = {
  vytvorena: "Vytvořena",
  odeslana: "Odeslána",
  uhrazena: "Uhrazena",
  po_splatnosti: "Po splatnosti",
  storno: "Stornována",
};

const STAV_COLORS: Record<string, string> = {
  vytvorena: "bg-gray-100 text-gray-800",
  odeslana: "bg-blue-100 text-blue-800",
  uhrazena: "bg-green-100 text-green-800",
  po_splatnosti: "bg-red-100 text-red-800",
  storno: "bg-gray-200 text-gray-500",
};

function formatCena(cena: number | null): string {
  if (cena === null || cena === undefined) return "\u2014";
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cena);
}

function formatDatum(datum: string | null): string {
  if (!datum) return "\u2014";
  return new Date(datum).toLocaleDateString("cs-CZ");
}

function getKlientInfo(faktura: FakturaData) {
  const zakazky = faktura.zakazky;
  const objekty = zakazky?.objekty as Record<string, unknown> | null;
  const klienti = objekty?.klienti as Record<string, unknown> | null;

  return {
    klientName:
      (klienti?.typ === "firma"
        ? (klienti?.nazev as string)
        : `${(klienti?.prijmeni as string) || ""} ${(klienti?.jmeno as string) || ""}`.trim()) ||
      "Nezn\u00e1m\u00fd klient",
    klientIco: (klienti?.ico as string) || null,
    klientDic: (klienti?.dic as string) || null,
    objektNazev: (objekty?.nazev as string) || null,
    objektAdresa: (objekty?.adresa as string) || null,
    klientId: (klienti?.id as string) || null,
  };
}

export function FakturaDetail({
  faktura,
  polozky,
}: {
  faktura: FakturaData;
  polozky: PolozkaRow[];
}) {
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [stav, setStav] = useState(faktura.stav);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);

  const info = getKlientInfo(faktura);
  const protokolId = (faktura.protokoly as Record<string, unknown> | null)
    ?.id as string | null;
  const protokolCislo = (
    faktura.protokoly as Record<string, unknown> | null
  )?.cislo_protokolu as string | null;

  async function handleSend() {
    setSending(true);
    setSendError(null);
    try {
      const result = await sendFakturaAction(faktura.id);
      if (result.success) {
        setStav("odeslana");
      } else {
        setSendError(result.error || "Nepodařilo se odeslat");
      }
    } catch {
      setSendError("Nepodařilo se odeslat fakturu");
    } finally {
      setSending(false);
    }
  }

  async function handleCheckPayment() {
    setChecking(true);
    setCheckMsg(null);
    try {
      const result = await checkProformaPaymentAction(faktura.id);
      if (result.success) {
        if (result.paid) {
          setStav("uhrazena");
          setCheckMsg("Platba přijata!");
        } else {
          setCheckMsg("Platba zatím nebyla přijata.");
        }
      } else {
        setCheckMsg(result.error || "Nepodařilo se zkontrolovat");
      }
    } catch {
      setCheckMsg("Nepodařilo se zkontrolovat platbu");
    } finally {
      setChecking(false);
    }
  }

  // QR pro proformu
  const spdString = faktura.is_proforma && faktura.castka_s_dph
    ? buildSpdString({
        iban: getCompanyIban(),
        amount: faktura.castka_s_dph,
        vs: extractDigits(faktura.cislo || ""),
        message: `Proforma ${faktura.cislo || ""}`,
      })
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/faktury"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <span className="text-lg">&larr;</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">
            {faktura.is_proforma ? "Proforma faktura" : "Faktura"}{" "}
            {faktura.cislo || ""}
          </h1>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge
              variant="secondary"
              className={`text-xs ${STAV_COLORS[stav] || ""}`}
            >
              {STAV_LABELS[stav] || stav}
            </Badge>
            {faktura.is_proforma && (
              <Badge className="bg-purple-100 text-purple-800 text-xs border-purple-200">
                Proforma
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Klient info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Odběratel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="font-medium">{info.klientName}</p>
          {info.klientIco && (
            <p className="text-muted-foreground">
              I\u010cO: {info.klientIco}
              {info.klientDic ? ` \u00b7 DI\u010c: ${info.klientDic}` : ""}
            </p>
          )}
          {info.objektNazev && (
            <p className="text-muted-foreground">
              Objekt: {info.objektNazev}
            </p>
          )}
          {info.objektAdresa && (
            <p className="text-muted-foreground">{info.objektAdresa}</p>
          )}
        </CardContent>
      </Card>

      {/* Faktura info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Údaje faktury</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Datum vystavení</span>
            <span>{formatDatum(faktura.datum_vystaveni)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Splatnost</span>
            <span>{formatDatum(faktura.datum_splatnosti)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sazba DPH</span>
            <span>{faktura.dph_sazba} %</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Základ bez DPH</span>
            <span className="font-medium">
              {formatCena(faktura.castka_bez_dph)}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Celkem s DPH</span>
            <span>{formatCena(faktura.castka_s_dph)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Polozky */}
      {polozky.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Položky</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {polozky.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate">{p.nazev}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.pocet} ks × {formatCena(p.cena_za_kus)}
                  </p>
                </div>
                <span className="shrink-0 font-medium">
                  {formatCena(p.cena_celkem)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Protokol link */}
      {protokolId && (
        <Card>
          <CardContent className="py-3">
            <Link
              href={`/protokoly/${protokolId}`}
              className="flex min-h-[44px] items-center text-sm font-medium text-blue-600 underline-offset-4 hover:underline active:underline"
            >
              Protokol: {protokolCislo || protokolId}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* External links */}
      {faktura.fakturoid_url && (
        <Card>
          <CardContent className="py-3">
            <a
              href={faktura.fakturoid_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center text-sm font-medium text-blue-600 underline-offset-4 hover:underline active:underline"
            >
              Otevřít ve Fakturoidu ↗
            </a>
          </CardContent>
        </Card>
      )}

      {/* Proforma QR code */}
      {faktura.is_proforma && spdString && stav !== "uhrazena" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">QR platba</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={spdString} size={200} level="M" />
            </div>
            <p className="text-xs text-muted-foreground">
              Naskenujte QR kód bankovní aplikací
            </p>
            {faktura.proforma_public_url && (
              <a
                href={faktura.proforma_public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] flex items-center text-sm text-purple-600 underline"
              >
                Zobrazit proformu online ↗
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proforma check payment */}
      {faktura.is_proforma && stav !== "uhrazena" && stav !== "storno" && (
        <div className="space-y-2">
          <Button
            onClick={handleCheckPayment}
            disabled={checking}
            className="w-full min-h-[44px] bg-purple-600 hover:bg-purple-700"
          >
            {checking ? "Kontroluji..." : "Zkontrolovat platbu"}
          </Button>
          {checkMsg && (
            <p
              className={`text-center text-sm ${
                (stav as string) === "uhrazena" ? "text-green-600" : "text-amber-600"
              }`}
            >
              {checkMsg}
            </p>
          )}
        </div>
      )}

      {/* Proforma paid */}
      {faktura.is_proforma && stav === "uhrazena" && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-4">
          <span className="text-2xl">✅</span>
          <span className="text-lg font-semibold text-green-700">
            Uhrazeno
          </span>
        </div>
      )}

      {/* Actions */}
      {stav === "vytvorena" && !faktura.is_proforma && (
        <div className="space-y-2">
          <Button
            onClick={handleSend}
            disabled={sending}
            className="w-full min-h-[44px]"
          >
            {sending ? "Odesílám..." : "Odeslat fakturu klientovi"}
          </Button>
          {sendError && (
            <p className="text-center text-sm text-red-600">{sendError}</p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Před odesláním můžete fakturu upravit ve Fakturoidu.
          </p>
        </div>
      )}

      {/* Note */}
      {faktura.poznamka && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">{faktura.poznamka}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
