"use client";

import { useState, useEffect, useTransition } from "react";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toDateString } from "@/lib/utils/dateUtils";
import {
  ArrowLeft,
  Check,
  Loader2,
  Bug,
  Zap,
  Mouse,
  Shield,
  SprayCan,
} from "lucide-react";
import KlientSearch from "./KlientSearch";
import TechnikCapacityBar from "./TechnikCapacityBar";
import {
  getZakazkaSablonyAction,
  getTechnikCapacityAction,
  quickCreateZakazkaWithZasahAction,
} from "@/app/(dashboard)/rychle-pridani/actions";
import type { TechnikCapacity } from "@/lib/utils/capacityUtils";

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

interface KlientData {
  id: string;
  nazev: string | null;
  jmeno: string | null;
  prijmeni: string | null;
  typ: string;
  telefon: string | null;
  email: string | null;
  adresa: string | null;
  ico: string | null;
}

interface ObjektData {
  id: string;
  nazev: string;
  adresa: string;
  typ_objektu: string;
  plocha_m2: number | null;
}

interface Sablona {
  id: string;
  nazev: string;
  typ: string;
  typy_zasahu: string[];
  skudci: string[];
  poznamka_template: string | null;
}

interface TechnikWithCapacity {
  id: string;
  jmeno: string | null;
  prijmeni: string | null;
  capacity: TechnikCapacity;
}

// ---------------------------------------------------------------
// Icon mapping for templates
// ---------------------------------------------------------------

const sablonaIcons: Record<string, React.ReactNode> = {
  "Vosy": <Bug className="h-5 w-5" />,
  "Štěnice": <Shield className="h-5 w-5" />,
  "Hlodavci": <Mouse className="h-5 w-5" />,
  "Postřik": <SprayCan className="h-5 w-5" />,
};

function getSablonaIcon(nazev: string) {
  for (const [key, icon] of Object.entries(sablonaIcons)) {
    if (nazev.includes(key)) return icon;
  }
  return <Zap className="h-5 w-5" />;
}

// ---------------------------------------------------------------
// Props
// ---------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected klient (e.g. from queue widget) */
  preselectedKlient?: KlientData | null;
  preselectedObjekty?: ObjektData[];
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------

export default function QuickAddSheet({
  open,
  onOpenChange,
  preselectedKlient,
  preselectedObjekty,
}: Props) {
  // Steps: 1=Klient, 2=Šablona, 3=Technik+čas
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Step 1 — Klient
  const [selectedKlient, setSelectedKlient] = useState<KlientData | null>(null);
  const [objekty, setObjekty] = useState<ObjektData[]>([]);
  const [selectedObjektId, setSelectedObjektId] = useState<string | null>(null);

  // Step 2 — Šablona
  const [sablony, setSablony] = useState<Sablona[]>([]);
  const [selectedSablona, setSelectedSablona] = useState<Sablona | null>(null);
  const [customTyp, setCustomTyp] = useState<"jednorazova" | "smluvni">("jednorazova");
  const [customTypyZasahu, setCustomTypyZasahu] = useState<string[]>([]);
  const [customSkudci, setCustomSkudci] = useState("");
  const [poznamka, setPoznamka] = useState("");

  // Step 3 — Technik + čas
  const [datum, setDatum] = useState(toDateString(new Date()));
  const [technici, setTechnici] = useState<TechnikWithCapacity[]>([]);
  const [selectedTechnikId, setSelectedTechnikId] = useState<string | null>(null);
  const [casOd, setCasOd] = useState("");
  const [casDo, setCasDo] = useState("");

  // Result state
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ---------------------------------------------------------------
  // Reset on open/close
  // ---------------------------------------------------------------
  useEffect(() => {
    if (open) {
      if (preselectedKlient) {
        setSelectedKlient(preselectedKlient);
        setObjekty(preselectedObjekty || []);
        setSelectedObjektId(preselectedObjekty?.[0]?.id || null);
        setStep(2);
      } else {
        setStep(1);
        setSelectedKlient(null);
        setObjekty([]);
        setSelectedObjektId(null);
      }
      setSelectedSablona(null);
      setCustomTypyZasahu([]);
      setCustomSkudci("");
      setPoznamka("");
      setSelectedTechnikId(null);
      setCasOd("");
      setCasDo("");
      setDatum(toDateString(new Date()));
      setError("");
      setSuccess(false);
    }
  }, [open, preselectedKlient, preselectedObjekty]);

  // ---------------------------------------------------------------
  // Load šablony when step 2 opens
  // ---------------------------------------------------------------
  useEffect(() => {
    if (step === 2 && sablony.length === 0) {
      startTransition(async () => {
        try {
          const data = await getZakazkaSablonyAction();
          setSablony(data as Sablona[]);
        } catch {
          // Fallback — empty templates
        }
      });
    }
  }, [step, sablony.length]);

  // ---------------------------------------------------------------
  // Load technik capacity when step 3 opens or datum changes
  // ---------------------------------------------------------------
  useEffect(() => {
    if (step === 3 && datum) {
      startTransition(async () => {
        try {
          const data = await getTechnikCapacityAction(datum);
          setTechnici(data);
        } catch {
          setTechnici([]);
        }
      });
    }
  }, [step, datum]);

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------

  const handleKlientSelect = (
    klient: KlientData,
    klientObjekty: ObjektData[],
  ) => {
    setSelectedKlient(klient);
    setObjekty(klientObjekty);
    setSelectedObjektId(klientObjekty[0]?.id || null);
    setStep(2);
  };

  const handleSablonaSelect = (sablona: Sablona) => {
    setSelectedSablona(sablona);
    setPoznamka(sablona.poznamka_template || "");
    setStep(3);
  };

  const handleCustomNext = () => {
    if (customTypyZasahu.length === 0) {
      setError("Vyberte alespoň jeden typ zásahu");
      return;
    }
    setSelectedSablona(null);
    setStep(3);
  };

  const handleTechnikSelect = (
    technikId: string,
    nextSlot: { casOd: string; casDo: string } | null,
  ) => {
    setSelectedTechnikId(technikId);
    if (nextSlot) {
      setCasOd(nextSlot.casOd);
      // Default 1 hour from start, or use the slot end
      const startMinutes = timeToMinutes(nextSlot.casOd);
      const slotEnd = timeToMinutes(nextSlot.casDo);
      const defaultEnd = Math.min(startMinutes + 60, slotEnd);
      setCasDo(minutesToTime(defaultEnd));
    }
  };

  const handleSubmit = () => {
    setError("");

    if (!selectedObjektId) {
      setError("Vyberte objekt");
      return;
    }
    if (!selectedTechnikId) {
      setError("Vyberte technika");
      return;
    }
    if (!casOd || !casDo) {
      setError("Vyplňte čas od a do");
      return;
    }
    if (casOd >= casDo) {
      setError("Čas od musí být menší než čas do");
      return;
    }

    startTransition(async () => {
      try {
        const typy = selectedSablona
          ? selectedSablona.typy_zasahu
          : customTypyZasahu;
        const skudci = selectedSablona
          ? selectedSablona.skudci
          : customSkudci
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const typ = selectedSablona
          ? (selectedSablona.typ as "jednorazova" | "smluvni")
          : customTyp;

        await quickCreateZakazkaWithZasahAction({
          objekt_id: selectedObjektId!,
          typ,
          typy_zasahu: typy,
          skudci,
          poznamka: poznamka || undefined,
          technik_id: selectedTechnikId!,
          datum,
          cas_od: casOd,
          cas_do: casDo,
        });

        setSuccess(true);
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba při vytváření");
      }
    });
  };

  const goBack = () => {
    setError("");
    if (step === 3) setStep(2);
    else if (step === 2) {
      if (preselectedKlient) {
        onOpenChange(false);
      } else {
        setStep(1);
      }
    }
  };

  // ---------------------------------------------------------------
  // Available typy zasahu for custom
  // ---------------------------------------------------------------
  const typyZasahuOptions = [
    { value: "postrik", label: "Postřik" },
    { value: "vnitrni_deratizace", label: "Vnitřní deratizace" },
    { value: "vnejsi_deratizace", label: "Vnější deratizace" },
    { value: "vnitrni_dezinsekce", label: "Vnitřní dezinsekce" },
  ];

  const toggleTypZasahu = (value: string) => {
    setCustomTypyZasahu((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  };

  // ---------------------------------------------------------------
  // Get display name helper
  // ---------------------------------------------------------------
  const getKlientName = (k: KlientData) => {
    if (k.typ === "firma") return k.nazev || "Bez názvu";
    return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
  };

  const stepTitle =
    step === 1
      ? "1/3 — Klient"
      : step === 2
        ? "2/3 — Typ zásahu"
        : "3/3 — Technik a čas";

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={success ? "Hotovo!" : stepTitle}
      description={
        success
          ? "Zakázka a zásah vytvořeny"
          : step === 1
            ? "Najděte nebo vytvořte klienta"
            : step === 2
              ? `Klient: ${selectedKlient ? getKlientName(selectedKlient) : ""}`
              : `${selectedSablona?.nazev || "Vlastní"} — ${selectedKlient ? getKlientName(selectedKlient) : ""}`
      }
    >
      {/* Success state */}
      {success && (
        <div className="flex flex-col items-center py-8">
          <div className="rounded-full bg-green-100 p-4 mb-3">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-700">Vytvořeno!</p>
        </div>
      )}

      {/* Step 1: Klient search */}
      {!success && step === 1 && (
        <KlientSearch onSelect={handleKlientSelect} />
      )}

      {/* Step 2: Template / typ zasahu */}
      {!success && step === 2 && (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" /> Zpět
          </button>

          {/* Objekt selection (if multiple) */}
          {objekty.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Objekt</p>
              <div className="grid grid-cols-1 gap-1.5">
                {objekty.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedObjektId(o.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors min-h-[44px]",
                      selectedObjektId === o.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "hover:bg-accent",
                    )}
                  >
                    <p className="text-sm font-medium">{o.nazev}</p>
                    {o.adresa && (
                      <p className="text-xs text-muted-foreground">{o.adresa}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Templates grid */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Šablona</p>
            <div className="grid grid-cols-2 gap-2">
              {sablony.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSablonaSelect(s)}
                  className="flex flex-col items-center gap-1.5 p-4 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors min-h-[80px]"
                >
                  <span className="text-primary">
                    {getSablonaIcon(s.nazev)}
                  </span>
                  <span className="text-sm font-medium text-center leading-tight">
                    {s.nazev}
                  </span>
                </button>
              ))}

              {/* Custom option */}
              <button
                onClick={() => {
                  setSelectedSablona(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-4 rounded-lg border transition-colors min-h-[80px]",
                  !selectedSablona && customTypyZasahu.length > 0
                    ? "border-primary bg-primary/5"
                    : "hover:bg-accent hover:border-primary/30",
                )}
              >
                <Zap className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium text-center leading-tight">
                  Vlastní
                </span>
              </button>
            </div>
          </div>

          {/* Custom form (shown when no template selected and "Vlastní" tapped) */}
          {!selectedSablona && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium">Vlastní nastavení</p>

              {/* Typ zakazky */}
              <div className="flex gap-2">
                <button
                  onClick={() => setCustomTyp("jednorazova")}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm min-h-[44px]",
                    customTyp === "jednorazova"
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-accent",
                  )}
                >
                  Jednorázová
                </button>
                <button
                  onClick={() => setCustomTyp("smluvni")}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-sm min-h-[44px]",
                    customTyp === "smluvni"
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-accent",
                  )}
                >
                  Smluvní
                </button>
              </div>

              {/* Typy zasahu */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Typy zásahu</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {typyZasahuOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => toggleTypZasahu(opt.value)}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-xs min-h-[44px]",
                        customTypyZasahu.includes(opt.value)
                          ? "border-primary bg-primary/5 font-medium"
                          : "hover:bg-accent",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Škůdci */}
              <Input
                placeholder="Škůdci (oddělené čárkou)"
                value={customSkudci}
                onChange={(e) => setCustomSkudci(e.target.value)}
                className="min-h-[44px] text-base"
              />

              <Button
                onClick={handleCustomNext}
                className="w-full min-h-[44px]"
              >
                Pokračovat
              </Button>
            </div>
          )}

          {/* Loading indicator */}
          {isPending && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Technik + čas */}
      {!success && step === 3 && (
        <div className="space-y-4">
          {/* Back button */}
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" /> Zpět
          </button>

          {/* Datum */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Datum</p>
            <Input
              type="date"
              value={datum}
              onChange={(e) => {
                setDatum(e.target.value);
                setSelectedTechnikId(null);
                setCasOd("");
                setCasDo("");
              }}
              className="min-h-[44px] text-base"
            />
          </div>

          {/* Poznámka */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Poznámka (volitelné)</p>
            <Input
              placeholder="Poznámka k zakázce..."
              value={poznamka}
              onChange={(e) => setPoznamka(e.target.value)}
              className="min-h-[44px] text-base"
            />
          </div>

          {/* Technik selection with capacity */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Technik</p>
            {isPending ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TechnikCapacityBar
                technici={technici}
                selectedId={selectedTechnikId}
                onSelect={handleTechnikSelect}
              />
            )}
          </div>

          {/* Čas od/do */}
          {selectedTechnikId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Od</p>
                <Input
                  type="time"
                  value={casOd}
                  onChange={(e) => setCasOd(e.target.value)}
                  className="min-h-[44px] text-base"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Do</p>
                <Input
                  type="time"
                  value={casDo}
                  onChange={(e) => setCasDo(e.target.value)}
                  className="min-h-[44px] text-base"
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isPending || !selectedTechnikId || !casOd || !casDo}
            className="w-full min-h-[48px] text-base font-medium"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Vytvářím...
              </>
            ) : (
              "Vytvořit zakázku + zásah"
            )}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

// ---------------------------------------------------------------
// Helper (inline to avoid circular dep)
// ---------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
