import { Card, CardContent } from "@/components/ui/card";

export default function DostupnostLoading() {
  return (
    <div className="space-y-4">
      {/* Status skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </CardContent>
      </Card>

      {/* Calendar skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
