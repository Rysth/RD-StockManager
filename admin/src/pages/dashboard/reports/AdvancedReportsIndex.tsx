import { lazy, Suspense, useEffect } from "react";
import toast from "react-hot-toast";
import { useReportStore } from "../../../stores/reportStore";
import { useLocationStore } from "../../../stores/locationStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Truck,
  Receipt,
  Users,
  Landmark,
  Wallet,
  BarChart3,
  TrendingUp,
  TrendingDown,
  MapPin,
  CalendarRange,
} from "lucide-react";

const AreaChart = lazy(() =>
  import("../../../components/AreaChart").then((m) => ({ default: m.AreaChart })),
);
const ComboChart = lazy(() =>
  import("../../../components/ComboChart").then((m) => ({ default: m.ComboChart })),
);
const DonutChart = lazy(() =>
  import("../../../components/DonutChart").then((m) => ({ default: m.DonutChart })),
);

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-EC") : "—";

function ChartFallback() {
  return (
    <div className="flex h-72 items-center justify-center text-muted-foreground">
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
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((id) => (
          <Skeleton key={id} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

export default function AdvancedReportsIndex() {
  const {
    purchaseReport,
    taxReport,
    contactReport,
    expenseReport,
    cashRegisterReport,
    salesRepReport,
    filters,
    isLoading,
    setFilters,
    fetchAll,
  } = useReportStore();
  const { locations, fetchLocations } = useLocationStore();

  useEffect(() => {
    fetchLocations().catch(() => {});
    fetchAll().catch((e) => toast.error(e?.message || "Error al cargar los reportes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () =>
    fetchAll().catch((e) => toast.error(e?.message || "Error al cargar los reportes"));

  const onLocation = (value: string) => {
    setFilters({ locationId: value ? Number(value) : null });
    reload();
  };
  const onStart = (value: string) => {
    setFilters({ startDate: value || null });
    reload();
  };
  const onEnd = (value: string) => {
    setFilters({ endDate: value || null });
    reload();
  };
  const clearFilters = () => {
    setFilters({ locationId: null, startDate: null, endDate: null });
    reload();
  };

  const hasFilters = Boolean(filters.locationId || filters.startDate || filters.endDate);

  // Primera carga: aún no hay ningún reporte cargado.
  const firstLoad =
    isLoading &&
    !purchaseReport &&
    !taxReport &&
    !contactReport &&
    !expenseReport &&
    !cashRegisterReport &&
    !salesRepReport;
  if (firstLoad) return <ReportsSkeleton />;

  // Totales agregados para Contactos.
  const totalReceivable = contactReport?.reduce((s, c) => s + (c.receivable || 0), 0) ?? 0;
  const totalPayable = contactReport?.reduce((s, c) => s + (c.payable || 0), 0) ?? 0;
  const netTaxTotal = taxReport?.by_month.reduce((s, r) => s + (r.net_tax || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Banner — mismo estilo que el Dashboard */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-primary via-primary/90 to-primary/75 text-primary-foreground shadow-md">
        <CardContent className="py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="hidden rounded-xl bg-white/15 p-2.5 backdrop-blur-sm sm:block">
                <BarChart3 className="size-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Informes</h1>
                <p className="mt-1 text-sm text-primary-foreground/80">
                  Compras, impuestos, contactos, gastos, caja y vendedores
                </p>
              </div>
            </div>
            {hasFilters && (
              <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-primary-foreground/80 backdrop-blur-sm">
                <CalendarRange className="size-4" />
                Filtros activos
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filtros: ubicación + rango de fechas */}
      <Card className="shadow-sm">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:flex-wrap md:items-end">
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5" /> Ubicación
            </label>
            <select
              value={filters.locationId ?? ""}
              onChange={(e) => onLocation(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Todas las ubicaciones</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarRange className="size-3.5" /> Desde
            </label>
            <input
              type="date"
              value={filters.startDate ?? ""}
              max={filters.endDate ?? undefined}
              onChange={(e) => onStart(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarRange className="size-3.5" /> Hasta
            </label>
            <input
              type="date"
              value={filters.endDate ?? ""}
              min={filters.startDate ?? undefined}
              onChange={(e) => onEnd(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Limpiar filtros
            </button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="purchases">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="purchases"><Truck className="mr-1.5 size-4" />Compras</TabsTrigger>
          <TabsTrigger value="taxes"><Landmark className="mr-1.5 size-4" />Fiscal</TabsTrigger>
          <TabsTrigger value="contacts"><Users className="mr-1.5 size-4" />Contactos</TabsTrigger>
          <TabsTrigger value="expenses"><Receipt className="mr-1.5 size-4" />Gastos</TabsTrigger>
          <TabsTrigger value="cash"><Wallet className="mr-1.5 size-4" />Caja</TabsTrigger>
          <TabsTrigger value="reps"><DollarSign className="mr-1.5 size-4" />Vendedores</TabsTrigger>
        </TabsList>

        {/* Compras */}
        <TabsContent value="purchases" className="space-y-4">
          {purchaseReport && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatsCard title="Compras hoy" value={money(purchaseReport.summary.total_today)} icon={Truck} iconColor="text-blue-600" iconBgColor="bg-blue-50" variant="colored" />
                <StatsCard title="Compras semana" value={money(purchaseReport.summary.total_week)} icon={Truck} iconColor="text-violet-600" iconBgColor="bg-violet-50" variant="colored" />
                <StatsCard title="Compras mes" value={money(purchaseReport.summary.total_month)} icon={Truck} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" variant="colored" />
                <StatsCard title="Por pagar" value={money(purchaseReport.summary.payable)} icon={DollarSign} iconColor="text-amber-600" iconBgColor="bg-amber-50" variant="colored" />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Distribución por proveedor</CardTitle>
                    <CardDescription>Participación en el monto comprado</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartFallback />}>
                      <DonutChart
                        className="h-72"
                        data={purchaseReport.by_supplier}
                        category="supplier"
                        value="total"
                        colors={["blue", "emerald", "violet", "amber", "teal", "pink"]}
                        valueFormatter={(n: number) => money(n)}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Compras por mes</CardTitle>
                    <CardDescription>Monto y número de compras</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartFallback />}>
                      <ComboChart
                        data={purchaseReport.by_month}
                        index="label"
                        enableBiaxial
                        barSeries={{ categories: ["total"], yAxisLabel: "Monto", colors: ["blue"] }}
                        lineSeries={{ categories: ["count"], showYAxis: true, yAxisLabel: "N°", colors: ["amber"], yAxisWidth: 40 }}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Compras por proveedor</CardTitle>
                  <CardDescription>Top 10 proveedores por monto comprado</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-right">Compras</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseReport.by_supplier.length ? (
                        purchaseReport.by_supplier.map((r) => (
                          <TableRow key={r.supplier}>
                            <TableCell>{r.supplier}</TableCell>
                            <TableCell className="text-right">{r.count}</TableCell>
                            <TableCell className="text-right font-medium">{money(r.total)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">Sin compras en el período.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Fiscal */}
        <TabsContent value="taxes" className="space-y-4">
          {taxReport && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatsCard
                  title="IVA cobrado (período)"
                  value={money(taxReport.by_month.reduce((s, r) => s + r.tax_collected, 0))}
                  icon={TrendingUp}
                  iconColor="text-emerald-600"
                  iconBgColor="bg-emerald-50"
                  variant="colored"
                />
                <StatsCard
                  title="IVA pagado (período)"
                  value={money(taxReport.by_month.reduce((s, r) => s + r.tax_paid, 0))}
                  icon={TrendingDown}
                  iconColor="text-amber-600"
                  iconBgColor="bg-amber-50"
                  variant="colored"
                />
                <StatsCard
                  title="IVA neto"
                  value={money(netTaxTotal)}
                  icon={Landmark}
                  iconColor="text-blue-600"
                  iconBgColor="bg-blue-50"
                  variant="colored"
                  description={netTaxTotal >= 0 ? "A pagar al SRI" : "A favor"}
                />
              </div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>IVA cobrado vs. pagado</CardTitle>
                  <CardDescription>Comparación mensual (IVA 15% Ecuador)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartFallback />}>
                    <ComboChart
                      data={taxReport.by_month}
                      index="label"
                      barSeries={{ categories: ["tax_collected", "tax_paid"], yAxisLabel: "IVA", colors: ["emerald", "amber"] }}
                      lineSeries={{ categories: [] }}
                    />
                  </Suspense>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                  IVA cobrado en ventas vs. IVA pagado en compras.
                </CardFooter>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Reporte fiscal (IVA)</CardTitle>
                  <CardDescription>Detalle mensual</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mes</TableHead>
                        <TableHead className="text-right">Ventas</TableHead>
                        <TableHead className="text-right">IVA cobrado</TableHead>
                        <TableHead className="text-right">IVA pagado</TableHead>
                        <TableHead className="text-right">IVA neto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxReport.by_month.map((r) => (
                        <TableRow key={r.month}>
                          <TableCell>{r.label}</TableCell>
                          <TableCell className="text-right">{money(r.sales_total)}</TableCell>
                          <TableCell className="text-right">{money(r.tax_collected)}</TableCell>
                          <TableCell className="text-right">{money(r.tax_paid)}</TableCell>
                          <TableCell className="text-right font-medium">{money(r.net_tax)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Contactos */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatsCard
              title="Total por cobrar"
              value={money(totalReceivable)}
              icon={TrendingUp}
              iconColor="text-emerald-600"
              iconBgColor="bg-emerald-50"
              variant="colored"
              description="Saldo de clientes"
            />
            <StatsCard
              title="Total por pagar"
              value={money(totalPayable)}
              icon={TrendingDown}
              iconColor="text-amber-600"
              iconBgColor="bg-amber-50"
              variant="colored"
              description="Saldo a proveedores"
            />
          </div>
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Reporte de contactos</CardTitle>
              <CardDescription>Saldos y última transacción por contacto</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Le compró</TableHead>
                    <TableHead className="text-right">Nos vendió</TableHead>
                    <TableHead className="text-right">Por cobrar</TableHead>
                    <TableHead className="text-right">Por pagar</TableHead>
                    <TableHead>Última</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contactReport?.length ? (
                    contactReport.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {c.is_customer && <Badge variant="secondary">Cliente</Badge>}
                            {c.is_supplier && <Badge variant="outline">Proveedor</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{money(c.total_purchased_by)}</TableCell>
                        <TableCell className="text-right">{money(c.total_sold_to_us)}</TableCell>
                        <TableCell className="text-right text-emerald-600">{money(c.receivable)}</TableCell>
                        <TableCell className="text-right text-destructive">{money(c.payable)}</TableCell>
                        <TableCell>{fmtDate(c.last_transaction)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={7} className="h-20 text-center text-muted-foreground">Sin contactos.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gastos */}
        <TabsContent value="expenses" className="space-y-4">
          {expenseReport && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatsCard title="Gastos hoy" value={money(expenseReport.summary.total_today)} icon={Receipt} iconColor="text-blue-600" iconBgColor="bg-blue-50" variant="colored" />
                <StatsCard title="Gastos semana" value={money(expenseReport.summary.total_week)} icon={Receipt} iconColor="text-violet-600" iconBgColor="bg-violet-50" variant="colored" />
                <StatsCard title="Gastos mes" value={money(expenseReport.summary.total_month)} icon={Receipt} iconColor="text-amber-600" iconBgColor="bg-amber-50" variant="colored" />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Gastos por categoría</CardTitle>
                    <CardDescription>Participación por tipo de gasto</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartFallback />}>
                      <DonutChart
                        className="h-72"
                        data={expenseReport.by_category}
                        category="category"
                        value="total"
                        colors={["amber", "blue", "emerald", "violet", "teal", "pink"]}
                        valueFormatter={(n: number) => money(n)}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Gastos por mes</CardTitle>
                    <CardDescription>Evolución mensual</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<ChartFallback />}>
                      <ComboChart
                        data={expenseReport.by_month}
                        index="label"
                        barSeries={{ categories: ["total"], yAxisLabel: "Total", colors: ["amber"] }}
                        lineSeries={{ categories: [] }}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader><CardTitle>Por categoría</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {expenseReport.by_category.length ? (
                          expenseReport.by_category.map((r) => (
                            <TableRow key={r.category}><TableCell>{r.category}</TableCell><TableCell className="text-right font-medium">{money(r.total)}</TableCell></TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={2} className="h-20 text-center text-muted-foreground">Sin gastos.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardHeader><CardTitle>Por ubicación</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Ubicación</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {expenseReport.by_location.length ? (
                          expenseReport.by_location.map((r) => (
                            <TableRow key={r.location}><TableCell>{r.location}</TableCell><TableCell className="text-right font-medium">{money(r.total)}</TableCell></TableRow>
                          ))
                        ) : (
                          <TableRow><TableCell colSpan={2} className="h-20 text-center text-muted-foreground">Sin gastos.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Caja */}
        <TabsContent value="cash" className="space-y-4">
          {cashRegisterReport && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatsCard title="Ingresos hoy (efectivo)" value={money(cashRegisterReport.summary.income_today)} icon={TrendingUp} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" variant="colored" />
                <StatsCard title="Egresos hoy (efectivo)" value={money(cashRegisterReport.summary.expense_today)} icon={TrendingDown} iconColor="text-amber-600" iconBgColor="bg-amber-50" variant="colored" />
                <StatsCard title="Neto hoy" value={money(cashRegisterReport.summary.net_today)} icon={Wallet} iconColor="text-blue-600" iconBgColor="bg-blue-50" variant="colored" />
              </div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Flujo de caja</CardTitle>
                  <CardDescription>Ingresos vs egresos en efectivo</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartFallback />}>
                    <AreaChart
                      className="h-80"
                      data={cashRegisterReport.by_day}
                      index="date"
                      categories={["income", "expense"]}
                      colors={["emerald", "amber"]}
                      valueFormatter={(n: number) => money(n)}
                    />
                  </Suspense>
                </CardContent>
                <CardFooter className="flex-col items-start gap-1.5 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    Solo movimientos en efectivo
                    <Wallet className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-muted-foreground">Ventas al contado vs. gastos pagados en efectivo</div>
                </CardFooter>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Vendedores */}
        <TabsContent value="reps" className="space-y-4">
          {salesRepReport && salesRepReport.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Ingresos por vendedor</CardTitle>
                <CardDescription>Comparación de ventas del período</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ChartFallback />}>
                  <ComboChart
                    data={salesRepReport as unknown as Record<string, unknown>[]}
                    index="seller"
                    barSeries={{ categories: ["revenue"], yAxisLabel: "Ingresos", colors: ["emerald"] }}
                    lineSeries={{ categories: [] }}
                  />
                </Suspense>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Desempeño por vendedor</CardTitle>
              <CardDescription>Ventas y ganancia del período</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">N° ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRepReport?.length ? (
                    salesRepReport.map((r) => (
                      <TableRow key={r.user_id ?? r.seller}>
                        <TableCell className="font-medium">{r.seller}</TableCell>
                        <TableCell className="text-right">{r.sales_count}</TableCell>
                        <TableCell className="text-right">{money(r.revenue)}</TableCell>
                        <TableCell className="text-right font-medium">{money(r.profit)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.revenue > 0 ? `${Math.round((r.profit / r.revenue) * 100)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">Sin ventas en el período.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
