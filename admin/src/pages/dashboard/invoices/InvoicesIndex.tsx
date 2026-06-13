import { useEffect, useState } from "react";
import { FileText, FileCode2, FileDown, Search, Paperclip, BadgeDollarSign } from "lucide-react";
import toast from "react-hot-toast";
import { useInvoiceStore } from "../../../stores/invoiceStore";
import { useAuthStore } from "../../../stores/authStore";
import { Permissions } from "../../../types/auth";
import MarkPaidDialog from "../../../components/sales/MarkPaidDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "../../../components/common/Pagination";
import rysthLogo from "../../../assets/rysth_logo.png";

const money = (n: string | number | null) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(n) || 0);

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

// Color del badge según el estado del SRI.
const estadoVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado) {
    case "AUTORIZADO":
      return "default";
    case "NO AUTORIZADO":
    case "DEVUELTA":
    case "ERROR":
      return "destructive";
    case "RECIBIDA":
    case "EN PROCESO":
      return "secondary";
    default:
      return "outline";
  }
};

const ESTADOS = ["AUTORIZADO", "NO AUTORIZADO", "DEVUELTA", "EN PROCESO", "RECIBIDA", "ERROR"];

// Estado de cobro de la venta asociada (igual que en Compras).
const PAYMENT_LABEL: Record<string, string> = {
  due: "Por pagar",
  partial: "Parcial",
  paid: "Pagada",
};
const paymentVariant = (s?: string | null): "default" | "secondary" | "destructive" =>
  s === "paid" ? "default" : s === "partial" ? "secondary" : "destructive";

export default function InvoicesIndex() {
  const { invoices, pagination, isLoading, fetchInvoices } = useInvoiceStore();
  const { hasPermission } = useAuthStore();
  const canManageSales = hasPermission(Permissions.MANAGE_SALES);
  const [estado, setEstado] = useState("");
  const [search, setSearch] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);
  // Venta seleccionada para marcar como pagada desde la lista de facturas.
  const [payTarget, setPayTarget] = useState<{
    saleId: number;
    paymentMethod?: "cash" | "transfer" | null;
  } | null>(null);

  useEffect(() => {
    fetchInvoices(1, 12, {})
      .catch((e) => toast.error(e?.message || "Error al cargar las facturas"))
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = (next?: { estado?: string; search?: string }) => {
    const filters = {
      estado: next?.estado ?? estado,
      search: next?.search ?? search,
    };
    fetchInvoices(1, pagination.per_page, filters).catch((e) =>
      toast.error(e?.message || "Error al filtrar las facturas"),
    );
  };

  const download = async (fn: (id: number) => Promise<void>, id: number) => {
    try {
      await fn(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al descargar");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-24 shrink-0 items-center justify-center rounded-xl border bg-white px-3 shadow-sm">
            <img src={rysthLogo} alt="Rysth" className="max-h-10 max-w-full object-contain" />
          </div>
          <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileText className="size-6" /> Facturas SRI
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprobantes electrónicos emitidos al SRI. Descarga el XML autorizado y el RIDE.
          </p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Buscar por clave de acceso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <select
          className={`${selectClass} sm:w-56`}
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            applyFilters({ estado: e.target.value });
          }}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => applyFilters()}>
          Buscar
        </Button>
      </div>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Comprobante</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Ambiente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firstLoad || isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Cargando facturas...
                  </TableCell>
                </TableRow>
              ) : invoices.length ? (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-medium">{inv.numero_comprobante}</div>
                      {inv.clave_acceso && (
                        <div className="font-mono text-[11px] text-muted-foreground">
                          {inv.clave_acceso}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{inv.cliente}</div>
                      {inv.identificacion && (
                        <div className="text-xs text-muted-foreground">{inv.identificacion}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {inv.sold_at ? new Date(inv.sold_at).toLocaleDateString("es-EC") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{money(inv.importe_total)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{inv.ambiente === "2" ? "Producción" : "Pruebas"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={estadoVariant(inv.estado)}>{inv.estado}</Badge>
                    </TableCell>
                    <TableCell>
                      {inv.payment_status ? (
                        <Badge variant={paymentVariant(inv.payment_status)}>
                          {PAYMENT_LABEL[inv.payment_status] ?? inv.payment_status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageSales &&
                        inv.payment_status !== "paid" &&
                        inv.sale_status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600"
                            title="Marcar como pagada"
                            onClick={() =>
                              setPayTarget({
                                saleId: inv.sale_id,
                                paymentMethod: inv.payment_method,
                              })
                            }
                          >
                            <BadgeDollarSign className="h-4 w-4" />
                          </Button>
                        )}
                      {inv.payment_proof_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Ver comprobante de pago"
                          onClick={() =>
                            window.open(inv.payment_proof_url!, "_blank", "noopener,noreferrer")
                          }
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Descargar XML"
                        disabled={!inv.has_xml}
                        onClick={() => download(useInvoiceStore.getState().downloadXml, inv.id)}
                      >
                        <FileCode2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Descargar RIDE (PDF)"
                        disabled={!inv.has_ride}
                        onClick={() => download(useInvoiceStore.getState().downloadRide, inv.id)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No se encontraron facturas emitidas.
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
        onPageChange={({ selected }) =>
          fetchInvoices(selected + 1, pagination.per_page, { estado, search }).catch((e) =>
            toast.error(e?.message || "Error al cambiar de página"),
          )
        }
      />

      <MarkPaidDialog
        open={payTarget !== null}
        saleId={payTarget?.saleId ?? null}
        paymentMethod={payTarget?.paymentMethod}
        onClose={() => setPayTarget(null)}
        onPaid={() =>
          fetchInvoices(pagination.current_page, pagination.per_page, { estado, search }).catch(
            (e) => toast.error(e?.message || "Error al actualizar las facturas"),
          )
        }
      />
    </div>
  );
}
