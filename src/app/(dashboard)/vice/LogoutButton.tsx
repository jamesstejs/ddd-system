"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="destructive"
      className="w-full min-h-[44px]"
      onClick={handleLogout}
    >
      Odhlásit se
    </Button>
  );
}
