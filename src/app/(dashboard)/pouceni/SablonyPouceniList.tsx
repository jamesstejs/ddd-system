"use client";

import { useState, useMemo, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ConfirmDeleteSheet } from "@/components/layout/ConfirmDeleteSheet";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import {
  createSablonaAction,
  updateSablonaAction,
  deleteSablonaAction,
} from "./actions";

type SablonaPouceni = Database["public"]["Tables"]["sablony_pouceni"]["Row"];
type Skudce = Database["public"]["Tables"]["skudci"]["Row"];

// Rozšířený typ s joinem
type SablonaWithSkudce = SablonaPouceni & {
  skudci: { nazev: string } | null;
};

// --- Konstanty ---

const TYP_ZASAHU_OPTIONS = [
  { value: "deratizace", label: "Deratizace" },
  { value: "dezinsekce", label: "Dezinsekce" },
  { value: "postrik", label: "Postřik" },
  { value: "dezinfekce", label: "Dezinfekce" },
  { value: "obecne", label: "Obecné" },
];

const TYP_ZASAHU_LABELS: Record<string, string> = {
  deratizace: "Deratizace",
  dezinsekce: "Dezinsekce",
  postrik: "Postřik",
  dezinfekce: "Dezinfekce",
  obecne: "Obecné",
};

const TYP_ZASAHU_COLORS: Record<string, string> = {
  deratizace: "bg-red-100 text-red-800",
  dezinsekce: "bg-blue-100 text-blue-800",
  postrik: "bg-amber-100 text-amber-800",
  dezinfekce: "bg-emerald-100 text-emerald-800",
  obecne: "bg-gray-100 text-gray-800",
};

// --- Komponent ---

interface SablonyPouceniListProps {
  sablony: SablonaWithSkudce[];
  skudci: Skudce[];
  isAdmin: boolean;
}

export default function SablonyPouceniList({
  sablony,
  skudci,
  isAdmin,
}: SablonyPouceniListProps) {
  const [search, setSearch] = useState("");
  const [filterTyp, setFilterTyp] = useState<string>("all");

  // CRUD state
  const [editItem, setEditItem] = useState<SablonaWithSkudce | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<SablonaWithSkudce | null>(null);

  const filtered = useMemo(() => {
    let result = sablony;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.nazev.toLowerCase().includes(q) ||
          s.obsah.toLowerCase().includes(q) ||
          s.skudci?.nazev?.toLowerCase().includes(q),
      );
    }

    if (filterTyp !== "all") {
      result = result.filter((s) => s.typ_zasahu === filterTyp);
    }

    return result;
  }, [sablony, search, filterTyp]);

  const countText = `${filtered.length} ${
    filtered.length === 1
      ? "šablona"
      : filtered.length < 5
        ? "šablony"
        : "šablon"
  }`;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat šablonu, obsah, škůdce..."
          className="min-h-[44px] pl-10 text-base"
        />
      </div>

      {/* Filtry dle typu zásahu */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterTyp === "all" ? "default" : "outline"}
          size="sm"
          className="min-h-[36px]"
          onClick={() => setFilterTyp("all")}
        >
          Vše
        </Button>
        {TYP_ZASAHU_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filterTyp === opt.value ? "default" : "outline"}
            size="sm"
            className="min-h-[36px]"
            onClick={() => setFilterTyp(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Počet + přidat */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{countText}</p>
        {isAdmin && (
          <Button
            size="sm"
            className="min-h-[44px] gap-1"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Přidat
          </Button>
        )}
      </div>

      {/* Seznam */}
      <div className="space-y-3">
        {filtered.map((s) => (
          <Card
            key={s.id}
            className={!s.aktivni ? "opacity-60" : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium leading-tight">{s.nazev}</p>
                    <div className="flex flex-wrap gap-1">
                      {s.typ_zasahu && (
                        <Badge
                          className={TYP_ZASAHU_COLORS[s.typ_zasahu] || ""}
                          variant="secondary"
                        >
                          {TYP_ZASAHU_LABELS[s.typ_zasahu] || s.typ_zasahu}
                        </Badge>
                      )}
                      {s.skudci?.nazev && (
                        <Badge variant="outline" className="text-xs">
                          {s.skudci.nazev}
                        </Badge>
                      )}
                      {!s.aktivni && (
                        <Badge variant="secondary" className="text-xs">
                          Neaktivní
                        </Badge>
                      )}
                    </div>
                    {/* Preview obsahu — max 2 řádky */}
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {s.obsah}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex flex-shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      aria-label={`Upravit ${s.nazev}`}
                      onClick={() => setEditItem(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive"
                      aria-label={`Smazat ${s.nazev}`}
                      onClick={() => setDeleteItem(s)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {search || filterTyp !== "all"
              ? "Žádné šablony neodpovídají filtru"
              : "Zatím žádné šablony poučení"}
          </p>
        )}
      </div>

      {/* Create / Edit / Delete */}
      {isAdmin && (
        <>
          <SablonaFormSheet
            open={createOpen}
            onOpenChange={setCreateOpen}
            sablona={null}
            skudci={skudci}
          />
          <SablonaFormSheet
            open={!!editItem}
            onOpenChange={(open) => !open && setEditItem(null)}
            sablona={editItem}
            skudci={skudci}
          />
          <ConfirmDeleteSheet
            open={!!deleteItem}
            onOpenChange={(open) => !open && setDeleteItem(null)}
            title="Smazat šablonu"
            description={`Opravdu chcete smazat šablonu "${deleteItem?.nazev}"?`}
            onConfirm={async () => {
              if (deleteItem) {
                await deleteSablonaAction(deleteItem.id);
                setDeleteItem(null);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

// --- Form Sheet ---

function SablonaFormSheet({
  open,
  onOpenChange,
  sablona,
  skudci,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sablona: SablonaWithSkudce | null;
  skudci: Skudce[];
}) {
  const isEdit = !!sablona;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [nazev, setNazev] = useState("");
  const [typZasahu, setTypZasahu] = useState("");
  const [skudceId, setSkudceId] = useState("");
  const [obsah, setObsah] = useState("");
  const [aktivni, setAktivni] = useState(true);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (sablona) {
        setNazev(sablona.nazev);
        setTypZasahu(sablona.typ_zasahu || "");
        setSkudceId(sablona.skudce_id || "");
        setObsah(sablona.obsah);
        setAktivni(sablona.aktivni);
      } else {
        setNazev("");
        setTypZasahu("");
        setSkudceId("");
        setObsah("");
        setAktivni(true);
      }
      setError(null);
    }
    onOpenChange(newOpen);
  };

  function handleSubmit() {
    if (!nazev.trim()) {
      setError("Název je povinný");
      return;
    }
    if (!obsah.trim()) {
      setError("Text poučení je povinný");
      return;
    }

    const data = {
      nazev: nazev.trim(),
      typ_zasahu: typZasahu || null,
      skudce_id: skudceId || null,
      obsah: obsah.trim(),
      aktivni,
    };

    startTransition(async () => {
      try {
        if (isEdit && sablona) {
          await updateSablonaAction(sablona.id, data);
        } else {
          await createSablonaAction(data);
        }
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba při ukládání");
      }
    });
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={isEdit ? "Upravit šablonu" : "Nová šablona"}
    >
      <div className="space-y-4 pb-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Název */}
        <div>
          <Label htmlFor="sablona-nazev">Název *</Label>
          <Input
            id="sablona-nazev"
            value={nazev}
            onChange={(e) => setNazev(e.target.value)}
            placeholder="Název šablony poučení"
            className="min-h-[44px] text-base"
          />
        </div>

        {/* Typ zásahu */}
        <div>
          <Label htmlFor="sablona-typ">Typ zásahu</Label>
          <select
            id="sablona-typ"
            value={typZasahu}
            onChange={(e) => setTypZasahu(e.target.value)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Nespecifikováno —</option>
            {TYP_ZASAHU_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Škůdce */}
        <div>
          <Label htmlFor="sablona-skudce">Škůdce</Label>
          <select
            id="sablona-skudce"
            value={skudceId}
            onChange={(e) => setSkudceId(e.target.value)}
            className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">— Bez škůdce (obecné) —</option>
            {skudci.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nazev}
              </option>
            ))}
          </select>
        </div>

        {/* Obsah — textarea */}
        <div>
          <Label htmlFor="sablona-obsah">Text poučení *</Label>
          <textarea
            id="sablona-obsah"
            value={obsah}
            onChange={(e) => setObsah(e.target.value)}
            placeholder="Plný text poučení pro klienta..."
            rows={6}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Aktivní */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sablona-aktivni"
            checked={aktivni}
            onChange={(e) => setAktivni(e.target.checked)}
            className="h-5 w-5"
          />
          <Label htmlFor="sablona-aktivni" className="cursor-pointer">
            Aktivní šablona
          </Label>
        </div>

        {/* Tlačítka */}
        <div className="space-y-2 pt-2">
          <Button
            className="min-h-[44px] w-full"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? "Ukládám..."
              : isEdit
                ? "Uložit změny"
                : "Vytvořit šablonu"}
          </Button>
          <Button
            variant="outline"
            className="min-h-[44px] w-full"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Zrušit
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
