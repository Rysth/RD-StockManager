import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "../../../components/common/Pagination";
import { useSaleStore } from "../../../stores/saleStore";
import { useExpenseStore } from "../../../stores/expenseStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useBusinessStore } from "../../../stores/businessStore";
import { useAuthStore } from "../../../stores/authStore";
import { Permissions } from "../../../types/auth";
import type { InvoiceStatus, SaleStatus } from "../../../types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SaleDetailSheet from "./SaleDetailSheet";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const STATUS_META: Record<SaleStatus, { label: string; className: string }> = {
  completed: { label: "Completada", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

const INVOICE_META: Record<InvoiceStatus, { label: string; className: string }> = {
  AUTORIZADO: { label: "Autorizada", className: "bg-green-100 text-green-800" },
  RECIBIDA: { label: "Recibida", className: "bg-blue-100 text-blue-800" },
  "EN PROCESO": { label: "En proceso", className: "bg-blue-100 text-blue-800" },
  DEVUELTA: { label: "Devuelta", className: "bg-amber-100 text-amber-800" },
  "NO AUTORIZADO": { label: "No autorizada", className: "bg-red-100 text-red-800" },
  ERROR: { label: "Error", className: "bg-red-100 text-red-800" },
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
  const { sales, pagination, isLoading, fetchSales, fetchSale } = useSaleStore();
  const { fetchBusiness, fetchPublicBusiness } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { employees, fetchEmployees } = useExpenseStore();
  const { user, hasPermission, fetchUserInfo } = useAuthStore();

  const [firstLoad, setFirstLoad] = useState(true);
  const [status, setStatus] = useState<SaleStatus | "">("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [permissionsRefreshed, setPermissionsRefreshed] = useState(false);

  const canManageInvoicing = hasPermission(Permissions.MANAGE_INVOICING);

  useEffect(() => {
    fetchSales(1, pagination.per_page, {
      status,
      location_id: locationFilter ? Number(locationFilter) : "",
      user_id: sellerFilter ? Number(sellerFilter) : "",
    })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error al cargar ventas"))
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchSales, pagination.per_page, status, locationFilter, sellerFilter]);

  useEffect(() => {
    fetchPublicBusiness().catch(() => {});
    fetchLocations().catch(() => {});
    fetchEmployees().catch(() => {});
  }, [fetchPublicBusiness, fetchLocations, fetchEmployees]);

  useEffect(() => {
    if (canManageInvoicing) fetchBusiness().catch(() => {});
  }, [canManageInvoicing, fetchBusiness]);

  useEffect(() => {
    if (user && !canManageInvoicing && !permissionsRefreshed) {
      setPermissionsRefreshed(true);
      fetchUserInfo().catch(() => {});
    }
  }, [canManageInvoicing, fetchUserInfo, permissionsRefreshed, user]);

  const clearFilters = () => {
    setStatus("");
    setLocationFilter("");
    setSellerFilter("");
  };

  const openDetail = (id: number) => {
    setDrawerOpen(true);
    fetchSale(id);
  };

  if (isLoading && firstLoad) return <SaleListSkeleton />;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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

        <select
          value={sellerFilter}
          onChange={(e) => setSellerFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los vendedores</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.fullname}</option>
          ))}
        </select>

        {(status || locationFilter || sellerFilter) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Table */}
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
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
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
                    <TableCell>
                      {s.invoice ? (
                        <Badge variant="secondary" className={INVOICE_META[s.invoice.estado].className}>
                          {INVOICE_META[s.invoice.estado].label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No hay ventas registradas.
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
          fetchSales(selected + 1, pagination.per_page, {
            status,
            location_id: locationFilter ? Number(locationFilter) : "",
            user_id: sellerFilter ? Number(sellerFilter) : "",
          })
        }
      />

      {/* Detail sheet (self-contained) */}
      <SaleDetailSheet open={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
