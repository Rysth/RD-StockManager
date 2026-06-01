import { lazy, Suspense, useEffect } from "react";
import { Navigate, NavLink } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useSaleStore } from "../../stores/saleStore";
import { useInventoryStore } from "../../stores/inventoryStore";
import { Permissions } from "../../types/auth";
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
import {
  DollarSign,
  TrendingUp,
  CalendarDays,
  ShoppingBag,
  Package2,
  AlertTriangle,
  Users2,
  ShoppingCart,
  ArrowRight,
  Truck,
  Receipt,
} from "lucide-react";
import toast from "react-hot-toast";

const AreaChart = lazy(() =>
  import("../../components/AreaChart").then((m) => ({ default: m.AreaChart })),
);
const ComboChart = lazy(() =>
  import("../../components/ComboChart").then((m) => ({ default: m.ComboChart })),
);

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

// Acceso rápido: icono, etiqueta, ruta y si requiere permiso
const QUICK_LINKS = [
  { to: "/dashboard/pos",       icon: ShoppingBag, label: "Nueva venta",    color: "text-emerald-600", bg: "bg-emerald-50", perm: Permissions.MANAGE_SALES },
  { to: "/dashboard/purchases", icon: Truck,        label: "Nueva compra",   color: "text-blue-600",    bg: "bg-blue-50",    perm: Permissions.VIEW_PURCHASES },
  { to: "/dashboard/expenses",  icon: Receipt,      label: "Nuevo gasto",    color: "text-amber-600",   bg: "bg-amber-50",   perm: Permissions.VIEW_EXPENSES },
  { to: "/dashboard/customers", icon: Users2,       label: "Contactos",      color: "text-violet-600",  bg: "bg-violet-50",  perm: Permissions.MANAGE_CUSTOMERS },
  { to: "/dashboard/products",  icon: Package2,     label: "Inventario",     color: "text-teal-600",    bg: "bg-teal-50",    perm: Permissions.VIEW_INVENTORY },
  { to: "/dashboard/sales",     icon: ShoppingCart, label: "Ver ventas",     color: "text-rose-600",    bg: "bg-rose-50",    perm: Permissions.MANAGE_SALES },
];

export default function Dashboard() {
  const { user, hasPermission } = useAuthStore();
  const { report, isLoading: salesLoading, fetchReport } = useSaleStore();
  const { stats, fetchStats } = useInventoryStore();

  const canViewReports   = hasPermission(Permissions.VIEW_REPORTS);
  const canViewInventory = hasPermission(Permissions.VIEW_INVENTORY);

  // Empleados sin reports → redirect a ventas
  if (!canViewReports) return <Navigate to="/dashboard/sales" replace />;

  useEffect(() => {
    fetchReport().catch((e) => toast.error(e?.message || "Error al cargar reportes"));
    if (canViewInventory) {
      fetchStats().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (salesLoading && !report) return <DashboardSkeleton />;
  if (!report) return null;

  const { summary } = report;
  const marginPct =
    summary.revenue_month > 0
      ? Math.round((summary.profit_month / summary.revenue_month) * 100)
      : 0;

  const firstName = user?.fullname?.split(" ")[0] || "bienvenido";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-6">
      {/* Banner de bienvenida */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-primary-foreground shadow-md">
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {greeting}, {firstName} 👋
              </h1>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Aquí tienes el resumen del negocio de hoy.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_LINKS.filter((l) => hasPermission(l.perm)).slice(0, 4).map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <l.icon className="size-3.5" />
                  {l.label}
                  <ArrowRight className="size-3" />
                </NavLink>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs de ventas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
          trend={{ value: `${marginPct}%`, isPositive: marginPct >= 0, label: "margen" }}
        />
        <StatsCard
          title="Ingresos semana"
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
          description={`${money(summary.profit_today)} de ganancia`}
        />
      </div>

      {/* KPIs de inventario */}
      {canViewInventory && stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard
            title="Productos activos"
            value={stats.active_products}
            icon={Package2}
            iconColor="text-violet-600"
            iconBgColor="bg-violet-50"
            variant="colored"
            description={`${stats.total_variants} variantes totales`}
          />
          <StatsCard
            title="Stock bajo"
            value={stats.low_stock_count}
            icon={AlertTriangle}
            iconColor={stats.low_stock_count > 0 ? "text-amber-600" : "text-emerald-600"}
            iconBgColor={stats.low_stock_count > 0 ? "bg-amber-50" : "bg-emerald-50"}
            variant="colored"
            description={stats.low_stock_count > 0 ? "Requieren reposición" : "Stock saludable"}
          />
          <StatsCard
            title="Sin stock"
            value={stats.out_of_stock_count}
            icon={Package2}
            iconColor={stats.out_of_stock_count > 0 ? "text-rose-600" : "text-emerald-600"}
            iconBgColor={stats.out_of_stock_count > 0 ? "bg-rose-50" : "bg-emerald-50"}
            variant="colored"
            description={stats.out_of_stock_count > 0 ? "Variantes agotadas" : "Todas con stock"}
          />
          <StatsCard
            title="Clientes"
            value={stats.total_customers}
            icon={Users2}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
            variant="colored"
          />
        </div>
      )}

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ventas por día</CardTitle>
            <CardDescription>Ingresos de los últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ChartFallback />}>
              <AreaChart
                className="h-72"
                data={report.sales_by_day}
                index="date"
                categories={["revenue"]}
                colors={["emerald"]}
                valueFormatter={(n: number) => money(n)}
              />
            </Suspense>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            Solo ventas completadas
          </CardFooter>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos vs Ganancia</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
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
          <CardFooter className="text-sm text-muted-foreground">
            Ganancia real (ingresos − costo de ventas)
          </CardFooter>
        </Card>
      </div>

      {/* Top productos */}
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
                    <TableCell className="text-muted-foreground font-medium">{i + 1}</TableCell>
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
