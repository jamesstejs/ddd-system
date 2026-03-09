import { Card, CardContent } from "@/components/ui/card";

export default function ZakazkyLoading() {
  return (
    <div className="space-y-4">
      {/* Search skeleton */}
      <div className="h-[44px] w-full animate-pulse rounded-md bg-muted" />

      {/* Filter skeleton */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[44px] w-20 animate-pulse rounded-full bg-muted" />
        ))}
      </div>

      {/* Card skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="pt-4 pb-4">
            <div className="space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
