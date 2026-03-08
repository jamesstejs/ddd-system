"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createSablonAction,
  updateSablonAction,
  deleteSablonAction,
} from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import type { Database } from "@/lib/supabase/database.types";

type Sablona = Tables<"sablony_bodu">;
type TypObjektu = Database["public"]["Enums"]["typ_objektu"];
type TypZasahu = Database["public"]["Enums"]["typ_zasahu_kalkulacka"];

const TYP_OBJEKTU_LABELS: Record<TypObjektu, string> = {
  gastro: "Gastro",
  sklad_nevyzivocisna: "Sklad (neživočišný)",
  sklad_zivocisna: "Sklad (živočišný)",
  domacnost: "Domácnost",
  kancelar: "Kancelář",
  skola: "Škola",
  hotel: "Hotel",
  nemocnice: "Nemocnice",
  ubytovna: "Ubytovna",
  vyrobni_hala: "Výrobní hala",
  jiny: "Jiný",
};

const TYP_ZASAHU_LABELS: Record<TypZasahu, string> = {
  vnitrni_deratizace: "Vnitřní deratizace",
  vnejsi_deratizace: "Vnější deratizace",
  vnitrni_dezinsekce: "Vnitřní dezinsekce",
  postrik: "Postřik",
};

// Only show types that have/can have templates
const TYP_OBJEKTU_OPTIONS = Object.entries(TYP_OBJEKTU_LABELS) as [TypObjektu, string][];
const TYP_ZASAHU_OPTIONS = Object.entries(TYP_ZASAHU_LABELS) as [TypZasahu, string][];

export function SablonyBoduAdmin({ sablony }: { sablony: Sablona[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterObjekt, setFilterObjekt] = useState<TypObjektu | "all">("all");
  const [filterZasah, setFilterZasah] = useState<TypZasahu | "all">("all");

  // CRUD state
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Sablona | null>(null);
  const [deleteItem, setDeleteItem] = useState<Sablona | null>(null);

  // Filtered data
  const filtered = useMemo(() => {
    return sablony.filter((s) => {
      if (filterObjekt !== "all" && s.typ_objektu !== filterObjekt) return false;
      if (filterZasah !== "all" && s.typ_zasahu !== filterZasah) return false;
      return true;
    });
  }, [sablony, filterObjekt, filterZasah]);

  // Group by typ_objektu + typ_zasahu
  const grouped = useMemo(() => {
    const map = new Map<string, Sablona[]>();
    for (const s of filtered) {
      const key = `${s.typ_objektu}|${s.typ_zasahu}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [filtered]);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createSablonAction({
          typ_objektu: form.get("typ_objektu") as TypObjektu,
          typ_zasahu: form.get("typ_zasahu") as TypZasahu,
          rozsah_m2_od: Number(form.get("rozsah_m2_od")) || 0,
          rozsah_m2_do: form.get("rozsah_m2_do")
            ? Number(form.get("rozsah_m2_do"))
            : null,
          bod_s_mys: Number(form.get("bod_s_mys")) || 0,
          bod_l_potkan: Number(form.get("bod_l_potkan")) || 0,
          zivolovna: Number(form.get("zivolovna")) || 0,
          letajici: Number(form.get("letajici")) || 0,
          lezouci: Number(form.get("lezouci")) || 0,
        });
        setShowCreate(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    setError(null);
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateSablonAction(editItem.id, {
          rozsah_m2_od: Number(form.get("rozsah_m2_od")) || 0,
          rozsah_m2_do: form.get("rozsah_m2_do")
            ? Number(form.get("rozsah_m2_do"))
            : null,
          bod_s_mys: Number(form.get("bod_s_mys")) || 0,
          bod_l_potkan: Number(form.get("bod_l_potkan")) || 0,
          zivolovna: Number(form.get("zivolovna")) || 0,
          letajici: Number(form.get("letajici")) || 0,
          lezouci: Number(form.get("lezouci")) || 0,
        });
        setEditItem(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDelete() {
    if (!deleteItem) return;
    startTransition(async () => {
      try {
        await deleteSablonAction(deleteItem.id);
        setDeleteItem(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/nastaveni">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Šablony bodů</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-2">
            <Label>Typ objektu</Label>
            <Select
              value={filterObjekt}
              onValueChange={(v) => setFilterObjekt(v as TypObjektu | "all")}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny typy</SelectItem>
                {TYP_OBJEKTU_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Typ zásahu</Label>
            <Select
              value={filterZasah}
              onValueChange={(v) => setFilterZasah(v as TypZasahu | "all")}
            >
              <SelectTrigger className="min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny zásahy</SelectItem>
                {TYP_ZASAHU_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Add button */}
      <Button
        className="w-full min-h-[44px] gap-2"
        onClick={() => { setShowCreate(true); setError(null); }}
      >
        <Plus className="size-4" />
        Přidat šablonu
      </Button>

      {/* Template list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground text-sm">
              Žádné šablony
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(grouped.entries()).map(([key, items]) => {
          const [typObj, typZas] = key.split("|") as [TypObjektu, TypZasahu];
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{TYP_OBJEKTU_LABELS[typObj]}</Badge>
                  <Badge variant="secondary">{TYP_ZASAHU_LABELS[typZas]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items
                  .sort((a, b) => a.rozsah_m2_od - b.rozsah_m2_od)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {item.rozsah_m2_od}–{item.rozsah_m2_do ?? "∞"} m²
                          {item.vzorec_nad_max && (
                            <span className="text-xs text-muted-foreground ml-1">(vzorec)</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.bod_s_mys > 0 && (
                            <Badge variant="outline" className="text-xs">S:{item.bod_s_mys}</Badge>
                          )}
                          {item.bod_l_potkan > 0 && (
                            <Badge variant="outline" className="text-xs">L:{item.bod_l_potkan}</Badge>
                          )}
                          {item.zivolovna > 0 && (
                            <Badge variant="outline" className="text-xs">Živ:{item.zivolovna}</Badge>
                          )}
                          {item.letajici > 0 && (
                            <Badge variant="outline" className="text-xs">Lét:{item.letajici}</Badge>
                          )}
                          {item.lezouci > 0 && (
                            <Badge variant="outline" className="text-xs">Lez:{item.lezouci}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => { setEditItem(item); setError(null); }}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteItem(item)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          );
        })
      )}

      <p className="text-xs text-muted-foreground text-center">
        Celkem {filtered.length} šablon
      </p>

      {/* Create BottomSheet */}
      <BottomSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Nová šablona"
        description="Přidejte rozsah a počty bodů"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-typ-objektu">Typ objektu *</Label>
            <select
              id="new-typ-objektu"
              name="typ_objektu"
              required
              className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TYP_OBJEKTU_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-typ-zasahu">Typ zásahu *</Label>
            <select
              id="new-typ-zasahu"
              name="typ_zasahu"
              required
              className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TYP_ZASAHU_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-od">Od m² *</Label>
              <Input id="new-od" name="rozsah_m2_od" type="number" min="0" required className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-do">Do m²</Label>
              <Input id="new-do" name="rozsah_m2_do" type="number" min="0" placeholder="∞" className="min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-mys">Bod S (myš)</Label>
              <Input id="new-mys" name="bod_s_mys" type="number" min="0" defaultValue="0" className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-potkan">Bod L (potkan)</Label>
              <Input id="new-potkan" name="bod_l_potkan" type="number" min="0" defaultValue="0" className="min-h-[44px]" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-ziv">Živolovná</Label>
              <Input id="new-ziv" name="zivolovna" type="number" min="0" defaultValue="0" className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-let">Létající</Label>
              <Input id="new-let" name="letajici" type="number" min="0" defaultValue="0" className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-lez">Lezoucí</Label>
              <Input id="new-lez" name="lezouci" type="number" min="0" defaultValue="0" className="min-h-[44px]" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
            {isPending ? "Ukládám..." : "Vytvořit"}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit BottomSheet */}
      <BottomSheet
        open={!!editItem}
        onOpenChange={(open) => { if (!open) setEditItem(null); }}
        title="Upravit šablonu"
        description={editItem ? `${TYP_OBJEKTU_LABELS[editItem.typ_objektu]} — ${TYP_ZASAHU_LABELS[editItem.typ_zasahu]}` : ""}
      >
        {editItem && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-od">Od m² *</Label>
                <Input
                  id="edit-od"
                  name="rozsah_m2_od"
                  type="number"
                  min="0"
                  required
                  defaultValue={editItem.rozsah_m2_od}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-do">Do m²</Label>
                <Input
                  id="edit-do"
                  name="rozsah_m2_do"
                  type="number"
                  min="0"
                  placeholder="∞"
                  defaultValue={editItem.rozsah_m2_do ?? ""}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-mys">Bod S (myš)</Label>
                <Input id="edit-mys" name="bod_s_mys" type="number" min="0" defaultValue={editItem.bod_s_mys} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-potkan">Bod L (potkan)</Label>
                <Input id="edit-potkan" name="bod_l_potkan" type="number" min="0" defaultValue={editItem.bod_l_potkan} className="min-h-[44px]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-ziv">Živolovná</Label>
                <Input id="edit-ziv" name="zivolovna" type="number" min="0" defaultValue={editItem.zivolovna} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-let">Létající</Label>
                <Input id="edit-let" name="letajici" type="number" min="0" defaultValue={editItem.letajici} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lez">Lezoucí</Label>
                <Input id="edit-lez" name="lezouci" type="number" min="0" defaultValue={editItem.lezouci} className="min-h-[44px]" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>

      {/* Delete Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => { if (!open) setDeleteItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat šablonu?</DialogTitle>
            <DialogDescription>
              {deleteItem && (
                <>
                  {TYP_OBJEKTU_LABELS[deleteItem.typ_objektu]} — {TYP_ZASAHU_LABELS[deleteItem.typ_zasahu]},{" "}
                  {deleteItem.rozsah_m2_od}–{deleteItem.rozsah_m2_do ?? "∞"} m²
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setDeleteItem(null)}
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px]"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
