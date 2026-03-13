"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import QuickAddSheet from "./QuickAddSheet";

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Rychlé přidání zakázky"
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:bg-primary/80 transition-colors"
      >
        <Plus className="h-7 w-7" />
      </button>
      <QuickAddSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
