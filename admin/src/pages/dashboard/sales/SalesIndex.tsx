import { useEffect, useState } from "react";
import { AlertCircle, Download, Eye, FileText, Loader2, Mail, Pencil, Printer, ReceiptText, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Pagination from "../../../components/common/Pagination";
import { useSaleStore } from "../../../stores/saleStore";
import { useBusinessStore } from "../../../stores/businessStore";
import { useExpenseStore } from "../../../stores/expenseStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useAuthStore } from "../../../stores/authStore";
import { printTicket } from "../../../lib/ticket";
import { Permissions } from "../../../types/auth";
import type { InvoiceStatus, SaleStatus } from "../../../types/inventory";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const invoiceMessageText = (message: { mensaje?: string; informacion_adicional?: string; tipo?: string }) =>
  [message.mensaje || message.tipo, message.informacion_adicional].filter(Boolean).join(": ");

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
    syncSaleItems,
    selectedSale,
    isLoadingDetail,
    isSubmitting,
    fetchSale,
    clearSelectedSale,
    issueInvoice,
    sendInvoiceEmail,
    downloadInvoiceXml,
    downloadInvoiceRide,
  } = useSaleStore();
  const { business, publicBusiness, fetchBusiness, fetchPublicBusiness } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { employees, fetchEmployees } = useExpenseStore();
  const { user, hasPermission, fetchUserInfo } = useAuthStore();
  const [firstLoad, setFirstLoad] = useState(true);
  const [status, setStatus] = useState<SaleStatus | "">("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [invoiceConfirmId, setInvoiceConfirmId] = useState<number | null>(null);
  const [invoicingId, setInvoicingId] = useState<number | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [permissionsRefreshed, setPermissionsRefreshed] = useState(false);
  const canManageInvoicing = hasPermission(Permissions.MANAGE_INVOICING);
  const sriEnabled = business?.sri_enabled === true;
  const canUseInvoicing = canManageInvoicing && sriEnabled;
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItems, setEditItems] = useState<{ product_variant_id: number; label: string; quantity: number; unit_price: number }[]>([]);
  const [invoiceActionError, setInvoiceActionError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const invoiceTarget = invoiceConfirmId
    ? selectedSale?.id === invoiceConfirmId
      ? selectedSale
      : sales.find((s) => s.id === invoiceConfirmId)
    : null;

  useEffect(() => {
    fetchSales(1, pagination.per_page, {
      status,
      location_id: locationFilter ? Number(locationFilter) : "",
      user_id: sellerFilter ? Number(sellerFilter) : "",
    })
      .catch((e) => toast.error(errorMessage(e, "Error al cargar ventas")))
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

  const handleSaveItems = async () => {
    if (!selectedSale) return;
    const filtered = editItems.filter((i) => i.quantity > 0);
    if (filtered.length === 0) return toast.error("La venta debe tener al menos un producto");
    try {
      await syncSaleItems(selectedSale.id, filtered);
      toast.success("Items actualizados");
      setEditDialogOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al actualizar los items"));
    }
  };

  const openEditDialog = () => {
    if (!selectedSale?.items) return;
    const items = selectedSale.items.map((it) => ({
      product_variant_id: it.product_variant_id,
      label: `${it.product_name}${[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join("/")})` : ""} - ${it.sku}`,
      quantity: it.quantity,
      unit_price: it.unit_price,
    }));
    setEditItems(items);
    setEditDialogOpen(true);
  };

  const reprintTicket = () => {
    if (!selectedSale?.items) return;
    const ok = printTicket({
      businessName: publicBusiness?.name || "EDLU Store",
      businessSlogan: publicBusiness?.slogan || "",
      date: selectedSale.sold_at ? new Date(selectedSale.sold_at) : new Date(),
      saleId: selectedSale.id,
      customerName: selectedSale.customer_name || "Consumidor final",
      lines: selectedSale.items.map((it) => ({
        label: `${it.product_name}${[it.size, it.color].filter(Boolean).length ? ` — ${[it.size, it.color].filter(Boolean).join(" / ")}` : ""}`,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
      shippingCost: selectedSale.shipping_cost ?? 0,
      total: selectedSale.total,
      paymentMethod: selectedSale.payment_method ?? "cash",
      cashOnDelivery: selectedSale.cash_on_delivery ?? false,
    });
    if (!ok) toast.error("Permite ventanas emergentes para imprimir");
  };

  const openDetail = (id: number) => {
    setInvoiceActionError(null);
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

  const issueElectronicInvoice = async (id: number) => {
    setInvoicingId(id);
    setInvoiceActionError(null);
    try {
      const invoice = await issueInvoice(id);
      if (invoice.authorized) {
        toast.success("Factura autorizada por el SRI");
        setInvoiceConfirmId(null);
      } else {
        const details = invoice.mensajes?.map(invoiceMessageText).filter(Boolean).join(" · ");
        setInvoiceActionError(details || `El SRI no autorizó la factura (${invoice.estado})`);
        setInvoiceConfirmId(null);
        toast.error(`El SRI no autorizó la factura (${invoice.estado})`);
      }
    } catch (e) {
      const message = errorMessage(e, "Error al emitir la factura");
      setInvoiceActionError(message);
      setInvoiceConfirmId(null);
      toast.error(message);
    } finally {
      setInvoicingId(null);
    }
  };

  const downloadXml = async (id: number) => {
    try {
      await downloadInvoiceXml(id);
    } catch (e) {
      toast.error(errorMessage(e, "Error al descargar el XML"));
    }
  };

  const downloadRide = async (id: number) => {
    try {
      await downloadInvoiceRide(id);
    } catch (e) {
      toast.error(errorMessage(e, "Error al descargar el RIDE"));
    }
  };

  const handleSendEmail = async (id: number, email?: string) => {
    setSendingEmail(true);
    try {
      await sendInvoiceEmail(id, email);
      toast.success("Factura enviada al correo del cliente");
    } catch (e) {
      toast.error(errorMessage(e, "Error al enviar el correo"));
    } finally {
      setSendingEmail(false);
    }
  };

  if (isLoading && firstLoad) return <SaleListSkeleton />;

  return (
    <div className="space-y-4">
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

      <Sheet
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) clearSelectedSale();
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
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
                      <TableHead className="w-12"></TableHead>
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
                              {it.images?.[0] ? (
                                <img
                                  src={it.images[0].url}
                                  alt={it.product_name}
                                  className="h-10 w-10 rounded-md border object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-md border bg-muted" />
                              )}
                            </TableCell>
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
                {(selectedSale.shipping_cost ?? 0) > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{money(selectedSale.total - (selectedSale.shipping_cost ?? 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Envío</span>
                      <span>{money(selectedSale.shipping_cost ?? 0)}</span>
                    </div>
                  </>
                )}
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

              {canManageInvoicing && (
                <div className="space-y-3 rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">Facturación electrónica SRI</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedSale.invoice
                          ? selectedSale.invoice.numero_comprobante || selectedSale.invoice.clave_acceso
                          : "Sin factura emitida"}
                      </p>
                    </div>
                    {selectedSale.invoice && (
                      <Badge
                        variant="secondary"
                        className={INVOICE_META[selectedSale.invoice.estado].className}
                      >
                        {INVOICE_META[selectedSale.invoice.estado].label}
                      </Badge>
                    )}
                  </div>

                  {!sriEnabled && (
                    <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 [&>svg]:text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        La facturación electrónica está desactivada para este negocio. Puedes seguir usando nota de venta/ticket.
                      </AlertDescription>
                    </Alert>
                  )}

                  {invoiceActionError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{invoiceActionError}</AlertDescription>
                    </Alert>
                  )}

                  {selectedSale.invoice?.mensajes?.length ? (
                    <Alert variant={selectedSale.invoice.authorized ? "default" : "destructive"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="space-y-1 text-xs">
                        {selectedSale.invoice.mensajes.map((m, index) => (
                          <span key={`${m.identificador || m.tipo || "msg"}-${index}`} className="block">
                            {invoiceMessageText(m)}
                          </span>
                        ))}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {canUseInvoicing && selectedSale.status === "completed" && !selectedSale.invoice?.authorized && (
                      <Button
                        className="flex-1 gap-2"
                        disabled={isSubmitting}
                        onClick={() => setInvoiceConfirmId(selectedSale.id)}
                      >
                        <ReceiptText className="h-4 w-4" />
                        {selectedSale.invoice ? "Reintentar emisión" : "Emitir factura SRI"}
                      </Button>
                    )}
                    {selectedSale.invoice?.authorized && (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => downloadXml(selectedSale.id)}
                        >
                          <Download className="h-4 w-4" /> XML
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => downloadRide(selectedSale.id)}
                        >
                          <FileText className="h-4 w-4" /> RIDE
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          disabled={sendingEmail}
                          title="Enviar factura por correo"
                          onClick={() => {
                            if (selectedSale.customer_email) {
                              handleSendEmail(selectedSale.id);
                            } else {
                              setEmailInput("");
                              setEmailDialogOpen(true);
                            }
                          }}
                        >
                          {sendingEmail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          Email
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {selectedSale.status === "pending" && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={openEditDialog}
                >
                  <Pencil className="h-4 w-4" /> Editar productos
                </Button>
              )}
              <Button variant="outline" className="w-full gap-2" onClick={reprintTicket}>
                <Printer className="h-4 w-4" /> Reimprimir ticket #{selectedSale?.id}
              </Button>

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

      {/* ── Editar productos de venta pendiente ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar productos</DialogTitle>
            <DialogDescription>
              Modifica cantidades o precios de la venta pendiente #{selectedSale?.id}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {editItems.map((it, idx) => {
                const img = selectedSale?.items?.find((si) => si.product_variant_id === it.product_variant_id)?.images?.[0];
                return (
                  <div key={it.product_variant_id} className="flex items-center gap-3 rounded-lg border p-3">
                    {img ? (
                      <img src={img.url} alt="" className="h-10 w-10 shrink-0 rounded-md border object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-md border bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.label}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <Label className="mb-1 block text-xs text-muted-foreground">Cant.</Label>
                        <Input
                          type="number"
                          min={0}
                          value={it.quantity}
                          onChange={(e) => {
                            const q = Math.max(0, Number(e.target.value));
                            setEditItems((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: q } : x)));
                          }}
                          className="h-8 text-center"
                        />
                      </div>
                      <div className="w-24">
                        <Label className="mb-1 block text-xs text-muted-foreground">Precio</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => {
                            const p = Number(e.target.value) || 0;
                            setEditItems((prev) => prev.map((x, i) => (i === idx ? { ...x, unit_price: p } : x)));
                          }}
                          className="h-8 text-right"
                        />
                      </div>
                      <div className="w-20 text-right">
                        <Label className="mb-1 block text-xs text-muted-foreground">Subtotal</Label>
                        <p className="text-sm font-medium">{money(it.quantity * it.unit_price)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-5 h-8 w-8 shrink-0 text-destructive"
                        onClick={() => setEditItems((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: 0 } : x)))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveItems} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo para agregar email del cliente ── */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Correo del cliente</DialogTitle>
            <DialogDescription>
              El cliente no tiene un correo registrado. Ingresá uno para enviarle la factura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="cliente@ejemplo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!emailInput.trim() || sendingEmail}
              onClick={() => {
                if (selectedSale && emailInput.trim()) {
                  handleSendEmail(selectedSale.id, emailInput.trim());
                  setEmailDialogOpen(false);
                }
              }}
            >
              {sendingEmail ? "Enviando..." : "Enviar factura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <AlertDialog
        open={invoiceConfirmId != null}
        onOpenChange={(open) => !open && !invoicingId && setInvoiceConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir factura electrónica SRI</AlertDialogTitle>
            <AlertDialogDescription>
              {invoicingId ? (
                <span className="block space-y-3 text-left">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Autorizando comprobante...
                  </span>
                  <span className="block rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                    Firmando XML, enviándolo al SRI y esperando la autorización. No cierres esta ventana.
                  </span>
                  <span className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Firmando XML</span>
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Enviando al SRI</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">Autorizando</span>
                  </span>
                </span>
              ) : (
                <span className="block space-y-2 text-left">
                  <span className="block">
                    Se enviará esta venta al SRI en ambiente de pruebas para generar el XML autorizado y el RIDE.
                  </span>
                  {invoiceTarget && (
                    <span className="block rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
                      Venta #{invoiceTarget.id} · {invoiceTarget.customer_name || "Consumidor final"} · {money(invoiceTarget.total)}
                    </span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!invoicingId}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={!invoiceTarget || !!invoicingId}
              onClick={(event) => {
                event.preventDefault();
                if (invoiceTarget) issueElectronicInvoice(invoiceTarget.id);
              }}
            >
              {invoicingId ? "Autorizando..." : "Sí, emitir factura"}
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
