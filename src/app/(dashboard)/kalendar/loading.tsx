import { Card, CardContent } from "@/components/ui/card";

export default function KalendarLoading() {
  return (
    <div className="space-y-3">
      {/* Toolbar skeleton */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-16 animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-12 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="h-9 w-14 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="h-11 w-11 animate-pulse rounded-md bg-muted" />
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-11 w-11 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Week view skeleton */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="space-y-1.5">
              <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
