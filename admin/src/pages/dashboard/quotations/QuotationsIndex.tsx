import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileSignature,
  Search,
  Plus,
  Pencil,
  Trash2,
  FileDown,
  ArrowRightLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import {
  useQuotationStore,
  type Quotation,
  type QuotationStatus,
} from "../../../stores/quotationStore";
import { useBusinessStore } from "../../../stores/businessStore";
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
import QuotePrintTemplate from "@/components/print/QuotePrintTemplate";
import QuotationFormDialog from "./QuotationFormDialog";

const money = (n: string | number | null) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(Number(n) || 0);

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

const statusVariant = (
  status: QuotationStatus,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "accepted":
      return "default";
    case "sent":
      return "secondary";
    case "rejected":
    case "expired":
      return "destructive";
    default:
      return "outline";
  }
};

export default function QuotationsIndex() {
  const {
    quotations,
    pagination,
    isLoading,
    fetchQuotations,
    getQuotation,
    deleteQuotation,
    convertQuotation,
    updateStatus,
  } = useQuotationStore();
  const { business, fetchBusiness } = useBusinessStore();

  const [status, setStatus] = useState<QuotationStatus | "">("");
  const [search, setSearch] = useState("");
  const [firstLoad, setFirstLoad] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [printTarget, setPrintTarget] = useState<Quotation | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printTarget ? `Cotizacion-${printTarget.quotation_number}` : "Cotizacion",
  });

  useEffect(() => {
    fetchQuotations(1, 12, {})
      .catch((e) => toast.error(e?.message || "Error al cargar las cotizaciones"))
      .finally(() => setFirstLoad(false));
    if (!business) fetchBusiness().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dispara la impresión una vez que la plantilla se renderizó con la cotización completa.
  useEffect(() => {
    if (printTarget) handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printTarget]);

  const applyFilters = (next?: { status?: QuotationStatus | ""; search?: string }) => {
    const filters = {
      status: next?.status ?? status,
      search: next?.search ?? search,
    };
    fetchQuotations(1, pagination.per_page, filters).catch((e) =>
      toast.error(e?.message || "Error al filtrar las cotizaciones"),
    );
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = async (id: number) => {
    try {
      const full = await getQuotation(id);
      setEditing(full);
      setFormOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar la cotización");
    }
  };

  const onPrint = async (id: number) => {
    try {
      const full = await getQuotation(id);
      setPrintTarget(full);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al generar el PDF");
    }
  };

  const onConvert = async (q: Quotation) => {
    if (q.converted) {
      toast.error(`Ya convertida en la venta #${q.sale_id}`);
      return;
    }
    if (q.status !== "accepted") {
      toast.error("Solo se pueden convertir cotizaciones aceptadas");
      return;
    }
    if (!window.confirm(`¿Convertir la cotización ${q.quotation_number} en una venta?`)) return;
    try {
      const res = await convertQuotation(q.id);
      toast.success(res.message || `Venta #${res.sale_id} creada`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al convertir");
    }
  };

  const onDelete = async (q: Quotation) => {
    if (!window.confirm(`¿Eliminar la cotización ${q.quotation_number}?`)) return;
    try {
      await deleteQuotation(q.id);
      toast.success("Cotización eliminada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const onChangeStatus = async (q: Quotation, newStatus: QuotationStatus) => {
    try {
      await updateStatus(q.id, newStatus);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar el estado");
    }
  };

  const businessForPrint = useMemo(
    () =>
      business
        ? { name: business.name, logo_url: business.logo_url, whatsapp: business.whatsapp }
        : null,
    [business],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FileSignature className="size-6" /> Cotizaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Crea cotizaciones, descárgalas en PDF y conviértelas en ventas.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Nueva cotización
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="h-9 pl-8"
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
          />
        </div>
        <select
          className={`${selectClass} sm:w-56`}
          value={status}
          onChange={(e) => {
            const v = e.target.value as QuotationStatus | "";
            setStatus(v);
            applyFilters({ status: v });
          }}
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as QuotationStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
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
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {firstLoad || isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Cargando cotizaciones...
                  </TableCell>
                </TableRow>
              ) : quotations.length ? (
                quotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <div className="font-medium">{q.quotation_number}</div>
                      {q.converted && (
                        <div className="text-[11px] text-muted-foreground">
                          Venta #{q.sale_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{q.customer_name || "Sin cliente"}</TableCell>
                    <TableCell>
                      {q.created_at ? new Date(q.created_at).toLocaleDateString("es-EC") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{money(q.total)}</TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={q.status}
                        onChange={(e) => onChangeStatus(q, e.target.value as QuotationStatus)}
                        disabled={q.converted}
                      >
                        {(Object.keys(STATUS_LABELS) as QuotationStatus[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <Badge className="ml-2 hidden xl:inline-flex" variant={statusVariant(q.status)}>
                        {STATUS_LABELS[q.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Descargar PDF"
                        onClick={() => onPrint(q.id)}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Convertir a venta"
                        disabled={q.converted || q.status !== "accepted"}
                        onClick={() => onConvert(q)}
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => openEdit(q.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Eliminar"
                        onClick={() => onDelete(q)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No hay cotizaciones todavía.
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
          fetchQuotations(selected + 1, pagination.per_page, { status, search }).catch((e) =>
            toast.error(e?.message || "Error al cambiar de página"),
          )
        }
      />

      <QuotationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        quotation={editing}
        onSaved={() => fetchQuotations(pagination.current_page, pagination.per_page, { status, search })}
      />

      {/* Plantilla de impresión fuera de pantalla */}
      <div style={{ position: "absolute", left: "-10000px", top: 0 }} aria-hidden>
        {printTarget && <QuotePrintTemplate ref={printRef} quotation={printTarget} business={businessForPrint} />}
      </div>
    </div>
  );
}
