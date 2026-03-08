import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Calculator } from "lucide-react";

export default function NastaveniPage() {
  const sections = [
    {
      href: "/nastaveni/sablony-bodu",
      icon: Calculator,
      title: "Šablony bodů",
      description: "Kalkulačka monitorovacích bodů — šablony dle typu objektu a zásahu",
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Nastavení systému</h1>

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
