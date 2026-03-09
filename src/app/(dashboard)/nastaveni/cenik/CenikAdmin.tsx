"use client";

import { useState, useTransition } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/layout/BottomSheet";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/lib/supabase/database.types";
import {
  updateObecneAction,
  createPostrikyAction,
  updatePostrikyAction,
  deletePostrikyAction,
  createGelyAction,
  updateGelyAction,
  deleteGelyAction,
  createSpecialniAction,
  updateSpecialniAction,
  deleteSpecialniAction,
  createDeratizaceAction,
  updateDeratizaceAction,
  deleteDeratizaceAction,
  createDezinfekceAction,
  updateDezinfekceAction,
  deleteDezinfekceAction,
} from "./actions";

type CenikObecne = Tables<"cenik_obecne">;
type CenikPostriky = Tables<"cenik_postriky">;
type CenikGely = Tables<"cenik_gely">;
type CenikSpecialni = Tables<"cenik_specialni">;
type CenikDeratizace = Tables<"cenik_deratizace">;
type CenikDezinfekce = Tables<"cenik_dezinfekce">;

type TabKey = "obecne" | "postriky" | "gely" | "specialni" | "deratizace" | "dezinfekce";

const TAB_LABELS: Record<TabKey, string> = {
  obecne: "Obecné",
  postriky: "Postřiky",
  gely: "Gely",
  specialni: "Speciální",
  deratizace: "Deratizace",
  dezinfekce: "Dezinfekce",
};

const KATEGORIE_POSTRIKY_LABELS: Record<string, string> = {
  stenice_blechy: "Štěnice / Blechy",
  moli_rybenky: "Moli / Rybenky",
  preventivni: "Preventivní",
};

const KATEGORIE_GELY_LABELS: Record<string, string> = {
  rusi_svabi_1: "Rusi/Švábi (1 zásah)",
  rusi_svabi_2: "Rusi/Švábi (2 zásahy)",
  mravenci_1: "Mravenci faraón (1 zásah)",
};

const OBECNE_LABELS: Record<string, string> = {
  vyjezd: "Výjezd",
  marny_vyjezd: "Marný výjezd",
  doprava_km: "Doprava",
  vikend_priplatek: "Víkendový příplatek",
  nocni_priplatek: "Noční příplatek",
  minimalni_cena: "Minimální cena",
};

const TYP_DEZINFEKCE_LABELS: Record<string, string> = {
  postrik: "Postřik (Kč/m²)",
  aerosol: "Aerosol (Kč/m³)",
};

interface Props {
  obecne: CenikObecne[];
  postriky: CenikPostriky[];
  gely: CenikGely[];
  specialni: CenikSpecialni[];
  deratizace: CenikDeratizace[];
  dezinfekce: CenikDezinfekce[];
}

export function CenikAdmin({
  obecne,
  postriky,
  gely,
  specialni,
  deratizace,
  dezinfekce,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("obecne");

  // Edit/Create/Delete state — generic
  const [editObecne, setEditObecne] = useState<CenikObecne | null>(null);
  const [showCreatePostriky, setShowCreatePostriky] = useState(false);
  const [editPostriky, setEditPostriky] = useState<CenikPostriky | null>(null);
  const [deletePostriky, setDeletePostriky] = useState<CenikPostriky | null>(null);
  const [showCreateGely, setShowCreateGely] = useState(false);
  const [editGely, setEditGely] = useState<CenikGely | null>(null);
  const [deleteGely, setDeleteGely] = useState<CenikGely | null>(null);
  const [showCreateSpecialni, setShowCreateSpecialni] = useState(false);
  const [editSpecialni, setEditSpecialni] = useState<CenikSpecialni | null>(null);
  const [deleteSpecialni, setDeleteSpecialni] = useState<CenikSpecialni | null>(null);
  const [showCreateDeratizace, setShowCreateDeratizace] = useState(false);
  const [editDeratizace, setEditDeratizace] = useState<CenikDeratizace | null>(null);
  const [deleteDeratizace, setDeleteDeratizace] = useState<CenikDeratizace | null>(null);
  const [showCreateDezinfekce, setShowCreateDezinfekce] = useState(false);
  const [editDezinfekce, setEditDezinfekce] = useState<CenikDezinfekce | null>(null);
  const [deleteDezinfekce, setDeleteDezinfekce] = useState<CenikDezinfekce | null>(null);

  function refresh() {
    router.refresh();
  }

  // =====================================================
  // Obecné handlers
  // =====================================================
  function handleEditObecne(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editObecne) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateObecneAction(editObecne.id, {
          hodnota: Number(form.get("hodnota")),
          poznamka: (form.get("poznamka") as string) || null,
        });
        setEditObecne(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // =====================================================
  // Postriky handlers
  // =====================================================
  function handleCreatePostriky(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createPostrikyAction({
          kategorie: form.get("kategorie") as string,
          plocha_od: Number(form.get("plocha_od")) || 0,
          plocha_do: form.get("plocha_do") ? Number(form.get("plocha_do")) : null,
          cena: Number(form.get("cena")) || 0,
        });
        setShowCreatePostriky(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditPostriky(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editPostriky) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updatePostrikyAction(editPostriky.id, {
          plocha_od: Number(form.get("plocha_od")) || 0,
          plocha_do: form.get("plocha_do") ? Number(form.get("plocha_do")) : null,
          cena: Number(form.get("cena")) || 0,
        });
        setEditPostriky(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeletePostriky() {
    if (!deletePostriky) return;
    startTransition(async () => {
      try {
        await deletePostrikyAction(deletePostriky.id);
        setDeletePostriky(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // =====================================================
  // Gely handlers
  // =====================================================
  function handleCreateGely(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createGelyAction({
          kategorie: form.get("kategorie") as string,
          bytu_od: Number(form.get("bytu_od")) || 0,
          bytu_do: form.get("bytu_do") ? Number(form.get("bytu_do")) : null,
          cena: Number(form.get("cena")) || 0,
        });
        setShowCreateGely(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditGely(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editGely) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateGelyAction(editGely.id, {
          bytu_od: Number(form.get("bytu_od")) || 0,
          bytu_do: form.get("bytu_do") ? Number(form.get("bytu_do")) : null,
          cena: Number(form.get("cena")) || 0,
        });
        setEditGely(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteGely() {
    if (!deleteGely) return;
    startTransition(async () => {
      try {
        await deleteGelyAction(deleteGely.id);
        setDeleteGely(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // =====================================================
  // Specialni handlers
  // =====================================================
  function handleCreateSpecialni(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createSpecialniAction({
          nazev: form.get("nazev") as string,
          cena_od: Number(form.get("cena_od")) || 0,
          cena_do: form.get("cena_do") ? Number(form.get("cena_do")) : null,
        });
        setShowCreateSpecialni(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditSpecialni(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editSpecialni) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateSpecialniAction(editSpecialni.id, {
          nazev: form.get("nazev") as string,
          cena_od: Number(form.get("cena_od")) || 0,
          cena_do: form.get("cena_do") ? Number(form.get("cena_do")) : null,
        });
        setEditSpecialni(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteSpecialni() {
    if (!deleteSpecialni) return;
    startTransition(async () => {
      try {
        await deleteSpecialniAction(deleteSpecialni.id);
        setDeleteSpecialni(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // =====================================================
  // Deratizace handlers
  // =====================================================
  function handleCreateDeratizace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDeratizaceAction({
          nazev: form.get("nazev") as string,
          cena_za_kus: Number(form.get("cena_za_kus")) || 0,
        });
        setShowCreateDeratizace(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditDeratizace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editDeratizace) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateDeratizaceAction(editDeratizace.id, {
          nazev: form.get("nazev") as string,
          cena_za_kus: Number(form.get("cena_za_kus")) || 0,
        });
        setEditDeratizace(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteDeratizace() {
    if (!deleteDeratizace) return;
    startTransition(async () => {
      try {
        await deleteDeratizaceAction(deleteDeratizace.id);
        setDeleteDeratizace(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // =====================================================
  // Dezinfekce handlers
  // =====================================================
  function handleCreateDezinfekce(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDezinfekceAction({
          typ: form.get("typ") as string,
          plocha_od: Number(form.get("plocha_od")) || 0,
          plocha_do: form.get("plocha_do") ? Number(form.get("plocha_do")) : null,
          cena_za_m: Number(form.get("cena_za_m")) || 0,
        });
        setShowCreateDezinfekce(false);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEditDezinfekce(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editDezinfekce) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateDezinfekceAction(editDezinfekce.id, {
          plocha_od: Number(form.get("plocha_od")) || 0,
          plocha_do: form.get("plocha_do") ? Number(form.get("plocha_do")) : null,
          cena_za_m: Number(form.get("cena_za_m")) || 0,
        });
        setEditDezinfekce(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDeleteDezinfekce() {
    if (!deleteDezinfekce) return;
    startTransition(async () => {
      try {
        await deleteDezinfekceAction(deleteDezinfekce.id);
        setDeleteDezinfekce(null);
        refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  // =====================================================
  // Format helpers
  // =====================================================
  function formatCena(v: number | string) {
    return Number(v).toLocaleString("cs-CZ");
  }

  // =====================================================
  // Render
  // =====================================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/nastaveni">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
            <ArrowLeft className="size-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Ceník</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_LABELS) as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium min-h-[44px] transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "obecne" && renderObecne()}
      {activeTab === "postriky" && renderPostriky()}
      {activeTab === "gely" && renderGely()}
      {activeTab === "specialni" && renderSpecialni()}
      {activeTab === "deratizace" && renderDeratizace()}
      {activeTab === "dezinfekce" && renderDezinfekce()}

      {/* All BottomSheets & Dialogs */}
      {renderObecneEdit()}
      {renderPostrikySheets()}
      {renderGelySheets()}
      {renderSpecialniSheets()}
      {renderDeratizaceSheets()}
      {renderDezinfekceSheets()}
    </div>
  );

  // =====================================================
  // OBECNÉ — fixed rows, edit only
  // =====================================================
  function renderObecne() {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Obecné sazby</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {obecne.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {OBECNE_LABELS[item.nazev] || item.nazev}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCena(item.hodnota)} {item.jednotka}
                  {item.poznamka && ` · ${item.poznamka}`}
                </p>
              </div>
              <button
                onClick={() => { setEditObecne(item); setError(null); }}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  function renderObecneEdit() {
    return (
      <BottomSheet
        open={!!editObecne}
        onOpenChange={(open) => { if (!open) setEditObecne(null); }}
        title="Upravit sazbu"
        description={editObecne ? (OBECNE_LABELS[editObecne.nazev] || editObecne.nazev) : ""}
      >
        {editObecne && (
          <form onSubmit={handleEditObecne} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-hodnota">Hodnota ({editObecne.jednotka}) *</Label>
              <Input
                id="edit-hodnota"
                name="hodnota"
                type="number"
                step="0.01"
                required
                defaultValue={Number(editObecne.hodnota)}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-poznamka">Poznámka</Label>
              <Input
                id="edit-poznamka"
                name="poznamka"
                defaultValue={editObecne.poznamka || ""}
                className="min-h-[44px]"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>
    );
  }

  // =====================================================
  // POSTŘIKY
  // =====================================================
  function renderPostriky() {
    const grouped = new Map<string, CenikPostriky[]>();
    for (const item of postriky) {
      if (!grouped.has(item.kategorie)) grouped.set(item.kategorie, []);
      grouped.get(item.kategorie)!.push(item);
    }

    return (
      <>
        <Button
          className="w-full min-h-[44px] gap-2"
          onClick={() => { setShowCreatePostriky(true); setError(null); }}
        >
          <Plus className="size-4" />
          Přidat sazbu
        </Button>

        {postriky.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">Žádné sazby</p>
            </CardContent>
          </Card>
        ) : (
          Array.from(grouped.entries()).map(([kat, items]) => (
            <Card key={kat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <Badge variant="outline">{KATEGORIE_POSTRIKY_LABELS[kat] || kat}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.sort((a, b) => a.plocha_od - b.plocha_od).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.plocha_do ? `${item.plocha_od}–${item.plocha_do} m²` : `od ${item.plocha_od} m²`}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatCena(item.cena)} Kč</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => { setEditPostriky(item); setError(null); }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeletePostriky(item)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
        <p className="text-xs text-muted-foreground text-center">Celkem {postriky.length} sazeb</p>
      </>
    );
  }

  function renderPostrikySheets() {
    return (
      <>
        {/* Create */}
        <BottomSheet
          open={showCreatePostriky}
          onOpenChange={setShowCreatePostriky}
          title="Nová sazba — Postřik"
          description="Zadejte kategorii, rozsah plochy a cenu"
        >
          <form onSubmit={handleCreatePostriky} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-p-kat">Kategorie *</Label>
              <select
                id="new-p-kat"
                name="kategorie"
                required
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(KATEGORIE_POSTRIKY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-p-od">Od m² *</Label>
                <Input id="new-p-od" name="plocha_od" type="number" min="0" required className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-p-do">Do m²</Label>
                <Input id="new-p-do" name="plocha_do" type="number" min="0" placeholder="∞" className="min-h-[44px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-p-cena">Cena (Kč) *</Label>
              <Input id="new-p-cena" name="cena" type="number" step="0.01" min="0" required className="min-h-[44px]" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Vytvořit"}
            </Button>
          </form>
        </BottomSheet>

        {/* Edit */}
        <BottomSheet
          open={!!editPostriky}
          onOpenChange={(open) => { if (!open) setEditPostriky(null); }}
          title="Upravit sazbu"
          description={editPostriky ? (KATEGORIE_POSTRIKY_LABELS[editPostriky.kategorie] || editPostriky.kategorie) : ""}
        >
          {editPostriky && (
            <form onSubmit={handleEditPostriky} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-p-od">Od m² *</Label>
                  <Input id="edit-p-od" name="plocha_od" type="number" min="0" required defaultValue={editPostriky.plocha_od} className="min-h-[44px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-p-do">Do m²</Label>
                  <Input id="edit-p-do" name="plocha_do" type="number" min="0" placeholder="∞" defaultValue={editPostriky.plocha_do ?? ""} className="min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-p-cena">Cena (Kč) *</Label>
                <Input id="edit-p-cena" name="cena" type="number" step="0.01" min="0" required defaultValue={Number(editPostriky.cena)} className="min-h-[44px]" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
                {isPending ? "Ukládám..." : "Uložit změny"}
              </Button>
            </form>
          )}
        </BottomSheet>

        {/* Delete */}
        <Dialog open={!!deletePostriky} onOpenChange={(open) => { if (!open) setDeletePostriky(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat sazbu?</DialogTitle>
              <DialogDescription>
                {deletePostriky && `${KATEGORIE_POSTRIKY_LABELS[deletePostriky.kategorie] || deletePostriky.kategorie}, ${deletePostriky.plocha_od}–${deletePostriky.plocha_do ?? "∞"} m²`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setDeletePostriky(null)}>Zrušit</Button>
              <Button variant="destructive" className="min-h-[44px]" onClick={handleDeletePostriky} disabled={isPending}>
                {isPending ? "Mažu..." : "Smazat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // =====================================================
  // GELY
  // =====================================================
  function renderGely() {
    const grouped = new Map<string, CenikGely[]>();
    for (const item of gely) {
      if (!grouped.has(item.kategorie)) grouped.set(item.kategorie, []);
      grouped.get(item.kategorie)!.push(item);
    }

    return (
      <>
        <Button
          className="w-full min-h-[44px] gap-2"
          onClick={() => { setShowCreateGely(true); setError(null); }}
        >
          <Plus className="size-4" />
          Přidat sazbu
        </Button>

        {gely.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">Žádné sazby</p>
            </CardContent>
          </Card>
        ) : (
          Array.from(grouped.entries()).map(([kat, items]) => (
            <Card key={kat}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <Badge variant="outline">{KATEGORIE_GELY_LABELS[kat] || kat}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.sort((a, b) => a.bytu_od - b.bytu_od).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.bytu_do ? `${item.bytu_od}–${item.bytu_do} bytů` : `od ${item.bytu_od} bytů`}
                      </p>
                      <p className="text-sm text-muted-foreground">{formatCena(item.cena)} Kč</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => { setEditGely(item); setError(null); }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteGely(item)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
        <p className="text-xs text-muted-foreground text-center">Celkem {gely.length} sazeb</p>
      </>
    );
  }

  function renderGelySheets() {
    return (
      <>
        <BottomSheet
          open={showCreateGely}
          onOpenChange={setShowCreateGely}
          title="Nová sazba — Gel"
          description="Zadejte kategorii, rozsah bytů a cenu"
        >
          <form onSubmit={handleCreateGely} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-g-kat">Kategorie *</Label>
              <select
                id="new-g-kat"
                name="kategorie"
                required
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(KATEGORIE_GELY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-g-od">Od bytů *</Label>
                <Input id="new-g-od" name="bytu_od" type="number" min="0" required className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-g-do">Do bytů</Label>
                <Input id="new-g-do" name="bytu_do" type="number" min="0" placeholder="∞" className="min-h-[44px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-g-cena">Cena (Kč) *</Label>
              <Input id="new-g-cena" name="cena" type="number" step="0.01" min="0" required className="min-h-[44px]" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Vytvořit"}
            </Button>
          </form>
        </BottomSheet>

        <BottomSheet
          open={!!editGely}
          onOpenChange={(open) => { if (!open) setEditGely(null); }}
          title="Upravit sazbu"
          description={editGely ? (KATEGORIE_GELY_LABELS[editGely.kategorie] || editGely.kategorie) : ""}
        >
          {editGely && (
            <form onSubmit={handleEditGely} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-g-od">Od bytů *</Label>
                  <Input id="edit-g-od" name="bytu_od" type="number" min="0" required defaultValue={editGely.bytu_od} className="min-h-[44px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-g-do">Do bytů</Label>
                  <Input id="edit-g-do" name="bytu_do" type="number" min="0" placeholder="∞" defaultValue={editGely.bytu_do ?? ""} className="min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-g-cena">Cena (Kč) *</Label>
                <Input id="edit-g-cena" name="cena" type="number" step="0.01" min="0" required defaultValue={Number(editGely.cena)} className="min-h-[44px]" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
                {isPending ? "Ukládám..." : "Uložit změny"}
              </Button>
            </form>
          )}
        </BottomSheet>

        <Dialog open={!!deleteGely} onOpenChange={(open) => { if (!open) setDeleteGely(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat sazbu?</DialogTitle>
              <DialogDescription>
                {deleteGely && `${KATEGORIE_GELY_LABELS[deleteGely.kategorie] || deleteGely.kategorie}, ${deleteGely.bytu_od}–${deleteGely.bytu_do ?? "∞"} bytů`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setDeleteGely(null)}>Zrušit</Button>
              <Button variant="destructive" className="min-h-[44px]" onClick={handleDeleteGely} disabled={isPending}>
                {isPending ? "Mažu..." : "Smazat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // =====================================================
  // SPECIÁLNÍ
  // =====================================================
  function renderSpecialni() {
    return (
      <>
        <Button
          className="w-full min-h-[44px] gap-2"
          onClick={() => { setShowCreateSpecialni(true); setError(null); }}
        >
          <Plus className="size-4" />
          Přidat sazbu
        </Button>

        {specialni.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">Žádné sazby</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Speciální zásahy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {specialni.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.nazev}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.cena_do
                        ? `${formatCena(item.cena_od)}–${formatCena(item.cena_do)} Kč`
                        : `${formatCena(item.cena_od)} Kč`}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditSpecialni(item); setError(null); }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteSpecialni(item)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <p className="text-xs text-muted-foreground text-center">Celkem {specialni.length} sazeb</p>
      </>
    );
  }

  function renderSpecialniSheets() {
    return (
      <>
        <BottomSheet
          open={showCreateSpecialni}
          onOpenChange={setShowCreateSpecialni}
          title="Nová sazba — Speciální"
          description="Zadejte název a cenový rozsah"
        >
          <form onSubmit={handleCreateSpecialni} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-s-nazev">Název *</Label>
              <Input id="new-s-nazev" name="nazev" required className="min-h-[44px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-s-od">Cena od (Kč) *</Label>
                <Input id="new-s-od" name="cena_od" type="number" step="0.01" min="0" required className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-s-do">Cena do (Kč)</Label>
                <Input id="new-s-do" name="cena_do" type="number" step="0.01" min="0" placeholder="Fixní" className="min-h-[44px]" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Vytvořit"}
            </Button>
          </form>
        </BottomSheet>

        <BottomSheet
          open={!!editSpecialni}
          onOpenChange={(open) => { if (!open) setEditSpecialni(null); }}
          title="Upravit sazbu"
          description={editSpecialni?.nazev || ""}
        >
          {editSpecialni && (
            <form onSubmit={handleEditSpecialni} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-s-nazev">Název *</Label>
                <Input id="edit-s-nazev" name="nazev" required defaultValue={editSpecialni.nazev} className="min-h-[44px]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-s-od">Cena od (Kč) *</Label>
                  <Input id="edit-s-od" name="cena_od" type="number" step="0.01" min="0" required defaultValue={Number(editSpecialni.cena_od)} className="min-h-[44px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-s-do">Cena do (Kč)</Label>
                  <Input id="edit-s-do" name="cena_do" type="number" step="0.01" min="0" placeholder="Fixní" defaultValue={editSpecialni.cena_do ? Number(editSpecialni.cena_do) : ""} className="min-h-[44px]" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
                {isPending ? "Ukládám..." : "Uložit změny"}
              </Button>
            </form>
          )}
        </BottomSheet>

        <Dialog open={!!deleteSpecialni} onOpenChange={(open) => { if (!open) setDeleteSpecialni(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat sazbu?</DialogTitle>
              <DialogDescription>{deleteSpecialni?.nazev}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setDeleteSpecialni(null)}>Zrušit</Button>
              <Button variant="destructive" className="min-h-[44px]" onClick={handleDeleteSpecialni} disabled={isPending}>
                {isPending ? "Mažu..." : "Smazat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // =====================================================
  // DERATIZACE
  // =====================================================
  function renderDeratizace() {
    return (
      <>
        <Button
          className="w-full min-h-[44px] gap-2"
          onClick={() => { setShowCreateDeratizace(true); setError(null); }}
        >
          <Plus className="size-4" />
          Přidat položku
        </Button>

        {deratizace.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">Žádné položky</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Smluvní monitoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {deratizace.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.nazev}</p>
                    <p className="text-sm text-muted-foreground">{formatCena(item.cena_za_kus)} Kč/ks</p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button
                      onClick={() => { setEditDeratizace(item); setError(null); }}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteDeratizace(item)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        <p className="text-xs text-muted-foreground text-center">Celkem {deratizace.length} položek</p>
      </>
    );
  }

  function renderDeratizaceSheets() {
    return (
      <>
        <BottomSheet
          open={showCreateDeratizace}
          onOpenChange={setShowCreateDeratizace}
          title="Nová položka — Deratizace"
          description="Zadejte název a cenu za kus"
        >
          <form onSubmit={handleCreateDeratizace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-d-nazev">Název *</Label>
              <Input id="new-d-nazev" name="nazev" required className="min-h-[44px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-d-cena">Cena za kus (Kč) *</Label>
              <Input id="new-d-cena" name="cena_za_kus" type="number" step="0.01" min="0" required className="min-h-[44px]" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Vytvořit"}
            </Button>
          </form>
        </BottomSheet>

        <BottomSheet
          open={!!editDeratizace}
          onOpenChange={(open) => { if (!open) setEditDeratizace(null); }}
          title="Upravit položku"
          description={editDeratizace?.nazev || ""}
        >
          {editDeratizace && (
            <form onSubmit={handleEditDeratizace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-d-nazev">Název *</Label>
                <Input id="edit-d-nazev" name="nazev" required defaultValue={editDeratizace.nazev} className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-d-cena">Cena za kus (Kč) *</Label>
                <Input id="edit-d-cena" name="cena_za_kus" type="number" step="0.01" min="0" required defaultValue={Number(editDeratizace.cena_za_kus)} className="min-h-[44px]" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
                {isPending ? "Ukládám..." : "Uložit změny"}
              </Button>
            </form>
          )}
        </BottomSheet>

        <Dialog open={!!deleteDeratizace} onOpenChange={(open) => { if (!open) setDeleteDeratizace(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat položku?</DialogTitle>
              <DialogDescription>{deleteDeratizace?.nazev}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setDeleteDeratizace(null)}>Zrušit</Button>
              <Button variant="destructive" className="min-h-[44px]" onClick={handleDeleteDeratizace} disabled={isPending}>
                {isPending ? "Mažu..." : "Smazat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // =====================================================
  // DEZINFEKCE
  // =====================================================
  function renderDezinfekce() {
    const grouped = new Map<string, CenikDezinfekce[]>();
    for (const item of dezinfekce) {
      if (!grouped.has(item.typ)) grouped.set(item.typ, []);
      grouped.get(item.typ)!.push(item);
    }

    return (
      <>
        <Button
          className="w-full min-h-[44px] gap-2"
          onClick={() => { setShowCreateDezinfekce(true); setError(null); }}
        >
          <Plus className="size-4" />
          Přidat sazbu
        </Button>

        {dezinfekce.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">Žádné sazby</p>
            </CardContent>
          </Card>
        ) : (
          Array.from(grouped.entries()).map(([typ, items]) => (
            <Card key={typ}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  <Badge variant="outline">{TYP_DEZINFEKCE_LABELS[typ] || typ}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.sort((a, b) => a.plocha_od - b.plocha_od).map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {item.plocha_do ? `${item.plocha_od}–${item.plocha_do}` : `od ${item.plocha_od}`} {typ === "postrik" ? "m²" : "m³"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCena(item.cena_za_m)} Kč/{typ === "postrik" ? "m²" : "m³"}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => { setEditDezinfekce(item); setError(null); }}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteDezinfekce(item)}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
        <p className="text-xs text-muted-foreground text-center">Celkem {dezinfekce.length} sazeb</p>
      </>
    );
  }

  function renderDezinfekceSheets() {
    return (
      <>
        <BottomSheet
          open={showCreateDezinfekce}
          onOpenChange={setShowCreateDezinfekce}
          title="Nová sazba — Dezinfekce"
          description="Zadejte typ, rozsah plochy a cenu"
        >
          <form onSubmit={handleCreateDezinfekce} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-dz-typ">Typ *</Label>
              <select
                id="new-dz-typ"
                name="typ"
                required
                className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {Object.entries(TYP_DEZINFEKCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="new-dz-od">Od m²/m³ *</Label>
                <Input id="new-dz-od" name="plocha_od" type="number" min="0" required className="min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-dz-do">Do m²/m³</Label>
                <Input id="new-dz-do" name="plocha_do" type="number" min="0" placeholder="∞" className="min-h-[44px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-dz-cena">Cena za m²/m³ (Kč) *</Label>
              <Input id="new-dz-cena" name="cena_za_m" type="number" step="0.01" min="0" required className="min-h-[44px]" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
              {isPending ? "Ukládám..." : "Vytvořit"}
            </Button>
          </form>
        </BottomSheet>

        <BottomSheet
          open={!!editDezinfekce}
          onOpenChange={(open) => { if (!open) setEditDezinfekce(null); }}
          title="Upravit sazbu"
          description={editDezinfekce ? (TYP_DEZINFEKCE_LABELS[editDezinfekce.typ] || editDezinfekce.typ) : ""}
        >
          {editDezinfekce && (
            <form onSubmit={handleEditDezinfekce} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-dz-od">Od m²/m³ *</Label>
                  <Input id="edit-dz-od" name="plocha_od" type="number" min="0" required defaultValue={editDezinfekce.plocha_od} className="min-h-[44px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dz-do">Do m²/m³</Label>
                  <Input id="edit-dz-do" name="plocha_do" type="number" min="0" placeholder="∞" defaultValue={editDezinfekce.plocha_do ?? ""} className="min-h-[44px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dz-cena">Cena za m²/m³ (Kč) *</Label>
                <Input id="edit-dz-cena" name="cena_za_m" type="number" step="0.01" min="0" required defaultValue={Number(editDezinfekce.cena_za_m)} className="min-h-[44px]" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full min-h-[44px]" disabled={isPending}>
                {isPending ? "Ukládám..." : "Uložit změny"}
              </Button>
            </form>
          )}
        </BottomSheet>

        <Dialog open={!!deleteDezinfekce} onOpenChange={(open) => { if (!open) setDeleteDezinfekce(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Smazat sazbu?</DialogTitle>
              <DialogDescription>
                {deleteDezinfekce && `${TYP_DEZINFEKCE_LABELS[deleteDezinfekce.typ] || deleteDezinfekce.typ}, ${deleteDezinfekce.plocha_od}–${deleteDezinfekce.plocha_do ?? "∞"}`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setDeleteDezinfekce(null)}>Zrušit</Button>
              <Button variant="destructive" className="min-h-[44px]" onClick={handleDeleteDezinfekce} disabled={isPending}>
                {isPending ? "Mažu..." : "Smazat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
