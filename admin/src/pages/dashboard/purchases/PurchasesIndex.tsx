import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  PackageCheck,
  Ban,
  DollarSign,
  PackagePlus,
  Truck,
  SearchX,
  Clock,
  CircleDollarSign,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import type { Purchase, PurchaseStatus, PaymentStatus } from "../../../types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import { ActionIconButton } from "../../../components/common/RowActions";
import PurchaseDetailSheet from "./PurchaseDetailSheet";
import PaymentDialog from "./PaymentDialog";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const STATUS_LABEL: Record<PurchaseStatus, string> = {
  draft: "Por recibir",
  received: "Recibida",
  cancelled: "Cancelada",
};
const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  due: "Por pagar",
  partial: "Parcial",
  paid: "Pagada",
};
const statusVariant = (s: PurchaseStatus) =>
  s === "received" ? "default" : s === "cancelled" ? "destructive" : "secondary";
const paymentVariant = (s: PaymentStatus) =>
  s === "paid" ? "default" : s === "partial" ? "secondary" : "destructive";

export default function PurchasesIndex() {
  const {
    purchases,
    pagination,
    isLoading,
    fetchPurchases,
    fetchPurchase,
    updatePurchaseStatus,
    deletePurchase,
  } = usePurchaseStore();
  const { locations, fetchLocations } = useLocationStore();
  const { fetchCustomers } = useCustomerStore();
  const { fetchCategories, fetchBrands } = useInventoryStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "">("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "">("");
  const [locationFilter, setLocationFilter] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState<Purchase | null>(null);
  const [toReceive, setToReceive] = useState<Purchase | null>(null);
  const [toCancel, setToCancel] = useState<Purchase | null>(null);
  const navigate = useNavigate();

  const hasFilters = !!(search || statusFilter || paymentFilter || locationFilter);
  const receivableCount = purchases.filter((p) => p.status === "draft").length;
  const payableCount = purchases.filter(
    (p) => p.status !== "cancelled" && p.payment_status !== "paid",
  ).length;

  useEffect(() => {
    fetchPurchases(1, pagination.per_page, {
      search,
      status: statusFilter,
      payment_status: paymentFilter,
      location_id: locationFilter ? Number(locationFilter) : "",
    }).catch((e) => toast.error(e instanceof Error ? e.message : "Error al cargar compras"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, paymentFilter, locationFilter]);

  useEffect(() => {
    fetchLocations().catch(() => {});
    fetchCustomers(1, 100, "").catch(() => {});
    fetchCategories().catch(() => {});
    fetchBrands().catch(() => {});
  }, [fetchLocations, fetchCustomers, fetchCategories, fetchBrands]);

  const openDetail = async (p: Purchase) => {
    setDetailOpen(true);
    await fetchPurchase(p.id);
  };

  const handleReceiveConfirm = async () => {
    if (!toReceive) return;
    try {
      await updatePurchaseStatus(toReceive.id, "received");
      toast.success("Compra recibida, stock actualizado");
      setToReceive(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al recibir la compra");
    }
  };

  const handleCancel = async () => {
    if (!toCancel) return;
    try {
      await deletePurchase(toCancel.id);
      toast.success("Compra cancelada");
      setToCancel(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar la compra");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Registra compras a proveedores e ingresa mercancía al inventario
          </p>
        </div>
        <Button asChild size="sm">
          <Link to="/dashboard/purchase-entry">
            <PackagePlus className="w-4 h-4 mr-2" /> Ingresar mercancía
          </Link>
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard variant="minimal" title="Total compras" value={pagination.total_count} icon={Truck} />
        <StatsCard variant="minimal" title="Por recibir" value={receivableCount} description="en esta vista" icon={Clock} />
        <StatsCard variant="minimal" title="Por pagar" value={payableCount} description="en esta vista" icon={CircleDollarSign} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchBar
          placeholder="Buscar por proveedor..."
          value={search}
          onSearch={setSearch}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PurchaseStatus | "")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | "")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los pagos</option>
          {Object.entries(PAYMENT_LABEL).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas las ubicaciones</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {!isLoading && purchases.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {pagination.total_count} {pagination.total_count === 1 ? "compra" : "compras"}
        </p>
      )}

      {/* Table */}
      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">Cargando compras...</TableCell>
                </TableRow>
              ) : purchases.length ? (
                purchases.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                      {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                    </TableCell>
                    <TableCell>
                      {p.purchase_date ? new Date(p.purchase_date).toLocaleDateString("es-EC") : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{p.supplier_name || "Sin proveedor"}</TableCell>
                    <TableCell>{p.location_name || "—"}</TableCell>
                    <TableCell>{money(p.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(p.status)}>{STATUS_LABEL[p.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={paymentVariant(p.payment_status)}>{PAYMENT_LABEL[p.payment_status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionIconButton icon={Eye} label="Ver detalle" onClick={() => openDetail(p)} />
                      {p.status === "draft" && (
                        <ActionIconButton icon={PackageCheck} label="Recibir" onClick={() => setToReceive(p)} />
                      )}
                      {p.status !== "cancelled" && p.payment_status !== "paid" && (
                        <ActionIconButton icon={DollarSign} label="Registrar pago" onClick={() => setPaymentPurchase(p)} />
                      )}
                      {p.status !== "cancelled" && (
                        <ActionIconButton icon={Ban} label="Cancelar" onClick={() => setToCancel(p)} destructive />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="p-0">
                    {hasFilters ? (
                      <EmptyState
                        variant="no-results"
                        icon={SearchX}
                        title="Sin resultados"
                        description="No hay compras que coincidan con los filtros aplicados."
                        action={{
                          label: "Limpiar filtros",
                          onClick: () => {
                            setSearch("");
                            setStatusFilter("");
                            setPaymentFilter("");
                            setLocationFilter("");
                          },
                        }}
                      />
                    ) : (
                      <EmptyState
                        icon={Truck}
                        title="Aún no hay compras"
                        description="Registra tu primera compra a proveedor para ingresar mercancía al inventario."
                        action={{
                          label: "Ingresar mercancía",
                          onClick: () => navigate("/dashboard/purchase-entry"),
                          icon: PackagePlus,
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.current_page - 1}
        pageCount={pagination.total_pages}
        totalCount={pagination.total_count}
        perPage={pagination.per_page}
        onPageChange={({ selected }) =>
          fetchPurchases(selected + 1, pagination.per_page, {
            search,
            status: statusFilter,
            payment_status: paymentFilter,
            location_id: locationFilter ? Number(locationFilter) : "",
          })
        }
      />

      {/* Sub-components */}
      <PurchaseDetailSheet
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onRegisterPayment={(p) => setPaymentPurchase(p)}
      />

      <PaymentDialog
        open={!!paymentPurchase}
        onClose={() => setPaymentPurchase(null)}
        purchase={paymentPurchase}
      />

      {/* Receive confirmation */}
      <AlertDialog open={!!toReceive} onOpenChange={(o) => !o && setToReceive(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recibir compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Confirmás que la mercancía ha llegado? Se sumará el stock de los productos al inventario en la ubicación seleccionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReceiveConfirm}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Sí, recibir mercancía
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!toCancel} onOpenChange={(o) => !o && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas cancelar esta compra? Si ya estaba recibida, se restará el stock ingresado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancelar compra</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
