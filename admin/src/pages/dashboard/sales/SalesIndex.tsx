import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "../../../components/common/Pagination";
import { useSaleStore } from "../../../stores/saleStore";
import type { SaleStatus } from "../../../types/inventory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const STATUS_META: Record<SaleStatus, { label: string; className: string }> = {
  completed: {
    label: "Completada",
    className: "bg-green-100 text-green-800 hover:bg-green-100",
  },
  pending: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-100 text-red-800 hover:bg-red-100",
  },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

function SaleListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-44 rounded-md" />
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="ml-auto flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SalesList() {
  const {
    sales,
    pagination,
    isLoading,
    fetchSales,
    updateSaleStatus,
    selectedSale,
    isLoadingDetail,
    fetchSale,
    clearSelectedSale,
  } = useSaleStore();
  const [firstLoad, setFirstLoad] = useState(true);
  const [status, setStatus] = useState<SaleStatus | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchSales(1, pagination.per_page, { status })
      .catch((e) => toast.error(errorMessage(e, "Error al cargar ventas")))
      .finally(() => setFirstLoad(false));
  }, [fetchSales, pagination.per_page, status]);

  const openDetail = (id: number) => {
    setDrawerOpen(true);
    fetchSale(id);
  };

  const confirmCancel = async () => {
    if (cancelId == null) return;
    try {
      await updateSaleStatus(cancelId, "cancelled");
      toast.success("Venta cancelada - stock restaurado");
      if (selectedSale?.id === cancelId) {
        setDrawerOpen(false);
        clearSelectedSale();
      }
    } catch (e) {
      toast.error(errorMessage(e, "Error al cancelar la venta"));
    } finally {
      setCancelId(null);
    }
  };

  const confirmComplete = async () => {
    if (completeId == null) return;
    try {
      await updateSaleStatus(completeId, "completed");
      toast.success("Pedido completado - stock descontado");
      if (selectedSale?.id === completeId) {
        setDrawerOpen(false);
        clearSelectedSale();
      }
    } catch (e) {
      toast.error(errorMessage(e, "Error al completar el pedido"));
    } finally {
      setCompleteId(null);
    }
  };

  if (isLoading && firstLoad) return <SaleListSkeleton />;

  return (
    <div className="space-y-4">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as SaleStatus | "")}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Todos los estados</option>
        <option value="completed">Completadas</option>
        <option value="pending">Pendientes</option>
        <option value="cancelled">Canceladas</option>
      </select>

      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Cargando ventas...
                  </TableCell>
                </TableRow>
              ) : sales.length ? (
                sales.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(s.id)}
                  >
                    <TableCell>
                      {s.sold_at ? new Date(s.sold_at).toLocaleDateString("es-EC") : "-"}
                    </TableCell>
                    <TableCell>{s.customer_name || "Consumidor final"}</TableCell>
                    <TableCell>{s.seller || "-"}</TableCell>
                    <TableCell>{s.items_count}</TableCell>
                    <TableCell className="font-medium">{money(s.total)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_META[s.status].className}>
                        {STATUS_META[s.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDetail(s.id)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {s.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => setCompleteId(s.id)}
                        >
                          Confirmar entrega
                        </Button>
                      )}
                      {s.status !== "cancelled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setCancelId(s.id)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay ventas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        currentPage={pagination.current_page - 1}
        pageCount={pagination.total_pages}
        totalCount={pagination.total_count}
        perPage={pagination.per_page}
        onPageChange={({ selected }) => fetchSales(selected + 1, pagination.per_page, { status })}
      />

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) clearSelectedSale();
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalle de venta {selectedSale ? `#${selectedSale.id}` : ""}</SheetTitle>
            <SheetDescription>Información completa de la transacción</SheetDescription>
          </SheetHeader>

          {isLoadingDetail || !selectedSale ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <div className="space-y-4 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedSale.customer_name || "Consumidor final"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedSale.seller || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {selectedSale.sold_at
                      ? new Date(selectedSale.sold_at).toLocaleString("es-EC")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <Badge variant="secondary" className={STATUS_META[selectedSale.status].className}>
                    {STATUS_META[selectedSale.status].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Método de pago</p>
                  <p className="font-medium">
                    {PAYMENT_LABEL[selectedSale.payment_method ?? "cash"] || "-"}
                    {selectedSale.cash_on_delivery ? " · Contra entrega" : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <p className="font-medium">{it.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.size || "-"}/{it.color || "-"} · {it.sku}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">{it.quantity}</TableCell>
                        <TableCell className="text-right">{money(it.unit_price)}</TableCell>
                        <TableCell className="text-right">{money(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="text-lg font-bold">{money(selectedSale.total)}</span>
                </div>
                {selectedSale.profit != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ganancia</span>
                    <span className="font-medium text-emerald-600">
                      {money(selectedSale.profit)}
                    </span>
                  </div>
                )}
              </div>

              {selectedSale.status === "pending" && (
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setCompleteId(selectedSale.id)}
                >
                  Confirmar entrega y pago
                </Button>
              )}
              {selectedSale.status !== "cancelled" && (
                <Button
                  variant="outline"
                  className="w-full text-destructive"
                  onClick={() => setCancelId(selectedSale.id)}
                >
                  Cancelar venta
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={cancelId != null} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Cancelar venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas cancelar esta venta? El stock de los productos será restaurado.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cancelar venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={completeId != null} onOpenChange={(open) => !open && setCompleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrega y pago</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmás que el pedido fue entregado y el pago recibido? La venta pasará a
              <strong> Completada</strong> y se descontará el stock de los productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmComplete}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Sí, confirmar entrega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SalesIndex() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">
          Consulta ventas, pedidos contra entrega y cancelaciones.
        </p>
      </div>

      <SalesList />
    </div>
  );
}
