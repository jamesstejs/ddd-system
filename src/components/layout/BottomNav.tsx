"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  Menu,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[] | "all";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: "all" },
  {
    label: "Klienti",
    href: "/klienti",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    label: "Zakázky",
    href: "/zakazky",
    icon: ClipboardList,
    roles: ["admin", "super_admin", "technik"],
  },
  {
    label: "Kalendář",
    href: "/kalendar",
    icon: Calendar,
    roles: ["admin", "super_admin", "technik"],
  },
  { label: "Více", href: "/vice", icon: Menu, roles: "all" },
];

export function BottomNav({ aktivniRole }: { aktivniRole: AppRole }) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(aktivniRole)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex justify-around">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[56px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
