"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeratFormView } from "./DeratFormView";
import { DezinsFormView } from "./DezinsFormView";
import { PostrikFormView } from "./PostrikFormView";
import { StatistikySection } from "./StatistikySection";
import { VetaUcinnostiSection } from "./VetaUcinnostiSection";
import { FotoSection } from "./FotoSection";
import { PodpisCanvas } from "./PodpisCanvas";
import { PdfSection } from "./PdfSection";
import {
  EmailStatusSection,
  type EmailLogEntry,
} from "./EmailStatusSection";
import {
  submitProtokolKeSchvaleniAction,
  adminApproveProtokolAction,
  adminRejectProtokolAction,
  sendProtokolEmailAction,
  createFakturaAction,
  generateAiHodnoceniAction,
  saveAiHodnoceniAction,
  syncProtocolPriceToZakazkaAction,
} from "./protokolActions";
import { LivePriceWidget } from "./LivePriceWidget";
import {
  computeDeratStatistiky,
  computeDezinsStatistiky,
} from "@/lib/utils/protokolUtils";
import type { Database } from "@/lib/supabase/database.types";

// ---------- Types ----------

type StatusProtokolu = Database["public"]["Enums"]["status_protokolu"];
type TypStanicky = Database["public"]["Enums"]["typ_stanicky"];
type StavStanicky = Database["public"]["Enums"]["stav_stanicky"];
type TypLapace = Database["public"]["Enums"]["typ_lapace"];
type TypZakroku = Database["public"]["Enums"]["typ_zakroku"];
type TypPripravku = Database["public"]["Enums"]["typ_pripravku"];

type ProtokolData = {
  id: string;
  cislo_protokolu: string | null;
  status: StatusProtokolu;
  poznamka: string | null;
  zasah_id: string;
  veta_ucinnosti: string | null;
  podpis_klient_url: string | null;
  admin_komentar: string | null;
  ai_hodnoceni: string | null;
};

type TabType = "deratizace" | "dezinsekce" | "postrik";

type DeratBodData = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_stanicky: TypStanicky;
  pripravek_id: string | null;
  pozer_procent: number;
  stav_stanicky: StavStanicky;
};

type DezinsBodData = {
  id?: string;
  cislo_bodu: string;
  okruh_id: string | null;
  typ_lapace: TypLapace;
  druh_hmyzu: string | null;
  pocet: number;
};

type PostrikDataFromDB = {
  id: string;
  skudce: string | null;
  plocha_m2: number | null;
  typ_zakroku: TypZakroku | null;
  poznamka: string | null;
  protokol_postrik_pripravky: {
    id: string;
    spotreba: string | null;
    koncentrace_procent: number | null;
    pripravky: {
      id: string;
      nazev: string;
      ucinna_latka: string | null;
      protilatka: string | null;
    };
  }[];
};

type Okruh = { id: string; nazev: string };
type DeratPripravek = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
};
type PostrikPripravek = {
  id: string;
  nazev: string;
  ucinna_latka: string | null;
  protilatka: string | null;
  typ: TypPripravku;
  cilovy_skudce: unknown;
  omezeni_prostor: unknown;
};
type Skudce = { id: string; nazev: string; typ: string };

type FotoData = {
  id: string;
  soubor_url: string;
  popis: string | null;
};

type SablonaUcinnosti = {
  id: string;
  nazev: string;
  obsah: string;
};

type Props = {
  protokol: ProtokolData;
  klientName: string;
  objektNazev: string;
  availableTabs: TabType[];
  deratData?: {
    body: DeratBodData[];
    okruhy: Okruh[];
    pripravky: DeratPripravek[];
  };
  dezinsData?: {
    body: DezinsBodData[];
    okruhy: Okruh[];
    skudci: Skudce[];
  };
  postrikData?: {
    postriky: PostrikDataFromDB[];
    pripravky: PostrikPripravek[];
    skudci: Skudce[];
    typObjektu: string | null;
  };
  fotky: FotoData[];
  vetyUcinnosti: SablonaUcinnosti[];
  previousDeratBody: { pozer_procent: number }[] | null;
  previousDezinsBody: { pocet: number }[] | null;
  // Admin props
  userRole: "admin" | "technik";
  technikName?: string;
  // Email props
  klientEmail?: string | null;
  emailLog?: EmailLogEntry[];
};

// ---------- Status labels ----------

const STATUS_LABELS: Record<StatusProtokolu, string> = {
  rozpracovany: "Rozpracovaný",
  ke_schvaleni: "Ke schválení",
  schvaleny: "Schválený",
  odeslany: "Odeslaný",
};

const TAB_LABELS: Record<TabType, string> = {
  deratizace: "Deratizace",
  dezinsekce: "Dezinsekce",
  postrik: "Postřik",
};

// ---------- Component ----------

export function ProtokolFormView({
  protokol,
  klientName,
  objektNazev,
  availableTabs,
  deratData,
  dezinsData,
  postrikData,
  fotky,
  vetyUcinnosti,
  previousDeratBody,
  previousDezinsBody,
  userRole,
  technikName,
  klientEmail,
  emailLog: initialEmailLog,
}: Props) {
  const router = useRouter();
  const [poznamka, setPoznamka] = useState(protokol.poznamka || "");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Admin state
  const isAdmin = userRole === "admin";
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectKomentar, setRejectKomentar] = useState("");
  const [isApproving, startApproveTransition] = useTransition();
  const [isRejecting, startRejectTransition] = useTransition();

  // Email state
  const [isSendingEmail, startEmailTransition] = useTransition();
  const [emailLog, setEmailLog] = useState<EmailLogEntry[]>(
    initialEmailLog || [],
  );
  const [emailError, setEmailError] = useState<string | null>(null);

  // AI hodnocení state
  const [aiHodnoceni, setAiHodnoceni] = useState(
    protokol.ai_hodnoceni || "",
  );
  const [aiHodnoceniLoading, setAiHodnoceniLoading] = useState(false);
  const [aiHodnoceniError, setAiHodnoceniError] = useState<string | null>(
    null,
  );
  const [aiHodnoceniSaved, setAiHodnoceniSaved] = useState(false);

  // Faktura state
  const [fakturaLoading, setFakturaLoading] = useState(false);
  const [fakturaError, setFakturaError] = useState<string | null>(null);
  const [fakturaCreated, setFakturaCreated] = useState(false);

  // Live price trigger (incremented when bods change)
  const [bodCountTrigger, setBodCountTrigger] = useState(0);
  const [syncingPrice, setSyncingPrice] = useState(false);
  const [syncPriceResult, setSyncPriceResult] = useState<string | null>(null);

  // Readonly logic
  const technikReadonly = protokol.status !== "rozpracovany";
  const adminReadonly = !isAdminEditing;
  const isReadonly = isAdmin ? adminReadonly : technikReadonly;
  const forceEditable = isAdmin && isAdminEditing;

  const backUrl = isAdmin ? "/protokoly" : "/kalendar";
  const backLabel = isAdmin ? "Zpět na protokoly" : "Zpět na kalendář";

  // Dynamic tabs — technician can add intervention types on-the-fly
  const [dynamicTabs, setDynamicTabs] = useState<TabType[]>(availableTabs);
  const [showAddTabSheet, setShowAddTabSheet] = useState(false);

  const allPossibleTabs: TabType[] = ["deratizace", "dezinsekce", "postrik"];
  const addableTabs = allPossibleTabs.filter(
    (t) => !dynamicTabs.includes(t),
  );

  const defaultTab = dynamicTabs[0] || "deratizace";

  // Compute statistiky
  const deratStatistiky = deratData
    ? computeDeratStatistiky(
        deratData.body.map((b) => ({ pozer_procent: b.pozer_procent })),
        previousDeratBody,
      )
    : null;

  const dezinsStatistiky = dezinsData
    ? computeDezinsStatistiky(
        dezinsData.body.map((b) => ({ pocet: b.pocet })),
        previousDezinsBody,
      )
    : null;

  function handleSubmit() {
    startSubmitTransition(async () => {
      try {
        await submitProtokolKeSchvaleniAction(protokol.id);
        router.push("/kalendar");
      } catch (err) {
        console.error("Chyba při odesílání:", err);
        alert(err instanceof Error ? err.message : "Chyba při odesílání");
        setShowSubmitConfirm(false);
      }
    });
  }

  function handleApprove() {
    startApproveTransition(async () => {
      try {
        await adminApproveProtokolAction(protokol.id);
        router.push("/protokoly");
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Chyba při schvalování");
      }
    });
  }

  function handleReject() {
    startRejectTransition(async () => {
      try {
        await adminRejectProtokolAction(protokol.id, rejectKomentar);
        router.push("/protokoly");
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Chyba při vracení");
      }
    });
  }

  function handleSendEmail() {
    setEmailError(null);
    startEmailTransition(async () => {
      const result = await sendProtokolEmailAction(protokol.id);
      if (result.success) {
        router.refresh();
      } else {
        setEmailError(result.error || "Nepodařilo se odeslat email");
      }
    });
  }

  function handleRetryEmail() {
    handleSendEmail();
  }

  // Render form view with forceEditable prop
  function renderDeratFormView() {
    if (!deratData) return null;
    return (
      <DeratFormView
        protokolId={protokol.id}
        status={protokol.status}
        initialBody={deratData.body}
        okruhy={deratData.okruhy}
        pripravky={deratData.pripravky}
        poznamka={poznamka}
        onPoznamkaChange={setPoznamka}
        forceEditable={forceEditable}
      />
    );
  }

  function renderDezinsFormView() {
    if (!dezinsData) return null;
    return (
      <DezinsFormView
        protokolId={protokol.id}
        status={protokol.status}
        initialBody={dezinsData.body}
        okruhy={dezinsData.okruhy}
        skudci={dezinsData.skudci}
        poznamka={poznamka}
        onPoznamkaChange={setPoznamka}
        forceEditable={forceEditable}
      />
    );
  }

  function renderPostrikFormView() {
    if (!postrikData) return null;
    return (
      <PostrikFormView
        protokolId={protokol.id}
        status={protokol.status}
        initialPostriky={postrikData.postriky}
        pripravky={postrikData.pripravky}
        skudci={postrikData.skudci}
        typObjektu={postrikData.typObjektu}
        poznamka={poznamka}
        onPoznamkaChange={setPoznamka}
        forceEditable={forceEditable}
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(backUrl)}
          className="flex min-h-[44px] items-center gap-1 text-sm font-medium text-blue-600 active:opacity-70"
          aria-label={backLabel}
        >
          <span aria-hidden="true">&larr;</span> Zpět
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
          {isAdmin && technikName && (
            <p className="text-xs text-muted-foreground">
              Technik: {technikName}
            </p>
          )}
          <Badge variant="outline" className="mt-1.5 text-xs">
            {STATUS_LABELS[protokol.status] || protokol.status}
          </Badge>
        </CardContent>
      </Card>

      {/* Admin komentář — technik vidí když vráceno */}
      {!isAdmin && protokol.admin_komentar && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-yellow-800">
              Komentář od admina
            </p>
            <p className="mt-1 text-sm text-yellow-700">
              {protokol.admin_komentar}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin: editing toggle + approve/reject (only for ke_schvaleni) */}
      {isAdmin && protokol.status === "ke_schvaleni" && (
        <div className="space-y-2">
          {!isAdminEditing && !showRejectForm && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => setIsAdminEditing(true)}
              >
                Upravit
              </Button>
              <Button
                type="button"
                className="min-h-[44px] flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? "Schvaluji\u2026" : "Schválit"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-[44px] flex-1"
                onClick={() => setShowRejectForm(true)}
                disabled={isRejecting}
              >
                Vrátit
              </Button>
            </div>
          )}

          {isAdminEditing && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-blue-800">
                  Režim editace &mdash; změny se ukládají přímo
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-[44px]"
                  onClick={() => setIsAdminEditing(false)}
                >
                  Ukončit editaci
                </Button>
              </CardContent>
            </Card>
          )}

          {showRejectForm && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="space-y-3 p-3">
                <p className="text-sm font-semibold text-red-800">
                  Vrátit protokol technikovi
                </p>
                <Textarea
                  value={rejectKomentar}
                  onChange={(e) => setRejectKomentar(e.target.value)}
                  placeholder="Důvod vrácení (min. 10 znaků)..."
                  rows={3}
                  className="text-base"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] flex-1"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectKomentar("");
                    }}
                    disabled={isRejecting}
                  >
                    Zrušit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-[44px] flex-1"
                    onClick={handleReject}
                    disabled={isRejecting || rejectKomentar.trim().length < 10}
                  >
                    {isRejecting ? "Vracím\u2026" : "Vrátit technikovi"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Admin: edit toggle for rozpracovany status */}
      {isAdmin && protokol.status === "rozpracovany" && (
        <div>
          {!isAdminEditing ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setIsAdminEditing(true)}
            >
              Upravit protokol
            </Button>
          ) : (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-blue-800">
                  Režim editace &mdash; změny se ukládají přímo
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-[44px]"
                  onClick={() => setIsAdminEditing(false)}
                >
                  Ukončit editaci
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs — only shown if more than 1 tab available */}
      {dynamicTabs.length > 1 ? (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full">
            {dynamicTabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="min-h-[44px] flex-1 text-sm"
              >
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          {dynamicTabs.includes("deratizace") && (
            <TabsContent value="deratizace">
              {renderDeratFormView()}
            </TabsContent>
          )}

          {dynamicTabs.includes("dezinsekce") && (
            <TabsContent value="dezinsekce">
              {renderDezinsFormView()}
            </TabsContent>
          )}

          {dynamicTabs.includes("postrik") && (
            <TabsContent value="postrik">
              {renderPostrikFormView()}
            </TabsContent>
          )}
        </Tabs>
      ) : (
        <div>
          {defaultTab === "deratizace" && renderDeratFormView()}
          {defaultTab === "dezinsekce" && renderDezinsFormView()}
          {defaultTab === "postrik" && renderPostrikFormView()}
        </div>
      )}

      {/* Přidat typ zásahu (technik/admin, editable) */}
      {!isReadonly && addableTabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {addableTabs.map((tab) => (
            <Button
              key={tab}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-[44px] border-dashed text-sm"
              onClick={() => {
                setDynamicTabs((prev) => [...prev, tab]);
              }}
            >
              + {TAB_LABELS[tab]}
            </Button>
          ))}
        </div>
      )}

      {/* Živá kalkulace ceny */}
      <LivePriceWidget
        protokolId={protokol.id}
        bodCountTrigger={bodCountTrigger}
        isReadonly={isReadonly}
      />

      {/* Statistiky */}
      <StatistikySection
        deratStatistiky={deratStatistiky}
        dezinsStatistiky={dezinsStatistiky}
      />

      {/* AI hodnocení */}
      {isAdmin && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">AI hodnocení</Label>
              {(protokol.status === "ke_schvaleni" ||
                protokol.status === "schvaleny") && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px]"
                  disabled={aiHodnoceniLoading}
                  onClick={async () => {
                    setAiHodnoceniLoading(true);
                    setAiHodnoceniError(null);
                    setAiHodnoceniSaved(false);
                    const res = await generateAiHodnoceniAction(protokol.id);
                    setAiHodnoceniLoading(false);
                    if (res.error) {
                      setAiHodnoceniError(res.error);
                    } else if (res.hodnoceni) {
                      setAiHodnoceni(res.hodnoceni);
                    }
                  }}
                >
                  {aiHodnoceniLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Generuji…
                    </span>
                  ) : aiHodnoceni ? (
                    "Přegenerovat"
                  ) : (
                    "Generovat AI hodnocení"
                  )}
                </Button>
              )}
            </div>

            {aiHodnoceniError && (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                {aiHodnoceniError}
              </div>
            )}

            {aiHodnoceni ? (
              <>
                <Textarea
                  value={aiHodnoceni}
                  onChange={(e) => {
                    setAiHodnoceni(e.target.value);
                    setAiHodnoceniSaved(false);
                  }}
                  rows={4}
                  className="min-h-[100px] text-[16px]"
                  readOnly={protokol.status === "schvaleny"}
                />
                {protokol.status === "ke_schvaleni" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-[44px]"
                      disabled={aiHodnoceniSaved}
                      onClick={async () => {
                        try {
                          await saveAiHodnoceniAction(
                            protokol.id,
                            aiHodnoceni,
                          );
                          setAiHodnoceniSaved(true);
                        } catch (err) {
                          setAiHodnoceniError(
                            err instanceof Error
                              ? err.message
                              : "Chyba při ukládání",
                          );
                        }
                      }}
                    >
                      {aiHodnoceniSaved ? "Uloženo ✓" : "Uložit hodnocení"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              !aiHodnoceniLoading && (
                <p className="text-sm text-muted-foreground">
                  Hodnocení zatím nebylo vygenerováno.
                </p>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Věta o účinnosti */}
      <VetaUcinnostiSection
        protokolId={protokol.id}
        initialVetaUcinnosti={protokol.veta_ucinnosti}
        sablony={vetyUcinnosti}
        isReadonly={isReadonly}
      />

      {/* Fotodokumentace */}
      <FotoSection
        protokolId={protokol.id}
        initialFotky={fotky}
        isReadonly={isReadonly}
      />

      {/* Podpis klienta */}
      <PodpisCanvas
        protokolId={protokol.id}
        initialPodpisUrl={protokol.podpis_klient_url}
        isReadonly={isReadonly}
      />

      {/* PDF sekce */}
      {(dynamicTabs.includes("postrik") || dynamicTabs.includes("deratizace") || dynamicTabs.includes("dezinsekce")) &&
        ["ke_schvaleni", "schvaleny", "odeslany"].includes(protokol.status) && (
          <PdfSection
            protokolId={protokol.id}
            cisloProtokolu={protokol.cislo_protokolu}
            hasPostrik={dynamicTabs.includes("postrik")}
            hasDeratBody={dynamicTabs.includes("deratizace")}
            hasDezinsBody={dynamicTabs.includes("dezinsekce")}
          />
        )}

      {/* Email: Odeslat klientovi (admin, status=schvaleny) */}
      {isAdmin && protokol.status === "schvaleny" && (
        <div className="space-y-2">
          {emailLog.length > 0 && (
            <EmailStatusSection
              emailLog={emailLog}
              onRetry={handleRetryEmail}
              isRetrying={isSendingEmail}
            />
          )}
          {emailLog.length === 0 && (
            <>
              <Button
                type="button"
                className="min-h-[52px] w-full bg-green-600 text-base font-semibold hover:bg-green-700"
                onClick={handleSendEmail}
                disabled={isSendingEmail || !klientEmail}
              >
                {isSendingEmail
                  ? "Odesílám email..."
                  : "Odeslat klientovi"}
              </Button>
              {!klientEmail && (
                <p className="text-center text-xs text-muted-foreground">
                  Klient nemá zadaný email. Doplňte email v kartě klienta.
                </p>
              )}
              {emailError && (
                <p className="text-center text-sm text-red-600">
                  {emailError}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Email status (admin/technik, status=odeslany) */}
      {protokol.status === "odeslany" && emailLog.length > 0 && (
        <EmailStatusSection
          emailLog={emailLog}
          onRetry={isAdmin ? handleRetryEmail : undefined}
          isRetrying={isSendingEmail}
        />
      )}

      {/* Fakturace (admin, status=schvaleny nebo odeslany) */}
      {isAdmin &&
        (protokol.status === "schvaleny" || protokol.status === "odeslany") && (
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-sm font-medium">Fakturace</p>

              {/* Sync price before invoicing */}
              {!fakturaCreated && (
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full text-sm"
                    onClick={async () => {
                      setSyncingPrice(true);
                      setSyncPriceResult(null);
                      try {
                        const res = await syncProtocolPriceToZakazkaAction(
                          protokol.id,
                        );
                        if (res.success) {
                          setSyncPriceResult("Cena zakázky aktualizována dle protokolu ✓");
                          setBodCountTrigger((p) => p + 1);
                        } else {
                          setSyncPriceResult(
                            res.error || "Chyba synchronizace",
                          );
                        }
                      } catch {
                        setSyncPriceResult("Nepodařilo se synchronizovat cenu");
                      } finally {
                        setSyncingPrice(false);
                      }
                    }}
                    disabled={syncingPrice}
                  >
                    {syncingPrice
                      ? "Přepočítávám..."
                      : "🔄 Přepočítat cenu zakázky z protokolu"}
                  </Button>
                  {syncPriceResult && (
                    <p
                      className={`text-center text-xs ${
                        syncPriceResult.includes("✓")
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {syncPriceResult}
                    </p>
                  )}
                </div>
              )}

              {fakturaCreated ? (
                <p className="text-sm text-green-600">
                  Faktura byla vystavena ve Fakturoidu.
                </p>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[44px] w-full text-sm"
                    onClick={async () => {
                      setFakturaLoading(true);
                      setFakturaError(null);
                      try {
                        const res = await createFakturaAction(protokol.id);
                        if (res.success) {
                          setFakturaCreated(true);
                          router.refresh();
                        } else {
                          setFakturaError(
                            res.error || "Chyba při vystavení faktury",
                          );
                        }
                      } catch {
                        setFakturaError("Nepodařilo se vystavit fakturu");
                      } finally {
                        setFakturaLoading(false);
                      }
                    }}
                    disabled={fakturaLoading}
                  >
                    {fakturaLoading
                      ? "Vystavuji fakturu..."
                      : "Vystavit fakturu"}
                  </Button>
                  {fakturaError && (
                    <p className="text-center text-xs text-red-600">
                      {fakturaError}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
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

      {/* Technik: odeslat ke schválení */}
      {!isAdmin && !technikReadonly && (
        <div className="pt-4">
          {!showSubmitConfirm ? (
            <Button
              type="button"
              className="min-h-[52px] w-full text-base font-semibold"
              onClick={() => setShowSubmitConfirm(true)}
            >
              Odeslat ke schválení
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <p className="text-center text-sm font-medium text-foreground">
                Opravdu odeslat protokol ke schválení?
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Po odeslání nebude možné protokol editovat.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] flex-1"
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                >
                  Zrušit
                </Button>
                <Button
                  type="button"
                  className="min-h-[44px] flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Odesílám\u2026" : "Ano, odeslat"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
