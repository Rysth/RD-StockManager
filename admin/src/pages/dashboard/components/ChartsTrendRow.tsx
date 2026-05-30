import { lazy, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

const AreaChart = lazy(() =>
  import("../../../components/AreaChart").then((m) => ({
    default: m.AreaChart,
  })),
);
const ComboChart = lazy(() =>
  import("../../../components/ComboChart").then((m) => ({
    default: m.ComboChart,
  })),
);

function ChartFallback() {
  return (
    <div className="h-80 flex items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Cargando gráfico...
      </div>
    </div>
  );
}

interface ChartsTrendRowProps {
  trendChartData: { date: string; Total: number; Verificados: number }[];
  growthPositive: boolean;
  growthPercentage: number;
}

export function ChartsTrendRow({
  trendChartData,
  growthPositive,
  growthPercentage,
}: ChartsTrendRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Registration Trend */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Tendencia de Registros</CardTitle>
          <CardDescription>
            Total y verificados en los últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartFallback />}>
            <AreaChart
              className="h-80"
              data={trendChartData}
              index="date"
              categories={["Total", "Verificados"]}
              colors={["teal", "emerald"]}
              valueFormatter={(n: number) => Intl.NumberFormat("es").format(n)}
            />
          </Suspense>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex items-center gap-2 font-medium">
            {growthPositive ? "Crecimiento" : "Decrecimiento"} del{" "}
            {Math.abs(growthPercentage)}% este mes
            {growthPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="text-muted-foreground">
            Datos de los últimos 6 meses
          </div>
        </CardFooter>
      </Card>

      {/* Registration Trend as Combo (bars + line) */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Registros vs Verificaciones</CardTitle>
          <CardDescription>
            Comparación mensual de registros y verificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartFallback />}>
            <ComboChart
              data={trendChartData}
              index="date"
              enableBiaxial={true}
              barSeries={{
                categories: ["Total"],
                yAxisLabel: "Total (Barras)",
                colors: ["teal"],
              }}
              lineSeries={{
                categories: ["Verificados"],
                showYAxis: true,
                yAxisLabel: "Verificados (Línea)",
                colors: ["emerald"],
                yAxisWidth: 50,
              }}
            />
          </Suspense>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex items-center gap-2 font-medium">
            Comparativa mensual activa
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-muted-foreground">
            Proyección basada en tendencias actuales
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
