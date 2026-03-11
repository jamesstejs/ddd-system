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
import {
  submitProtokolKeSchvaleniAction,
  adminApproveProtokolAction,
  adminRejectProtokolAction,
} from "./protokolActions";
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
};

// ---------- Status labels ----------

const STATUS_LABELS: Record<StatusProtokolu, string> = {
  rozpracovany: "Rozpracovan\u00fd",
  ke_schvaleni: "Ke schv\u00e1len\u00ed",
  schvaleny: "Schv\u00e1len\u00fd",
  odeslany: "Odeslan\u00fd",
};

const TAB_LABELS: Record<TabType, string> = {
  deratizace: "Deratizace",
  dezinsekce: "Dezinsekce",
  postrik: "Post\u0159ik",
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

  // Readonly logic
  const technikReadonly = protokol.status !== "rozpracovany";
  const adminReadonly = !isAdminEditing;
  const isReadonly = isAdmin ? adminReadonly : technikReadonly;
  const forceEditable = isAdmin && isAdminEditing;

  const backUrl = isAdmin ? "/protokoly" : "/kalendar";
  const backLabel = isAdmin ? "Zp\u011bt na protokoly" : "Zp\u011bt na kalend\u00e1\u0159";

  const defaultTab = availableTabs[0] || "deratizace";

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
        console.error("Chyba p\u0159i odes\u00edl\u00e1n\u00ed:", err);
        alert(err instanceof Error ? err.message : "Chyba p\u0159i odes\u00edl\u00e1n\u00ed");
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
        alert(err instanceof Error ? err.message : "Chyba p\u0159i schvalov\u00e1n\u00ed");
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
        alert(err instanceof Error ? err.message : "Chyba p\u0159i vracen\u00ed");
      }
    });
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
          <span aria-hidden="true">&larr;</span> Zp\u011bt
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

      {/* Admin koment\u00e1\u0159 — technik vid\u00ed kdy\u017e vr\u00e1ceno */}
      {!isAdmin && protokol.admin_komentar && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-3">
            <p className="text-sm font-semibold text-yellow-800">
              Koment\u00e1\u0159 od admina
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
                {isApproving ? "Schvaluji\u2026" : "Schv\u00e1lit"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="min-h-[44px] flex-1"
                onClick={() => setShowRejectForm(true)}
                disabled={isRejecting}
              >
                Vr\u00e1tit
              </Button>
            </div>
          )}

          {isAdminEditing && (
            <Card className="border-blue-300 bg-blue-50">
              <CardContent className="p-3">
                <p className="text-sm font-medium text-blue-800">
                  Re\u017eim editace &mdash; zm\u011bny se ukl\u00e1daj\u00ed p\u0159\u00edmo
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-[44px]"
                  onClick={() => setIsAdminEditing(false)}
                >
                  Ukon\u010dit editaci
                </Button>
              </CardContent>
            </Card>
          )}

          {showRejectForm && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="space-y-3 p-3">
                <p className="text-sm font-semibold text-red-800">
                  Vr\u00e1tit protokol technikovi
                </p>
                <Textarea
                  value={rejectKomentar}
                  onChange={(e) => setRejectKomentar(e.target.value)}
                  placeholder="D\u016fvod vr\u00e1cen\u00ed (min. 10 znak\u016f)..."
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
                    Zru\u0161it
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="min-h-[44px] flex-1"
                    onClick={handleReject}
                    disabled={isRejecting || rejectKomentar.trim().length < 10}
                  >
                    {isRejecting ? "Vrac\u00edm\u2026" : "Vr\u00e1tit technikovi"}
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
                  Re\u017eim editace &mdash; zm\u011bny se ukl\u00e1daj\u00ed p\u0159\u00edmo
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 min-h-[44px]"
                  onClick={() => setIsAdminEditing(false)}
                >
                  Ukon\u010dit editaci
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs — only shown if more than 1 tab available */}
      {availableTabs.length > 1 ? (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full">
            {availableTabs.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="min-h-[44px] flex-1 text-sm"
              >
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>

          {availableTabs.includes("deratizace") && (
            <TabsContent value="deratizace">
              {renderDeratFormView()}
            </TabsContent>
          )}

          {availableTabs.includes("dezinsekce") && (
            <TabsContent value="dezinsekce">
              {renderDezinsFormView()}
            </TabsContent>
          )}

          {availableTabs.includes("postrik") && (
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

      {/* Statistiky */}
      <StatistikySection
        deratStatistiky={deratStatistiky}
        dezinsStatistiky={dezinsStatistiky}
      />

      {/* V\u011bta o \u00fa\u010dinnosti */}
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

      {/* Pozn\u00e1mka */}
      <div className="space-y-1.5 pt-2">
        <Label htmlFor="poznamka" className="text-sm font-medium">
          Pozn\u00e1mka
        </Label>
        <Textarea
          id="poznamka"
          value={poznamka}
          onChange={(e) => setPoznamka(e.target.value)}
          placeholder="Pozn\u00e1mka k protokolu..."
          rows={3}
          className="text-base"
          disabled={isReadonly}
        />
      </div>

      {/* Technik: odeslat ke schv\u00e1len\u00ed */}
      {!isAdmin && !technikReadonly && (
        <div className="pt-4">
          {!showSubmitConfirm ? (
            <Button
              type="button"
              className="min-h-[52px] w-full text-base font-semibold"
              onClick={() => setShowSubmitConfirm(true)}
            >
              Odeslat ke schv\u00e1len\u00ed
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <p className="text-center text-sm font-medium text-foreground">
                Opravdu odeslat protokol ke schv\u00e1len\u00ed?
              </p>
              <p className="text-center text-xs text-muted-foreground">
                Po odesl\u00e1n\u00ed nebude mo\u017en\u00e9 protokol editovat.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] flex-1"
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                >
                  Zru\u0161it
                </Button>
                <Button
                  type="button"
                  className="min-h-[44px] flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Odes\u00edl\u00e1m\u2026" : "Ano, odeslat"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
