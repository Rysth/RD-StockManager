import { lazy, Suspense, useEffect } from "react";
import {
  DollarSign,
  CalendarDays,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { StatsCard } from "@/components/ui/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AreaChart = lazy(() =>
  import("../../../components/AreaChart").then((m) => ({ default: m.AreaChart })),
);
const ComboChart = lazy(() =>
  import("../../../components/ComboChart").then((m) => ({ default: m.ComboChart })),
);

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

function ChartFallback() {
  return (
    <div className="flex h-80 items-center justify-center text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Cargando gráfico...
      </div>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((id) => (
          <Skeleton key={id} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export default function ReportsIndex() {
  const { report, isLoading, fetchReport } = useSaleStore();

  useEffect(() => {
    fetchReport().catch((e) => toast.error(e.message || "Error al cargar el reporte"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && !report) return <ReportsSkeleton />;
  if (!report) return null;

  const { summary } = report;
  const marginPct =
    summary.revenue_month > 0
      ? Math.round((summary.profit_month / summary.revenue_month) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Banner — mismo estilo que el WelcomeBanner del Dashboard */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-primary-foreground shadow-md">
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="hidden rounded-xl bg-white/15 p-2.5 backdrop-blur-sm sm:block">
                <BarChart3 className="size-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Reportes de Ventas</h1>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Ingresos, ganancias y productos más vendidos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-primary-foreground/80 backdrop-blur-sm">
              <Clock className="size-4" />
              Última actualización: ahora
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats cards — variante colored con trend, igual que el Dashboard */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ingresos del mes"
          value={money(summary.revenue_month)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          variant="colored"
          description={`${money(summary.revenue_today)} hoy`}
        />
        <StatsCard
          title="Ganancia del mes"
          value={money(summary.profit_month)}
          icon={TrendingUp}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-50"
          variant="colored"
          trend={{ value: `${marginPct}%`, isPositive: marginPct >= 0, label: "margen del mes" }}
          description={`${money(report.total_profit)} histórico`}
        />
        <StatsCard
          title="Ingresos de la semana"
          value={money(summary.revenue_week)}
          icon={CalendarDays}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          variant="colored"
          description={`${money(summary.profit_week)} de ganancia`}
        />
        <StatsCard
          title="Ventas hoy"
          value={summary.sales_today}
          icon={ShoppingBag}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-50"
          variant="colored"
          description={`${money(summary.profit_today)} de ganancia hoy`}
        />
      </div>

      {/* Charts — tarjetas con header/footer + Suspense, igual que ChartsTrendRow */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ventas por día</CardTitle>
            <CardDescription>Ingresos de los últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <AreaChart
                className="h-80"
                data={report.sales_by_day}
                index="date"
                categories={["revenue"]}
                colors={["emerald"]}
                valueFormatter={(n: number) => money(n)}
              />
            </Suspense>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium">
              Tendencia de ventas diaria
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-muted-foreground">Solo ventas completadas</div>
          </CardFooter>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos vs Ganancia</CardTitle>
            <CardDescription>Comparación mensual (últimos 6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <ComboChart
                data={report.revenue_by_month}
                index="label"
                enableBiaxial
                barSeries={{ categories: ["revenue"], yAxisLabel: "Ingresos", colors: ["blue"] }}
                lineSeries={{
                  categories: ["profit"],
                  showYAxis: true,
                  yAxisLabel: "Ganancia",
                  colors: ["emerald"],
                  yAxisWidth: 50,
                }}
              />
            </Suspense>
          </CardContent>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="flex items-center gap-2 font-medium">
              Ganancia real (ingresos − costo)
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-muted-foreground">Basado en el costo de cada venta</div>
          </CardFooter>
        </Card>
      </div>

      {/* Top 10 productos */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Top 10 productos más vendidos</CardTitle>
          <CardDescription>Por unidades vendidas en ventas completadas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.top_products.length ? (
                report.top_products.map((p, i) => (
                  <TableRow key={`${p.name}-${i}`}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.brand || "—"}</TableCell>
                    <TableCell className="text-right">{p.units_sold}</TableCell>
                    <TableCell className="text-right font-medium">{money(p.revenue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Aún no hay ventas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
