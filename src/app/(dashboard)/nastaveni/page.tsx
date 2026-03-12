import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Calculator, Coins, Trophy } from "lucide-react";

export default function NastaveniPage() {
  const sections = [
    {
      href: "/nastaveni/sablony-bodu",
      icon: Calculator,
      title: "Šablony bodů",
      description: "Kalkulačka monitorovacích bodů — šablony dle typu objektu a zásahu",
    },
    {
      href: "/nastaveni/cenik",
      icon: Coins,
      title: "Ceník",
      description: "Sazby, postřiky, gely, deratizace, dezinfekce",
    },
    {
      href: "/nastaveni/bonusy",
      icon: Trophy,
      title: "Bonusy a prémie",
      description: "Sazby bonusů za zakázky a fixní odměny",
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Link key={section.href} href={section.href}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-muted">
                <section.icon className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{section.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {section.description}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
