"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomSheet } from "@/components/layout/BottomSheet";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Bug,
  ClipboardList,
  CalendarDays,
  CreditCard,
  Pencil,
  Trash2,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { updateZakazkaAction, deleteZakazkaAction } from "../actions";
import { CenovaKalkulace } from "./CenovaKalkulace";
import type { Database } from "@/lib/supabase/database.types";
import type { CenikData, Polozka } from "@/lib/kalkulacka/vypocetCeny";

// ----- Types -----

type StatusZakazky = Database["public"]["Enums"]["status_zakazky"];
type TypZakazky = Database["public"]["Enums"]["typ_zakazky"];

type ZakazkaWithRelations = Database["public"]["Tables"]["zakazky"]["Row"] & {
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
      email: string | null;
      telefon: string | null;
      adresa: string | null;
      dph_sazba: number;
      individualni_sleva_procent: number;
      platba_predem: boolean;
    };
  };
};

// ----- Constants -----

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

const TYPY_ZASAHU_LABELS: Record<string, string> = {
  vnitrni_deratizace: "Vnitřní deratizace",
  vnejsi_deratizace: "Vnější deratizace",
  vnitrni_dezinsekce: "Vnitřní dezinsekce",
  postrik: "Postřik",
};

const TYP_OBJEKTU_LABELS: Record<string, string> = {
  gastro: "Gastro",
  sklad_nevyzivocisna: "Sklad neživočišná",
  sklad_zivocisna: "Sklad živočišná",
  domacnost: "Domácnost",
  kancelar: "Kancelář",
  skola: "Škola",
  hotel: "Hotel",
  nemocnice: "Nemocnice",
  ubytovna: "Ubytovna",
  vyrobni_hala: "Výrobní hala",
  jiny: "Jiný",
};

// ----- Helpers -----

function getKlientName(k: ZakazkaWithRelations["objekty"]["klienti"]): string {
  if (k.typ === "firma") return k.nazev || "Bez názvu";
  return [k.jmeno, k.prijmeni].filter(Boolean).join(" ") || "Bez jména";
}

function formatTypyZasahu(typy: unknown): string[] {
  if (!Array.isArray(typy)) return [];
  return typy.map((t) => TYPY_ZASAHU_LABELS[t as string] || String(t));
}

function formatSkudci(skudci: unknown): string[] {
  if (!Array.isArray(skudci)) return [];
  return skudci as string[];
}

// ----- Component -----

interface ZakazkaDetailProps {
  zakazka: ZakazkaWithRelations;
  isAdmin?: boolean;
  cenikData?: CenikData;
  existujiciPolozky?: Polozka[] | null;
}

export function ZakazkaDetail({
  zakazka,
  isAdmin = true,
  cenikData,
  existujiciPolozky,
}: ZakazkaDetailProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const klient = zakazka.objekty.klienti;
  const objekt = zakazka.objekty;

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);

    const cetnostDny = form.get("cetnost_dny")
      ? Number(form.get("cetnost_dny"))
      : null;
    const pocetNavstev =
      cetnostDny && cetnostDny > 0 ? Math.round(365 / cetnostDny) : null;

    startTransition(async () => {
      try {
        await updateZakazkaAction(zakazka.id, {
          typ: form.get("typ") as TypZakazky,
          status: form.get("status") as StatusZakazky,
          cetnost_dny: cetnostDny,
          pocet_navstev_rocne: pocetNavstev,
          platnost_do: (form.get("platnost_do") as string) || null,
          platba_predem: form.get("platba_predem") === "on",
          poznamka: (form.get("poznamka") as string) || null,
        });
        setShowEdit(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při ukládání");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteZakazkaAction(zakazka.id);
        router.push("/zakazky");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba při mazání");
      }
    });
  }

  const typyZasahu = formatTypyZasahu(zakazka.typy_zasahu);
  const skudciList = formatSkudci(zakazka.skudci);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/zakazky"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <ArrowLeft className="size-5" />
        </Link>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2"
              onClick={() => {
                setShowEdit(true);
                setError(null);
              }}
            >
              <Pencil className="size-4" />
              Upravit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] gap-2 text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Status + type badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className={`text-sm ${STATUS_COLORS[zakazka.status]}`}>
          {STATUS_LABELS[zakazka.status]}
        </Badge>
        <Badge variant="outline" className="text-sm">
          {TYP_LABELS[zakazka.typ]}
        </Badge>
        {zakazka.platba_predem && (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 text-sm">
            <CreditCard className="mr-1 size-3" />
            Platba předem
          </Badge>
        )}
      </div>

      {/* Klient card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Klient
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href={`/klienti/${klient.id}`}
            className="text-base font-medium text-primary underline-offset-4 hover:underline"
          >
            {getKlientName(klient)}
          </Link>
          {klient.ico && (
            <p className="text-sm text-muted-foreground">IČO: {klient.ico}</p>
          )}
          {klient.email && (
            <div className="flex items-center gap-1.5 text-sm">
              <Mail className="size-3.5 text-muted-foreground" />
              <a href={`mailto:${klient.email}`} className="text-primary">
                {klient.email}
              </a>
            </div>
          )}
          {klient.telefon && (
            <div className="flex items-center gap-1.5 text-sm">
              <Phone className="size-3.5 text-muted-foreground" />
              <a href={`tel:${klient.telefon}`} className="text-primary">
                {klient.telefon}
              </a>
            </div>
          )}
          {klient.individualni_sleva_procent > 0 && (
            <p className="text-sm text-muted-foreground">
              Individuální sleva: {klient.individualni_sleva_procent} %
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            DPH: {klient.dph_sazba} %
          </p>
        </CardContent>
      </Card>

      {/* Objekt card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4" />
            Objekt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="font-medium">{objekt.nazev || "Bez názvu"}</p>
          <p className="text-sm text-muted-foreground">{objekt.adresa}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="text-xs">
              {TYP_OBJEKTU_LABELS[objekt.typ_objektu] || objekt.typ_objektu}
            </Badge>
            {objekt.plocha_m2 && (
              <Badge variant="secondary" className="text-xs">
                {objekt.plocha_m2} m²
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Typy zásahu */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="size-4" />
            Typy zásahu
          </CardTitle>
        </CardHeader>
        <CardContent>
          {typyZasahu.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {typyZasahu.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Žádné typy zásahu</p>
          )}
        </CardContent>
      </Card>

      {/* Škůdci */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bug className="size-4" />
            Škůdci
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skudciList.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skudciList.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Žádní škůdci</p>
          )}
        </CardContent>
      </Card>

      {/* Scheduling info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4" />
            Plánování
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Četnost</p>
              <p className="font-medium">
                {zakazka.cetnost_dny
                  ? `Každých ${zakazka.cetnost_dny} dní`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Návštěv/rok</p>
              <p className="font-medium">
                {zakazka.pocet_navstev_rocne ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Platnost do</p>
              <p className="font-medium">
                {zakazka.platnost_do
                  ? new Date(zakazka.platnost_do).toLocaleDateString("cs-CZ")
                  : "Neomezená"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Vytvořena</p>
              <p className="font-medium">
                {new Date(zakazka.created_at).toLocaleDateString("cs-CZ")}
              </p>
            </div>
          </div>
          {zakazka.poznamka && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Poznámka
              </p>
              <p className="text-sm">{zakazka.poznamka}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========== CENOVÁ KALKULACE ========== */}
      {cenikData && (
        <CenovaKalkulace
          zakazka={zakazka}
          isAdmin={isAdmin}
          cenikData={cenikData}
          existujiciPolozky={existujiciPolozky ?? null}
        />
      )}

      {/* ========== EDIT BOTTOMSHEET ========== */}
      <BottomSheet
        open={showEdit}
        onOpenChange={setShowEdit}
        title="Upravit zakázku"
        description={`${getKlientName(klient)} — ${objekt.nazev || objekt.adresa}`}
      >
        <form onSubmit={handleEdit} className="space-y-4">
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
                    defaultChecked={zakazka.typ === t}
                    className="sr-only"
                  />
                  {TYP_LABELS[t]}
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="detail_edit_status">Status</Label>
            <select
              id="detail_edit_status"
              name="status"
              defaultValue={zakazka.status}
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
            <Label htmlFor="detail_edit_cetnost">Četnost návštěv (dny)</Label>
            <Input
              id="detail_edit_cetnost"
              name="cetnost_dny"
              type="number"
              min={1}
              defaultValue={zakazka.cetnost_dny ?? ""}
            />
          </div>

          {/* Platnost do */}
          <div className="space-y-2">
            <Label htmlFor="detail_edit_platnost">Platnost do</Label>
            <Input
              id="detail_edit_platnost"
              name="platnost_do"
              type="date"
              defaultValue={zakazka.platnost_do ?? ""}
            />
          </div>

          {/* Platba předem */}
          <label className="flex min-h-[44px] items-center gap-3">
            <input
              type="checkbox"
              name="platba_predem"
              className="size-5"
              defaultChecked={zakazka.platba_predem}
            />
            <span className="text-sm">Platba předem (QR)</span>
          </label>

          {/* Poznámka */}
          <div className="space-y-2">
            <Label htmlFor="detail_edit_poznamka">Poznámka</Label>
            <textarea
              id="detail_edit_poznamka"
              name="poznamka"
              rows={2}
              defaultValue={zakazka.poznamka || ""}
              className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="min-h-[44px] w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Ukládám...
              </>
            ) : (
              "Uložit změny"
            )}
          </Button>
        </form>
      </BottomSheet>

      {/* ========== DELETE DIALOG ========== */}
      <Dialog
        open={deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat zakázku?</DialogTitle>
            <DialogDescription>
              Opravdu chcete smazat zakázku pro{" "}
              <strong>{getKlientName(klient)}</strong>
              {" — "}
              {objekt.nazev || objekt.adresa}? Zakázka bude deaktivována.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(false)}
              className="min-h-[44px]"
            >
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="min-h-[44px]"
            >
              {isPending ? "Mažu..." : "Smazat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
