import { useEffect } from "react";
import { DollarSign, CalendarDays, TrendingUp, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { StatsCard } from "@/components/ui/stats-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AreaChart } from "../../../components/AreaChart";
import { ComboChart } from "../../../components/ComboChart";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

export default function ReportsIndex() {
  const { report, isLoading, fetchReport } = useSaleStore();

  useEffect(() => {
    fetchReport().catch((e) => toast.error(e.message || "Error al cargar el reporte"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = report?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes de Ventas</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de ingresos y productos más vendidos
        </p>
      </div>

      {/* 4 summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ingresos hoy"
          value={money(summary?.revenue_today ?? 0)}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100"
        />
        <StatsCard
          title="Ingresos esta semana"
          value={money(summary?.revenue_week ?? 0)}
          icon={CalendarDays}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100"
        />
        <StatsCard
          title="Ingresos este mes"
          value={money(summary?.revenue_month ?? 0)}
          icon={TrendingUp}
          iconColor="text-violet-600"
          iconBgColor="bg-violet-100"
        />
        <StatsCard
          title="Ventas hoy"
          value={summary?.sales_today ?? 0}
          icon={ShoppingBag}
          iconColor="text-amber-600"
          iconBgColor="bg-amber-100"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <h2 className="mb-4 font-semibold">Ventas por día (últimos 30 días)</h2>
            <AreaChart
              data={report?.sales_by_day ?? []}
              index="date"
              categories={["revenue"]}
              colors={["emerald"]}
              valueFormatter={(v) => money(v)}
              className="h-72"
            />
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardContent className="p-5">
            <h2 className="mb-4 font-semibold">Ingresos por mes (últimos 6 meses)</h2>
            <ComboChart
              data={report?.revenue_by_month ?? []}
              index="label"
              barSeries={{ categories: ["revenue"], colors: ["blue"] }}
              lineSeries={{ categories: ["count"], colors: ["amber"] }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Top 10 products */}
      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <div className="border-b p-4">
            <h2 className="font-semibold">Top 10 productos más vendidos</h2>
          </div>
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
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">Cargando...</TableCell>
                </TableRow>
              ) : report?.top_products?.length ? (
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
