import { useState } from "react";
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  Mail,
  Pencil,
  Printer,
  ReceiptText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useBusinessStore } from "../../../stores/businessStore";
import { useAuthStore } from "../../../stores/authStore";
import { printTicket } from "../../../lib/ticket";
import { Permissions } from "../../../types/auth";
import type { InvoiceStatus, SaleStatus } from "../../../types/inventory";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EditSaleDialog from "./EditSaleDialog";
import EditSaleItemsDialog from "./EditSaleItemsDialog";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const invoiceMessageText = (message: {
  mensaje?: string;
  informacion_adicional?: string;
  tipo?: string;
}) => [message.mensaje || message.tipo, message.informacion_adicional].filter(Boolean).join(": ");

const STATUS_META: Record<SaleStatus, { label: string; className: string }> = {
  completed: { label: "Completada", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800 hover:bg-red-100" },
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

interface SaleDetailSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function SaleDetailSheet({ open, onClose }: SaleDetailSheetProps) {
  const {
    selectedSale,
    isLoadingDetail,
    isSubmitting,
    clearSelectedSale,
    updateSaleStatus,
    issueInvoice,
    sendInvoiceEmail,
    downloadInvoiceXml,
    downloadInvoiceRide,
  } = useSaleStore();
  const { business, publicBusiness } = useBusinessStore();
  const { hasPermission, user } = useAuthStore();
  const isBusinessEmployee = user?.roles?.includes("business_employee") ?? false;

  const [editSaleOpen, setEditSaleOpen] = useState(false);
  const [editItemsOpen, setEditItemsOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [completeId, setCompleteId] = useState<number | null>(null);
  const [invoiceConfirmId, setInvoiceConfirmId] = useState<number | null>(null);
  const [invoicingId, setInvoicingId] = useState<number | null>(null);
  const [invoiceActionError, setInvoiceActionError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const canManageInvoicing = hasPermission(Permissions.MANAGE_INVOICING);
  const sriEnabled = business?.sri_enabled === true;
  const canUseInvoicing = canManageInvoicing && sriEnabled;

  const handleClose = () => {
    clearSelectedSale();
    onClose();
  };

  const handleCancel = async () => {
    if (cancelId == null) return;
    try {
      await updateSaleStatus(cancelId, "cancelled");
      toast.success("Venta cancelada - stock restaurado");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar la venta");
    } finally {
      setCancelId(null);
    }
  };

  const handleComplete = async () => {
    if (completeId == null) return;
    try {
      await updateSaleStatus(completeId, "completed");
      toast.success("Pedido completado - stock descontado");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al completar el pedido");
    } finally {
      setCompleteId(null);
    }
  };

  const handleIssueInvoice = async (id: number) => {
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
      const msg = e instanceof Error ? e.message : "Error al emitir la factura";
      setInvoiceActionError(msg);
      setInvoiceConfirmId(null);
      toast.error(msg);
    } finally {
      setInvoicingId(null);
    }
  };

  const handleSendEmail = async (id: number, email?: string) => {
    setSendingEmail(true);
    try {
      await sendInvoiceEmail(id, email);
      toast.success("Factura enviada al correo del cliente");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al enviar el correo");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDownloadXml = async (id: number) => {
    try {
      await downloadInvoiceXml(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al descargar el XML");
    }
  };

  const handleDownloadRide = async (id: number) => {
    try {
      await downloadInvoiceRide(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al descargar el RIDE");
    }
  };

  const reprintTicket = () => {
    if (!selectedSale?.items) return;
    const ok = printTicket({
      businessName: publicBusiness?.name || "StockManager",
      businessSlogan: publicBusiness?.slogan || "",
      date: selectedSale.sold_at ? new Date(selectedSale.sold_at) : new Date(),
      saleId: selectedSale.id,
      saleCode: selectedSale.code,
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

  // The invoice target for the confirm dialog uses selectedSale directly
  const invoiceTarget = invoiceConfirmId && selectedSale?.id === invoiceConfirmId ? selectedSale : null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Detalle de venta {selectedSale?.code ?? ""}</SheetTitle>
            <SheetDescription>Información completa de la transacción</SheetDescription>
          </SheetHeader>

          {isLoadingDetail || !selectedSale ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <div className="space-y-4 px-4 pb-6">
              {/* Info grid */}
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

              {/* Edit sale info */}
              {selectedSale.status !== "cancelled" && !selectedSale.invoice?.authorized && !(isBusinessEmployee && selectedSale.status === "completed") && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setEditSaleOpen(true)}>
                  <Pencil className="h-4 w-4" /> Editar datos de venta
                </Button>
              )}

              {/* Items table */}
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
                            {it.product_bundle_id
                              ? "Combo"
                              : it.product_variant_id
                                ? `${it.size || "-"}/${it.color || "-"} · ${it.sku}`
                                : "Servicio"}
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

              {/* Totals */}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA SRI</span>
                  <span>{selectedSale.sri_iva_rate ?? 0}%</span>
                </div>
                {selectedSale.profit != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ganancia</span>
                    <span className="font-medium text-emerald-600">{money(selectedSale.profit)}</span>
                  </div>
                )}
              </div>

              {/* Invoicing section */}
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

                  {!sriEnabled && !isBusinessEmployee && (
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
                    {canUseInvoicing &&
                      selectedSale.status === "completed" &&
                      !selectedSale.invoice?.authorized && (
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
                          onClick={() => handleDownloadXml(selectedSale.id)}
                        >
                          <Download className="h-4 w-4" /> XML
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleDownloadRide(selectedSale.id)}
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

              {/* Action buttons */}
              {selectedSale.status === "pending" && (
                <Button variant="outline" className="w-full gap-2" onClick={() => setEditItemsOpen(true)}>
                  <Pencil className="h-4 w-4" /> Editar productos
                </Button>
              )}

              <Button variant="outline" className="w-full gap-2" onClick={reprintTicket}>
                <Printer className="h-4 w-4" /> Reimprimir {selectedSale.code}
              </Button>

              {selectedSale.status === "pending" && (
                <Button
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => setCompleteId(selectedSale.id)}
                >
                  Confirmar entrega y pago
                </Button>
              )}

              {selectedSale.status !== "cancelled" && !(selectedSale.invoice?.authorized && selectedSale.invoice?.ambiente === "2") && !(isBusinessEmployee && selectedSale.status === "completed") && (
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

      {/* Sub-dialogs rendered outside the Sheet so they stack properly */}
      <EditSaleDialog
        open={editSaleOpen}
        onClose={() => setEditSaleOpen(false)}
        sale={selectedSale}
      />

      <EditSaleItemsDialog
        open={editItemsOpen}
        onClose={() => setEditItemsOpen(false)}
        sale={selectedSale}
      />

      {/* Email capture */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Correo del cliente</DialogTitle>
            <DialogDescription>
              El cliente no tiene un correo registrado. Ingresá uno para enviarle la factura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="email-input">Correo electrónico</Label>
            <Input
              id="email-input"
              type="email"
              placeholder="cliente@ejemplo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancelar</Button>
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

      {/* Cancel confirmation */}
      <AlertDialog open={cancelId != null} onOpenChange={(o) => !o && setCancelId(null)}>
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
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, cancelar venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete confirmation */}
      <AlertDialog open={completeId != null} onOpenChange={(o) => !o && setCompleteId(null)}>
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
              onClick={handleComplete}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Sí, confirmar entrega
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice issue confirmation */}
      <AlertDialog
        open={invoiceConfirmId != null}
        onOpenChange={(o) => !o && !invoicingId && setInvoiceConfirmId(null)}
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
                    Se enviará esta venta al SRI para generar el XML autorizado y el RIDE.
                  </span>
                  {invoiceTarget && (
                    <span className="block rounded-lg border bg-muted/40 p-3 text-sm text-foreground">
                      {invoiceTarget.code} · {invoiceTarget.customer_name || "Consumidor final"} ·{" "}
                      {money(invoiceTarget.total)}
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
              onClick={(e) => {
                e.preventDefault();
                if (invoiceTarget) handleIssueInvoice(invoiceTarget.id);
              }}
            >
              {invoicingId ? "Autorizando..." : "Sí, emitir factura"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
