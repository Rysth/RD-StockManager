import { lazy, Suspense, useEffect } from "react";
import toast from "react-hot-toast";
import { useReportStore } from "../../../stores/reportStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Truck,
  Receipt,
  Users,
  Landmark,
  Wallet,
} from "lucide-react";

const AreaChart = lazy(() =>
  import("../../../components/AreaChart").then((m) => ({ default: m.AreaChart })),
);

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("es-EC") : "—";

function ChartFallback() {
  return (
    <div className="flex h-72 items-center justify-center text-muted-foreground">
      Cargando gráfico...
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
    fetchPurchaseReport,
    fetchTaxReport,
    fetchContactReport,
    fetchExpenseReport,
    fetchCashRegisterReport,
    fetchSalesRepReport,
  } = useReportStore();

  useEffect(() => {
    Promise.all([
      fetchPurchaseReport(),
      fetchTaxReport(),
      fetchContactReport(),
      fetchExpenseReport(),
      fetchCashRegisterReport(),
      fetchSalesRepReport(),
    ]).catch((e) => toast.error(e?.message || "Error al cargar los reportes"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
        <p className="text-sm text-muted-foreground">
          Compras, impuestos, contactos, gastos, caja y vendedores
        </p>
      </div>

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
                <StatsCard title="Compras hoy" value={money(purchaseReport.summary.total_today)} icon={Truck} />
                <StatsCard title="Compras semana" value={money(purchaseReport.summary.total_week)} icon={Truck} />
                <StatsCard title="Compras mes" value={money(purchaseReport.summary.total_month)} icon={Truck} />
                <StatsCard title="Por pagar" value={money(purchaseReport.summary.payable)} icon={DollarSign} />
              </div>
              <Card>
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
                        <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">Sin compras registradas.</TableCell></TableRow>
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
          <Card>
            <CardHeader>
              <CardTitle>Reporte fiscal (IVA)</CardTitle>
              <CardDescription>IVA cobrado en ventas vs. pagado en compras, por mes</CardDescription>
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
                  {taxReport?.by_month.map((r) => (
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
        </TabsContent>

        {/* Contactos */}
        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reporte de contactos</CardTitle>
              <CardDescription>Saldos y última transacción por contacto</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contacto</TableHead>
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
                        <TableCell className="text-right">{money(c.total_purchased_by)}</TableCell>
                        <TableCell className="text-right">{money(c.total_sold_to_us)}</TableCell>
                        <TableCell className="text-right">{money(c.receivable)}</TableCell>
                        <TableCell className="text-right text-destructive">{money(c.payable)}</TableCell>
                        <TableCell>{fmtDate(c.last_transaction)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-20 text-center text-muted-foreground">Sin contactos.</TableCell></TableRow>
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
              <div className="grid grid-cols-3 gap-4">
                <StatsCard title="Gastos hoy" value={money(expenseReport.summary.total_today)} icon={Receipt} />
                <StatsCard title="Gastos semana" value={money(expenseReport.summary.total_week)} icon={Receipt} />
                <StatsCard title="Gastos mes" value={money(expenseReport.summary.total_month)} icon={Receipt} />
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Por categoría</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {expenseReport.by_category.map((r) => (
                          <TableRow key={r.category}><TableCell>{r.category}</TableCell><TableCell className="text-right font-medium">{money(r.total)}</TableCell></TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Por ubicación</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader><TableRow><TableHead>Ubicación</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {expenseReport.by_location.map((r) => (
                          <TableRow key={r.location}><TableCell>{r.location}</TableCell><TableCell className="text-right font-medium">{money(r.total)}</TableCell></TableRow>
                        ))}
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
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <StatsCard title="Ingresos hoy (efectivo)" value={money(cashRegisterReport.summary.income_today)} icon={Wallet} />
                <StatsCard title="Egresos hoy (efectivo)" value={money(cashRegisterReport.summary.expense_today)} icon={Receipt} />
                <StatsCard title="Neto hoy" value={money(cashRegisterReport.summary.net_today)} icon={DollarSign} />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Flujo de caja</CardTitle>
                  <CardDescription>Ingresos vs egresos en efectivo (últimos 30 días)</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<ChartFallback />}>
                    <AreaChart
                      className="h-72"
                      data={cashRegisterReport.by_day}
                      index="date"
                      categories={["income", "expense"]}
                      colors={["emerald", "amber"]}
                      valueFormatter={(n: number) => money(n)}
                    />
                  </Suspense>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Vendedores */}
        <TabsContent value="reps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Desempeño por vendedor</CardTitle>
              <CardDescription>Ventas y ganancia del mes en curso</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">N° ventas</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
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
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Sin ventas este mes.</TableCell></TableRow>
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
