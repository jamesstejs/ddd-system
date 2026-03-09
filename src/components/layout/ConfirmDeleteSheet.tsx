"use client";

import { BottomSheet } from "@/components/layout/BottomSheet";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConfirmDeleteSheet({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending,
}: ConfirmDeleteSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Zrušit
          </Button>
          <Button
            variant="destructive"
            className="flex-1 min-h-[44px]"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? "Mažu..." : "Smazat"}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
