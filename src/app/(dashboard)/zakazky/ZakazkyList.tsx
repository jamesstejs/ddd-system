"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ConfirmDeleteSheet } from "@/components/layout/ConfirmDeleteSheet";
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Loader2,
  ClipboardList,
  Building2,
  MapPin,
  Bug,
  CalendarDays,
  CreditCard,
} from "lucide-react";
import {
  createZakazkaAction,
  updateZakazkaAction,
  deleteZakazkaAction,
  getObjektyForKlientAction,
  getSkudciAction,
  getSablonyBoduAction,
} from "./actions";
import type { Tables, Database } from "@/lib/supabase/database.types";

// ----- Types -----

type Zakazka = Tables<"zakazky"> & {
  objekty: {
    id: string;
    nazev: string;
    adresa: string;
    plocha_m2: number | null;
    typ_objektu: Database["public"]["Enums"]["typ_objektu"];
    klient_id: string;
    klienti: {
      id: string;
      nazev: string;
      jmeno: string;
      prijmeni: string;
      typ: Database["public"]["Enums"]["typ_klienta"];
      ico: string | null;
    };
  };
};

type Klient = Tables<"klienti">;
type Skudce = Tables<"skudci">;
type StatusZakazky = Database["public"]["Enums"]["status_zakazky"];
type TypZakazky = Database["public"]["Enums"]["typ_zakazky"];

type StatusFilter = "all" | StatusZakazky;

// ----- Constants -----

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<StatusZakazky, string> = {
  nova: "Nová",
  aktivni: "Aktivní",
  pozastavena: "Pozastavená",
  ukoncena: "Ukončená",
};

const STATUS_COLORS: Record<StatusZakazky, string> = {
  nova: "bg-blue-100 text-blue-800",
  aktivni: "bg-green-100 text-green-800",
  pozastavena: "bg-amber-100 text-amber-800",
  ukoncena: "bg-gray-100 text-gray-800",
};

const TYP_LABELS: Record<TypZakazky, string> = {
  jednorazova: "Jednorázová",
  smluvni: "Smluvní",
};

const TYPY_ZASAHU_OPTIONS = [
  { value: "vnitrni_deratizace", label: "Vnitřní deratizace" },
  { value: "vnejsi_deratizace", label: "Vnější deratizace" },
  { value: "vnitrni_dezinsekce", label: "Vnitřní dezinsekce" },
  { value: "postrik", label: "Postřik" },
] as const;

const TYP_SKUDCE_LABELS: Record<string, string> = {
  hlodavec: "Hlodavci",
  lezouci_hmyz: "Lezoucí hmyz",
  letajici_hmyz: "Létající hmyz",
  ostatni: "Ostatní",
};

// ----- Helpers -----

function getKlientName(z: Zakazka): string {
  const k = z.objekty.klienti;
  if (k.typ === "firma") return k.nazev || "Bez názvu";
  return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
}

function getKlientDisplayName(k: Klient): string {
  if (k.typ === "firma") return k.nazev || "Bez názvu";
  return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
}

function formatTypyZasahu(typy: unknown): string {
  if (!Array.isArray(typy)) return "—";
  const labels = typy.map((t) => {
    const opt = TYPY_ZASAHU_OPTIONS.find((o) => o.value === t);
    return opt?.label || String(t);
  });
  return labels.join(", ") || "—";
}

function formatSkudci(skudci: unknown): string {
  if (!Array.isArray(skudci)) return "—";
  return (skudci as string[]).join(", ") || "—";
}

function matchesSearch(z: Zakazka, query: string): boolean {
  const q = query.toLowerCase();
  const klient = getKlientName(z);
  const objekt = z.objekty.nazev || "";
  const adresa = z.objekty.adresa || "";
  const skudciStr = formatSkudci(z.skudci);
  return [klient, objekt, adresa, skudciStr]
    .some((field) => field.toLowerCase().includes(q));
}

/**
 * Compute recommended frequency from selected škůdci.
 * Takes the minimum doporucena_cetnost_dny from all selected.
 */
function computeRecommendedCetnost(
  selectedNames: string[],
  allSkudci: Skudce[],
): number | null {
  if (selectedNames.length === 0) return null;
  const matched = allSkudci.filter((s) => selectedNames.includes(s.nazev));
  const vals = matched
    .map((s) => s.doporucena_cetnost_dny)
    .filter((v): v is number => v !== null && v > 0);
  if (vals.length === 0) return null;
  return Math.min(...vals);
}

// ----- Component -----

interface ZakazkyListProps {
  zakazky: Zakazka[];
  klienti: Klient[];
  skudci: Skudce[];
  isAdmin?: boolean;
}

export function ZakazkyList({ zakazky, klienti, skudci, isAdmin = true }: ZakazkyListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // CRUD state
  const [showCreate, setShowCreate] = useState(false);
  const [editZakazka, setEditZakazka] = useState<Zakazka | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Zakazka | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create form multi-step state
  const [selectedKlientId, setSelectedKlientId] = useState<string>("");
  const [objektyList, setObjektyList] = useState<
    { id: string; nazev: string; adresa: string; plocha_m2: number | null; typ_objektu: string }[]
  >([]);
  const [objektyLoading, setObjektyLoading] = useState(false);
  const [selectedObjektId, setSelectedObjektId] = useState<string>("");
  const [selectedTyp, setSelectedTyp] = useState<TypZakazky>("jednorazova");
  const [selectedTypyZasahu, setSelectedTypyZasahu] = useState<string[]>([]);
  const [selectedSkudciNames, setSelectedSkudciNames] = useState<string[]>([]);
  const [recommendedCetnost, setRecommendedCetnost] = useState<number | null>(null);

  // Filtered/searched list
  const filtered = useMemo(() => {
    let result = zakazky;
    if (statusFilter !== "all") {
      result = result.filter((z) => z.status === statusFilter);
    }
    if (search.trim()) {
      result = result.filter((z) => matchesSearch(z, search.trim()));
    }
    return result;
  }, [zakazky, statusFilter, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // ----- Handlers -----

  async function handleKlientChange(klientId: string) {
    setSelectedKlientId(klientId);
    setSelectedObjektId("");
    setObjektyList([]);

    if (!klientId) return;

    setObjektyLoading(true);
    try {
      const objekty = await getObjektyForKlientAction(klientId);
      setObjektyList(objekty);
    } catch {
      setError("Chyba při načítání objektů");
    } finally {
      setObjektyLoading(false);
    }
  }

  function handleTypZasahuToggle(value: string) {
    setSelectedTypyZasahu((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value],
    );
  }

  function handleSkudceToggle(nazev: string) {
    setSelectedSkudciNames((prev) => {
      const next = prev.includes(nazev)
        ? prev.filter((n) => n !== nazev)
        : [...prev, nazev];
      // Auto-recommend cetnost
      setRecommendedCetnost(computeRecommendedCetnost(next, skudci));
      return next;
    });
  }

  function resetCreateForm() {
    setSelectedKlientId("");
    setObjektyList([]);
    setSelectedObjektId("");
    setSelectedTyp("jednorazova");
    setSelectedTypyZasahu([]);
    setSelectedSkudciNames([]);
    setRecommendedCetnost(null);
    setError(null);
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!selectedObjektId) {
      setError("Vyberte objekt");
      return;
    }
    if (selectedTypyZasahu.length === 0) {
      setError("Vyberte alespoň jeden typ zásahu");
      return;
    }

    const form = new FormData(e.currentTarget);
    const cetnostDny = form.get("cetnost_dny")
      ? Number(form.get("cetnost_dny"))
      : null;
    const pocetNavstev = cetnostDny && cetnostDny > 0
      ? Math.round(365 / cetnostDny)
      : null;

    startTransition(async () => {
      try {
        await createZakazkaAction({
          objekt_id: selectedObjektId,
          typ: selectedTyp,
          status: "nova",
          typy_zasahu: selectedTypyZasahu,
          skudci: selectedSkudciNames,
          cetnost_dny: cetnostDny,
          pocet_navstev_rocne: pocetNavstev,
          platnost_do: (form.get("platnost_do") as string) || null,
          platba_predem: form.get("platba_predem") === "on",
          poznamka: (form.get("poznamka") as string) || null,
        });
        setShowCreate(false);
        resetCreateForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při vytváření");
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editZakazka) return;
    setError(null);

    const form = new FormData(e.currentTarget);
    const cetnostDny = form.get("cetnost_dny")
      ? Number(form.get("cetnost_dny"))
      : null;
    const pocetNavstev = cetnostDny && cetnostDny > 0
      ? Math.round(365 / cetnostDny)
      : null;

    startTransition(async () => {
      try {
        await updateZakazkaAction(editZakazka.id, {
          typ: form.get("typ") as TypZakazky,
          status: form.get("status") as StatusZakazky,
          cetnost_dny: cetnostDny,
          pocet_navstev_rocne: pocetNavstev,
          platnost_do: (form.get("platnost_do") as string) || null,
          platba_predem: form.get("platba_predem") === "on",
          poznamka: (form.get("poznamka") as string) || null,
        });
        setEditZakazka(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při ukládání");
      }
    });
  }

  function handleDelete() {
    if (!deleteConfirm) return;
    startTransition(async () => {
      try {
        await deleteZakazkaAction(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při mazání");
      }
    });
  }

  // Grouped škůdci by type
  const skudciGrouped = useMemo(() => {
    const groups: Record<string, Skudce[]> = {};
    for (const s of skudci) {
      const key = s.typ || "ostatni";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [skudci]);

  // ----- Render -----

  return (
    <div className="space-y-4">
      {/* Header */}
      {isAdmin && (
        <div className="flex items-center justify-between">
          <div />
          <Button
            onClick={() => {
              resetCreateForm();
              setShowCreate(true);
            }}
            size="sm"
            className="min-h-[44px] gap-2"
          >
            <Plus className="size-4" />
            Nová zakázka
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat zakázku..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="min-h-[44px] pl-9"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "nova", "aktivni", "pozastavena", "ukoncena"] as StatusFilter[]).map(
          (s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-sm transition-colors ${
                statusFilter === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Všechny" : STATUS_LABELS[s]}
            </button>
          ),
        )}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length}{" "}
        {filtered.length === 1
          ? "zakázka"
          : filtered.length >= 2 && filtered.length <= 4
            ? "zakázky"
            : "zakázek"}
      </p>

      {/* List */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {zakazky.length === 0
                ? "Zatím žádné zakázky"
                : "Žádné zakázky neodpovídají filtru"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((z) => (
            <Link key={z.id} href={`/zakazky/${z.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-start justify-between pt-4 pb-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Klient name */}
                    <p className="truncate font-medium">{getKlientName(z)}</p>

                    {/* Object */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">
                        {z.objekty.nazev || z.objekty.adresa || "Bez objektu"}
                      </span>
                    </div>

                    {/* Typy zasahu */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Bug className="size-3 shrink-0" />
                      <span className="truncate">{formatTypyZasahu(z.typy_zasahu)}</span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[z.status]}`}
                      >
                        {STATUS_LABELS[z.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {TYP_LABELS[z.typ]}
                      </Badge>
                      {z.platba_predem && (
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800">
                          <CreditCard className="mr-1 size-3" />
                          Předem
                        </Badge>
                      )}
                      {z.cetnost_dny && (
                        <Badge variant="outline" className="text-xs">
                          <CalendarDays className="mr-1 size-3" />
                          {z.cetnost_dny}d
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions (admin only) */}
                  {isAdmin && (
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditZakazka(z);
                          setError(null);
                        }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteConfirm(z);
                        }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="min-h-[44px] w-full"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Zobrazit další ({filtered.length - visibleCount} zbývá)
        </Button>
      )}

      {/* ========== CREATE BOTTOMSHEET ========== */}
      <BottomSheet
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) resetCreateForm();
          setShowCreate(open);
        }}
        title="Nová zakázka"
        description="Vytvořte novou zakázku na objektu"
      >
        <form onSubmit={handleCreate} className="space-y-5">
          {/* 1. Select Klient */}
          <div className="space-y-2">
            <Label htmlFor="create_klient">Klient *</Label>
            <select
              id="create_klient"
              value={selectedKlientId}
              onChange={(e) => handleKlientChange(e.target.value)}
              className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Vyberte klienta —</option>
              {klienti.map((k) => (
                <option key={k.id} value={k.id}>
                  {getKlientDisplayName(k)}
                  {k.ico ? ` (IČO: ${k.ico})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Objekt */}
          {selectedKlientId && (
            <div className="space-y-2">
              <Label htmlFor="create_objekt">Objekt *</Label>
              {objektyLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Načítám objekty...
                </div>
              ) : objektyList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Klient nemá žádné objekty.{" "}
                  <Link href={`/klienti/${selectedKlientId}`} className="underline text-primary">
                    Přidat objekt
                  </Link>
                </p>
              ) : (
                <select
                  id="create_objekt"
                  value={selectedObjektId}
                  onChange={(e) => setSelectedObjektId(e.target.value)}
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Vyberte objekt —</option>
                  {objektyList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nazev || o.adresa}
                      {o.plocha_m2 ? ` (${o.plocha_m2} m²)` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* 3. Typ zakázky */}
          {selectedObjektId && (
            <>
              <div className="space-y-2">
                <Label>Typ zakázky</Label>
                <div className="flex gap-2">
                  {(["jednorazova", "smluvni"] as TypZakazky[]).map((t) => (
                    <label
                      key={t}
                      className={`flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
                        selectedTyp === t
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      <input
                        type="radio"
                        name="typ"
                        value={t}
                        checked={selectedTyp === t}
                        onChange={() => setSelectedTyp(t)}
                        className="sr-only"
                      />
                      {TYP_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Typy zásahu */}
              <div className="space-y-2">
                <Label>Typy zásahu *</Label>
                <div className="flex flex-wrap gap-2">
                  {TYPY_ZASAHU_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypZasahuToggle(opt.value)}
                      className={`flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
                        selectedTypyZasahu.includes(opt.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Škůdci */}
              <div className="space-y-2">
                <Label>Škůdci</Label>
                <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border p-3">
                  {Object.entries(skudciGrouped).map(([typ, items]) => (
                    <div key={typ}>
                      <p className="mb-1 text-sm font-semibold uppercase text-muted-foreground">
                        {TYP_SKUDCE_LABELS[typ] || typ}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleSkudceToggle(s.nazev)}
                            className={`min-h-[44px] rounded-full border px-3 py-2 text-sm transition-colors ${
                              selectedSkudciNames.includes(s.nazev)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {s.nazev}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSkudciNames.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Vybráno: {selectedSkudciNames.join(", ")}
                  </p>
                )}
              </div>

              {/* 6. Četnost + auto-doporučení */}
              <div className="space-y-2">
                <Label htmlFor="create_cetnost">Četnost návštěv (dny)</Label>
                <Input
                  id="create_cetnost"
                  name="cetnost_dny"
                  type="number"
                  min={1}
                  defaultValue={recommendedCetnost ?? ""}
                  key={recommendedCetnost}
                  placeholder="např. 30"
                />
                {recommendedCetnost && (
                  <p className="text-xs text-green-600">
                    💡 Doporučená četnost dle škůdců: každých {recommendedCetnost} dní
                  </p>
                )}
              </div>

              {/* 7. Platnost do (smluvní) */}
              {selectedTyp === "smluvni" && (
                <div className="space-y-2">
                  <Label htmlFor="create_platnost">Platnost do</Label>
                  <Input
                    id="create_platnost"
                    name="platnost_do"
                    type="date"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ponechte prázdné pro neomezenou platnost
                  </p>
                </div>
              )}

              {/* 8. Platba předem */}
              <label className="flex min-h-[44px] items-center gap-3">
                <input
                  type="checkbox"
                  name="platba_predem"
                  className="size-5"
                />
                <span className="text-sm">Platba předem (QR)</span>
              </label>

              {/* 9. Poznámka */}
              <div className="space-y-2">
                <Label htmlFor="create_poznamka">Poznámka</Label>
                <textarea
                  id="create_poznamka"
                  name="poznamka"
                  rows={2}
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {selectedObjektId && (
            <Button
              type="submit"
              className="min-h-[44px] w-full"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Vytvářím...
                </>
              ) : (
                "Vytvořit zakázku"
              )}
            </Button>
          )}
        </form>
      </BottomSheet>

      {/* ========== EDIT BOTTOMSHEET ========== */}
      <BottomSheet
        open={!!editZakazka}
        onOpenChange={(open) => !open && setEditZakazka(null)}
        title="Upravit zakázku"
        description={editZakazka ? getKlientName(editZakazka) : ""}
      >
        {editZakazka && (
          <form onSubmit={handleEdit} className="space-y-4">
            {/* Info (read-only) */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="font-medium">{getKlientName(editZakazka)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-muted-foreground" />
                <span>{editZakazka.objekty.nazev || editZakazka.objekty.adresa}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClipboardList className="size-3.5 text-muted-foreground" />
                <span>{formatTypyZasahu(editZakazka.typy_zasahu)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bug className="size-3.5 text-muted-foreground" />
                <span>{formatSkudci(editZakazka.skudci)}</span>
              </div>
            </div>

            {/* Typ */}
            <div className="space-y-2">
              <Label>Typ zakázky</Label>
              <div className="flex gap-2">
                {(["jednorazova", "smluvni"] as TypZakazky[]).map((t) => (
                  <label
                    key={t}
                    className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
                  >
                    <input
                      type="radio"
                      name="typ"
                      value={t}
                      defaultChecked={editZakazka.typ === t}
                      className="sr-only"
                    />
                    {TYP_LABELS[t]}
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit_status">Status</Label>
              <select
                id="edit_status"
                name="status"
                defaultValue={editZakazka.status}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {(
                  Object.entries(STATUS_LABELS) as [StatusZakazky, string][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Četnost */}
            <div className="space-y-2">
              <Label htmlFor="edit_cetnost">Četnost návštěv (dny)</Label>
              <Input
                id="edit_cetnost"
                name="cetnost_dny"
                type="number"
                min={1}
                defaultValue={editZakazka.cetnost_dny ?? ""}
              />
            </div>

            {/* Platnost do */}
            <div className="space-y-2">
              <Label htmlFor="edit_platnost">Platnost do</Label>
              <Input
                id="edit_platnost"
                name="platnost_do"
                type="date"
                defaultValue={editZakazka.platnost_do ?? ""}
              />
            </div>

            {/* Platba předem */}
            <label className="flex min-h-[44px] items-center gap-3">
              <input
                type="checkbox"
                name="platba_predem"
                className="size-5"
                defaultChecked={editZakazka.platba_predem}
              />
              <span className="text-sm">Platba předem (QR)</span>
            </label>

            {/* Poznámka */}
            <div className="space-y-2">
              <Label htmlFor="edit_poznamka">Poznámka</Label>
              <textarea
                id="edit_poznamka"
                name="poznamka"
                rows={2}
                defaultValue={editZakazka.poznamka || ""}
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              className="min-h-[44px] w-full"
              disabled={isPending}
            >
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>

      {/* ========== DELETE CONFIRM ========== */}
      <ConfirmDeleteSheet
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Smazat zakázku?"
        description={
          <>
            Opravdu chcete smazat zakázku pro{" "}
            <strong>{deleteConfirm ? getKlientName(deleteConfirm) : ""}</strong>
            {deleteConfirm
              ? ` — ${deleteConfirm.objekty.nazev || deleteConfirm.objekty.adresa}`
              : ""}
            ? Zakázka bude deaktivována.
          </>
        }
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
