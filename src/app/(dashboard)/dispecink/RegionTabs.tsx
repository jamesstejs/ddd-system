"use client";

import { useRef, useEffect } from "react";
import { POBOCKY, type Pobocka } from "@/types/pobocky";

type Props = {
  value: Pobocka;
  onChange: (pobocka: Pobocka) => void;
};

export function RegionTabs({ value, onChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [value]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto px-1 pb-2 scrollbar-hide"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {POBOCKY.map((p) => {
        const isActive = value === p.value;
        return (
          <button
            key={p.value}
            ref={isActive ? activeRef : undefined}
            type="button"
            onClick={() => onChange(p.value)}
            className={`flex-shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
              isActive
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-muted text-muted-foreground active:bg-muted/70"
            }`}
            style={{ minHeight: 44 }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
