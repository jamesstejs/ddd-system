"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/types/roles";
import { POBOCKY, POBOCKA_LABELS } from "@/types/pobocky";
import {
  createUserAction,
  updateUserAction,
  deleteUserAction,
} from "./actions";
import type { Tables } from "@/lib/supabase/database.types";
import type { AppRole } from "@/lib/auth";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Profile = Tables<"profiles">;

const ALL_ROLES: AppRole[] = ["super_admin", "admin", "technik", "klient"];

export function UserList({ profiles }: { profiles: Profile[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const selectedRoles = ALL_ROLES.filter(
      (r) => form.get(`role_${r}`) === "on"
    );

    if (selectedRoles.length === 0) {
      setError("Vyberte alespoň jednu roli");
      return;
    }

    startTransition(async () => {
      try {
        const pobockaVal = form.get("pobocka") as string;
        await createUserAction({
          email: form.get("email") as string,
          password: form.get("password") as string,
          jmeno: form.get("jmeno") as string,
          prijmeni: form.get("prijmeni") as string,
          telefon: form.get("telefon") as string,
          role: selectedRoles,
          pobocka: pobockaVal && pobockaVal !== "__none__" ? pobockaVal : null,
        });
        setShowCreate(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editUser) return;
    setError(null);
    const form = new FormData(e.currentTarget);
    const selectedRoles = ALL_ROLES.filter(
      (r) => form.get(`role_${r}`) === "on"
    );

    if (selectedRoles.length === 0) {
      setError("Vyberte alespoň jednu roli");
      return;
    }

    startTransition(async () => {
      try {
        const editPobocka = form.get("pobocka") as string;
        await updateUserAction(editUser.id, {
          jmeno: form.get("jmeno") as string,
          prijmeni: form.get("prijmeni") as string,
          telefon: form.get("telefon") as string,
          role: selectedRoles,
          pobocka: editPobocka && editPobocka !== "__none__" ? editPobocka : null,
        });
        setEditUser(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  function handleDelete() {
    if (!deleteConfirm) return;
    startTransition(async () => {
      try {
        await deleteUserAction(deleteConfirm.id);
        setDeleteConfirm(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chyba");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {profiles.length} uživatelů
        </p>
        <Button
          onClick={() => setShowCreate(true)}
          size="sm"
          className="min-h-[44px] gap-2"
        >
          <Plus className="size-4" />
          Přidat
        </Button>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center justify-between pt-4 pb-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {p.jmeno} {p.prijmeni}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {p.email}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {p.role.map((r) => (
                    <Badge key={r} variant="secondary" className="text-xs">
                      {ROLE_LABELS[r]}
                    </Badge>
                  ))}
                  {p.pobocka && (
                    <Badge variant="outline" className="text-xs">
                      {POBOCKA_LABELS[p.pobocka as keyof typeof POBOCKA_LABELS] || p.pobocka}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={() => {
                    setEditUser(p);
                    setError(null);
                  }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(p)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create User BottomSheet */}
      <BottomSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Nový uživatel"
        description="Vytvořte nový uživatelský účet"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              name="email"
              type="email"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Heslo</Label>
            <Input
              id="create-password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-jmeno">Jméno</Label>
            <Input id="create-jmeno" name="jmeno" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-prijmeni">Příjmení</Label>
            <Input id="create-prijmeni" name="prijmeni" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-telefon">Telefon</Label>
            <Input id="create-telefon" name="telefon" type="tel" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="space-y-2">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex min-h-[44px] items-center gap-3"
                >
                  <input
                    type="checkbox"
                    name={`role_${role}`}
                    className="size-5"
                    defaultChecked={role === "technik"}
                  />
                  <span className="text-sm">{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pobočka (kraj)</Label>
            <Select name="pobocka" defaultValue="__none__">
              <SelectTrigger className="min-h-[44px]">
                <SelectValue placeholder="Bez pobočky" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Bez pobočky</SelectItem>
                {POBOCKY.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full min-h-[44px]"
            disabled={isPending}
          >
            {isPending ? "Vytvářím..." : "Vytvořit uživatele"}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit User BottomSheet */}
      <BottomSheet
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
        title="Upravit uživatele"
        description={editUser ? `${editUser.jmeno} ${editUser.prijmeni}` : ""}
      >
        {editUser && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-jmeno">Jméno</Label>
              <Input
                id="edit-jmeno"
                name="jmeno"
                required
                defaultValue={editUser.jmeno}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-prijmeni">Příjmení</Label>
              <Input
                id="edit-prijmeni"
                name="prijmeni"
                required
                defaultValue={editUser.prijmeni}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-telefon">Telefon</Label>
              <Input
                id="edit-telefon"
                name="telefon"
                type="tel"
                defaultValue={editUser.telefon || ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="space-y-2">
                {ALL_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex min-h-[44px] items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      name={`role_${role}`}
                      className="size-5"
                      defaultChecked={editUser.role.includes(role)}
                    />
                    <span className="text-sm">{ROLE_LABELS[role]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pobočka (kraj)</Label>
              <Select
                name="pobocka"
                defaultValue={editUser.pobocka || "__none__"}
              >
                <SelectTrigger className="min-h-[44px]">
                  <SelectValue placeholder="Bez pobočky" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez pobočky</SelectItem>
                  {POBOCKY.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={isPending}
            >
              {isPending ? "Ukládám..." : "Uložit změny"}
            </Button>
          </form>
        )}
      </BottomSheet>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat uživatele?</DialogTitle>
            <DialogDescription>
              Opravdu chcete deaktivovat uživatele{" "}
              <strong>
                {deleteConfirm?.jmeno} {deleteConfirm?.prijmeni}
              </strong>
              ? Uživatel se nebude moci přihlásit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
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
