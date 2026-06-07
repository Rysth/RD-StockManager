import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowRight,
  ArrowRightLeft,
  Eye,
  PackageCheck,
  Plus,
  X,
  Clock,
  CheckCircle2,
  SearchX,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTransferStore } from "../../../stores/transferStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useAuthStore } from "../../../stores/authStore";
import { Permissions } from "../../../types/auth";
import type { StockTransfer, TransferStatus } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/ui/stats-card";
import Pagination from "../../../components/common/Pagination";
import EmptyState from "../../../components/common/EmptyState";
import { ActionIconButton } from "../../../components/common/RowActions";
import TransferDetailSheet from "./TransferDetailSheet";

const STATUS_LABEL: Record<TransferStatus, string> = {
  pending: "Pendiente",
  received: "Recibida",
  cancelled: "Cancelada",
};

const statusVariant = (
  s: TransferStatus,
): "secondary" | "default" | "destructive" => {
  if (s === "received") return "default";
  if (s === "cancelled") return "destructive";
  return "secondary";
};

const fmt = (d: string) => format(new Date(d), "dd MMM yyyy", { locale: es });

function TransfersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded" />
          <Skeleton className="h-4 w-64 rounded" />
        </div>
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-44 rounded-md" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <Card className="rounded-xl p-0">
        <CardContent className="p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TransfersIndex() {
  const {
    transfers,
    selectedTransfer,
    pagination,
    isLoading,
    isSubmitting,
    fetchTransfers,
    fetchTransfer,
    receiveTransfer,
    cancelTransfer,
  } = useTransferStore();
  const { locations, fetchLocations } = useLocationStore();
  const { fetchProducts } = useInventoryStore();
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission(Permissions.MANAGE_PURCHASES);
  const navigate = useNavigate();

  const [firstLoad, setFirstLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "">("");
  const [fromFilter, setFromFilter] = useState<string>("");
  const [toFilter, setToFilter] = useState<string>("");

  const [detailTransfer, setDetailTransfer] = useState<StockTransfer | null>(
    null,
  );
  const [toReceive, setToReceive] = useState<StockTransfer | null>(null);
  const [toCancel, setToCancel] = useState<StockTransfer | null>(null);

  const hasFilters = !!(statusFilter || fromFilter || toFilter);
  const pendingCount = transfers.filter((t) => t.status === "pending").length;
  const receivedCount = transfers.filter((t) => t.status === "received").length;

  useEffect(() => {
    Promise.all([
      fetchLocations().catch(() => {}),
      fetchProducts(1, 200, {}).catch(() => {}),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTransfers(1, pagination.per_page, {
      status: statusFilter,
      from_location_id: fromFilter ? Number(fromFilter) : "",
      to_location_id: toFilter ? Number(toFilter) : "",
    })
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Error al cargar transferencias",
        ),
      )
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fromFilter, toFilter]);

  const openDetail = async (t: StockTransfer) => {
    setDetailTransfer(t);
    try {
      await fetchTransfer(t.id);
    } catch {
      // detail falls back to list data
    }
  };

  const handleReceive = async () => {
    if (!toReceive) return;
    try {
      await receiveTransfer(toReceive.id);
      toast.success("Transferencia confirmada — stock actualizado");
      if (detailTransfer?.id === toReceive.id) {
        setDetailTransfer((prev) =>
          prev ? { ...prev, status: "received" } : prev,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al confirmar");
    } finally {
      setToReceive(null);
    }
  };

  const handleCancel = async () => {
    if (!toCancel) return;
    try {
      await cancelTransfer(toCancel.id);
      toast.success("Transferencia cancelada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setToCancel(null);
    }
  };

  // Merge list status (live) with full items from selectedTransfer (fetched detail)
  const syncedDetailTransfer = detailTransfer
    ? (() => {
        const live = transfers.find((t) => t.id === detailTransfer.id);
        const base =
          selectedTransfer?.id === detailTransfer.id
            ? selectedTransfer
            : detailTransfer;
        return live ? { ...base, status: live.status } : base;
      })()
    : null;

  if (isLoading && firstLoad) return <TransfersSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transferencias</h1>
          <p className="text-sm text-muted-foreground">
            Movimientos de stock entre bodegas
          </p>
        </div>
        {canManage && (
          <Button onClick={() => navigate("/dashboard/transfer-pos")} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Nueva Transferencia
          </Button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatsCard variant="colored" title="Total transferencias" value={pagination.total_count} icon={ArrowRightLeft} iconColor="text-blue-600" iconBgColor="bg-blue-50" />
        <StatsCard variant="colored" title="Pendientes" value={pendingCount} description="en esta vista" icon={Clock} iconColor="text-amber-600" iconBgColor="bg-amber-50" />
        <StatsCard variant="colored" title="Recibidas" value={receivedCount} description="en esta vista" icon={CheckCircle2} iconColor="text-emerald-600" iconBgColor="bg-emerald-50" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as TransferStatus | "")
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="received">Recibida</option>
          <option value="cancelled">Cancelada</option>
        </select>
        {locations.length > 1 && (
          <>
            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Desde (todas)</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <select
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Hacia (todas)</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {!isLoading && transfers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {pagination.total_count} {pagination.total_count === 1 ? "transferencia" : "transferencias"}
        </p>
      )}

      {/* Table */}
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Solicitado por</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Cargando transferencias...
                  </TableCell>
                </TableRow>
              ) : transfers.length ? (
                transfers.map((t, idx) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                      {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {t.code}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span>{t.from_location_name}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span>{t.to_location_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.items_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusVariant(t.status as TransferStatus)}
                      >
                        {STATUS_LABEL[t.status as TransferStatus]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.requested_by_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmt(t.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionIconButton icon={Eye} label="Ver detalle" onClick={() => openDetail(t)} />
                        {canManage && t.status === "pending" && (
                          <>
                            <ActionIconButton icon={PackageCheck} label="Confirmar recibo" onClick={() => setToReceive(t)} />
                            <ActionIconButton icon={X} label="Cancelar" onClick={() => setToCancel(t)} destructive />
                          </>
                        )}
                      </div>
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
                        description="No hay transferencias que coincidan con los filtros."
                        action={{
                          label: "Limpiar filtros",
                          onClick: () => {
                            setStatusFilter("");
                            setFromFilter("");
                            setToFilter("");
                          },
                        }}
                      />
                    ) : (
                      <EmptyState
                        icon={ArrowRightLeft}
                        title="Aún no hay transferencias"
                        description="Mueve stock entre tus bodegas creando una transferencia."
                        action={
                          canManage
                            ? { label: "Nueva transferencia", onClick: () => navigate("/dashboard/transfer-pos"), icon: Plus }
                            : undefined
                        }
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
          fetchTransfers(selected + 1, pagination.per_page, {
            status: statusFilter,
            from_location_id: fromFilter ? Number(fromFilter) : "",
            to_location_id: toFilter ? Number(toFilter) : "",
          })
        }
      />

      {/* Detail sheet */}
      <TransferDetailSheet
        transfer={syncedDetailTransfer}
        open={!!detailTransfer}
        onClose={() => setDetailTransfer(null)}
      />

      {/* Confirm receive */}
      <AlertDialog
        open={!!toReceive}
        onOpenChange={(o) => !o && setToReceive(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recepción</AlertDialogTitle>
            <AlertDialogDescription>
              El stock se moverá de{" "}
              <strong>{toReceive?.from_location_name}</strong> a{" "}
              <strong>{toReceive?.to_location_name}</strong>. Esta acción no se
              puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleReceive}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm cancel */}
      <AlertDialog
        open={!!toCancel}
        onOpenChange={(o) => !o && setToCancel(null)}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar transferencia</AlertDialogTitle>
            <AlertDialogDescription>
              La transferencia <strong>{toCancel?.code}</strong> quedará
              cancelada. No se moverá ningún stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cancelando..." : "Cancelar transferencia"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
