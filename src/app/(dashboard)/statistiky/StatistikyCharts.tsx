"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ea580c", "#7c3aed",
  "#0891b2", "#ca8a04", "#be185d", "#4f46e5", "#059669",
];

export default function StatistikyCharts({
  zasahyChartData,
  technikNames,
  revenueChartData,
}: {
  zasahyChartData: Record<string, string | number>[];
  technikNames: string[];
  revenueChartData: { mesic: string; bezDph: number; sDph: number }[];
}) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6">
      {/* Zasahy per technik */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dokončené zásahy per technik (měsíčně)</CardTitle>
        </CardHeader>
        <CardContent>
          {zasahyChartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zasahyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesic" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  {technikNames.map((name, i) => (
                    <Bar
                      key={name}
                      dataKey={name}
                      fill={COLORS[i % COLORS.length]}
                      stackId="zasahy"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Zatím žádná data o zásazích.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Revenue per month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tržby per měsíc</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueChartData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesic" fontSize={12} />
                  <YAxis
                    fontSize={12}
                    tickFormatter={(v: number) =>
                      `${Math.round(v / 1000)}k`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="bezDph"
                    name="Bez DPH"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sDph"
                    name="S DPH"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Zatím žádná data o fakturách.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
