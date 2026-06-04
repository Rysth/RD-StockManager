import { lazy, Suspense, useEffect } from "react";
import { Navigate, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useSaleStore } from "../../stores/saleStore";
import { useInventoryStore } from "../../stores/inventoryStore";
import { usePurchaseStore } from "../../stores/purchaseStore";
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
import { Badge } from "@/components/ui/badge";
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
  Clock,
  CheckCircle2,
  ImageIcon,
  PackagePlus,
} from "lucide-react";
import toast from "react-hot-toast";

const AreaChart = lazy(() =>
  import("../../components/AreaChart").then((m) => ({ default: m.AreaChart })),
);
const ComboChart = lazy(() =>
  import("../../components/ComboChart").then((m) => ({
    default: m.ComboChart,
  })),
);

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    n || 0,
  );

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
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

// Acceso rápido
const QUICK_LINKS = [
  {
    to: "/dashboard/pos",
    icon: ShoppingBag,
    label: "Nueva venta",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    perm: Permissions.MANAGE_SALES,
  },
  {
    to: "/dashboard/pos?mode=purchase",
    icon: PackagePlus,
    label: "Ingreso rápido",
    color: "text-blue-600",
    bg: "bg-blue-50",
    perm: Permissions.VIEW_PURCHASES,
  },
  {
    to: "/dashboard/expenses",
    icon: Receipt,
    label: "Nuevo gasto",
    color: "text-amber-600",
    bg: "bg-amber-50",
    perm: Permissions.VIEW_EXPENSES,
  },
  {
    to: "/dashboard/customers",
    icon: Users2,
    label: "Contactos",
    color: "text-violet-600",
    bg: "bg-violet-50",
    perm: Permissions.MANAGE_CUSTOMERS,
  },
  {
    to: "/dashboard/products",
    icon: Package2,
    label: "Inventario",
    color: "text-teal-600",
    bg: "bg-teal-50",
    perm: Permissions.VIEW_INVENTORY,
  },
  {
    to: "/dashboard/sales",
    icon: ShoppingCart,
    label: "Ver ventas",
    color: "text-rose-600",
    bg: "bg-rose-50",
    perm: Permissions.MANAGE_SALES,
  },
];

function PanelHeader({
  title,
  count,
  linkTo,
  linkLabel = "Ver todos →",
}: {
  title: string;
  count?: number;
  linkTo: string;
  linkLabel?: string;
}) {
  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base font-semibold">
          {title}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {count}
            </Badge>
          )}
        </CardTitle>
        <NavLink
          to={linkTo}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          {linkLabel} <ArrowRight className="h-3 w-3" />
        </NavLink>
      </div>
    </CardHeader>
  );
}

export default function Dashboard() {
  const { user, hasPermission } = useAuthStore();
  const {
    report,
    sales,
    isLoading: salesLoading,
    fetchReport,
    fetchSales,
  } = useSaleStore();
  const { stats, lowStock, fetchStats, fetchLowStock } = useInventoryStore();
  const { duePurchases, fetchDue } = usePurchaseStore();
  const navigate = useNavigate();

  const canViewReports = hasPermission(Permissions.VIEW_REPORTS);
  const canViewInventory = hasPermission(Permissions.VIEW_INVENTORY);
  const canManageSales = hasPermission(Permissions.MANAGE_SALES);
  const canViewPurchases = hasPermission(Permissions.VIEW_PURCHASES);

  useEffect(() => {
    if (!canViewReports) return;

    fetchReport().catch((e) =>
      toast.error(e?.message || "Error al cargar reportes"),
    );
    if (canViewInventory) {
      fetchStats().catch(() => {});
      fetchLowStock().catch(() => {});
    }
    if (canManageSales) {
      fetchSales(1, 8, { status: "pending" }).catch(() => {});
    }
    if (canViewPurchases) {
      fetchDue().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!canViewReports) return <Navigate to="/dashboard/sales" replace />;

  if (salesLoading && !report) return <DashboardSkeleton />;
  if (!report) return null;

  const { summary } = report;
  const marginPct =
    summary.revenue_month > 0
      ? Math.round((summary.profit_month / summary.revenue_month) * 100)
      : 0;

  const firstName = user?.fullname?.split(" ")[0] || "bienvenido";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const pendingSales = sales.filter((s) => s.status === "pending");
  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date(new Date().toDateString());
  };
  const isDueSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  };

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
              {QUICK_LINKS.filter((l) => hasPermission(l.perm))
                .slice(0, 4)
                .map((l) => (
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
          trend={{
            value: `${marginPct}%`,
            isPositive: marginPct >= 0,
            label: "margen",
          }}
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
            iconColor={
              stats.low_stock_count > 0 ? "text-amber-600" : "text-emerald-600"
            }
            iconBgColor={
              stats.low_stock_count > 0 ? "bg-amber-50" : "bg-emerald-50"
            }
            variant="colored"
            description={
              stats.low_stock_count > 0
                ? "Requieren reposición"
                : "Stock saludable"
            }
          />
          <StatsCard
            title="Sin stock"
            value={stats.out_of_stock_count}
            icon={Package2}
            iconColor={
              stats.out_of_stock_count > 0
                ? "text-rose-600"
                : "text-emerald-600"
            }
            iconBgColor={
              stats.out_of_stock_count > 0 ? "bg-rose-50" : "bg-emerald-50"
            }
            variant="colored"
            description={
              stats.out_of_stock_count > 0
                ? "Variantes agotadas"
                : "Todas con stock"
            }
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

      {/* ── Paneles operativos ── */}
      {(canManageSales || canViewInventory || canViewPurchases) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Panel 1: Ventas pendientes */}
          {canManageSales && (
            <Card className="shadow-sm">
              <PanelHeader
                title="Ventas pendientes"
                count={pendingSales.length}
                linkTo="/dashboard/sales"
              />
              <CardContent className="p-0">
                {pendingSales.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <p>No hay ventas pendientes</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {pendingSales.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => navigate("/dashboard/sales")}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary">
                            {s.code}
                          </p>
                          <p className="truncate text-sm">
                            {s.customer_name || "Consumidor final"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {s.sold_at
                              ? new Date(s.sold_at).toLocaleDateString("es-EC")
                              : "—"}
                          </p>
                        </div>
                        <div className="ml-3 shrink-0 text-right">
                          <p className="font-semibold">{money(s.total)}</p>
                          <Badge
                            variant="secondary"
                            className="mt-0.5 bg-amber-100 text-amber-800 text-[10px]"
                          >
                            <Clock className="mr-1 h-2.5 w-2.5" /> Pendiente
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Panel 2: Stock crítico */}
          {canViewInventory && (
            <Card className="shadow-sm">
              <PanelHeader
                title="Stock crítico"
                count={lowStock.length}
                linkTo="/dashboard/products"
                linkLabel="Ver inventario →"
              />
              <CardContent className="p-0">
                {lowStock.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <p>Todo el inventario tiene stock</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {lowStock.slice(0, 8).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => navigate("/dashboard/products")}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {v.product_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {[v.size, v.color].filter(Boolean).join(" / ") ||
                              v.sku}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`shrink-0 text-[10px] ${
                            v.stock === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {v.stock === 0 ? "Sin stock" : `${v.stock} uds`}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Panel 3: Compras por vencer/pagar */}
          {canViewPurchases && (
            <Card className="shadow-sm">
              <PanelHeader
                title="Por pagar / vencer"
                count={duePurchases.length}
                linkTo="/dashboard/purchases"
                linkLabel="Ver compras →"
              />
              <CardContent className="p-0">
                {duePurchases.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    <p>Sin compras por pagar</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {duePurchases.slice(0, 8).map((p) => {
                      const overdue = isOverdue(p.due_date ?? null);
                      const soon = !overdue && isDueSoon(p.due_date ?? null);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => navigate("/dashboard/purchases")}
                          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-primary">
                              {p.code}
                            </p>
                            <p className="truncate text-sm">
                              {p.supplier_name || "Sin proveedor"}
                            </p>
                            {p.due_date && (
                              <p
                                className={`text-xs ${overdue ? "text-red-600 font-medium" : soon ? "text-amber-600" : "text-muted-foreground"}`}
                              >
                                Vence:{" "}
                                {new Date(p.due_date).toLocaleDateString(
                                  "es-EC",
                                )}
                              </p>
                            )}
                          </div>
                          <div className="ml-3 shrink-0 text-right">
                            <p className="font-semibold text-destructive">
                              {money(p.balance_due)}
                            </p>
                            <Badge
                              variant="secondary"
                              className={`mt-0.5 text-[10px] ${
                                overdue
                                  ? "bg-red-100 text-red-700"
                                  : soon
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              <Truck className="mr-1 h-2.5 w-2.5" />
                              {overdue
                                ? "Vencida"
                                : soon
                                  ? "Vence pronto"
                                  : "Por pagar"}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
                barSeries={{
                  categories: ["revenue"],
                  yAxisLabel: "Ingresos",
                  colors: ["blue"],
                }}
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
          <CardDescription>
            Por unidades vendidas en ventas completadas
          </CardDescription>
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
                    <TableCell className="text-muted-foreground font-medium">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.brand || "—"}</TableCell>
                    <TableCell className="text-right">{p.units_sold}</TableCell>
                    <TableCell className="text-right font-medium">
                      {money(p.revenue)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
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
