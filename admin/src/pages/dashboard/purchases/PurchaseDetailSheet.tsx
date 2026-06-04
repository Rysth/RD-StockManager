import { useEffect, useMemo, useState } from "react";
import { DollarSign, Pencil, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useLocationStore } from "../../../stores/locationStore";
import type { Purchase, PurchaseItem, PurchaseStatus, PaymentStatus } from "../../../types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface EditLine {
  id: number;
  product_variant_id: number;
  label: string;
  quantity: string;
  unit_cost: string;
}

interface EditForm {
  supplier_id: string;
  location_id: string;
  reference: string;
  discount: string;
  tax: string;
  paid_amount: string;
  lines: EditLine[];
}

interface PurchaseDetailSheetProps {
  open: boolean;
  onClose: () => void;
  onRegisterPayment: (purchase: Purchase) => void;
}

export default function PurchaseDetailSheet({
  open,
  onClose,
  onRegisterPayment,
}: PurchaseDetailSheetProps) {
  const { selectedPurchase, clearSelectedPurchase, updatePurchase, isSubmitting } = usePurchaseStore();
  const { customers } = useCustomerStore();
  const { locations } = useLocationStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

  const suppliers = useMemo(
    () => customers.filter((c) => c.is_supplier),
    [customers],
  );

  useEffect(() => {
    if (!selectedPurchase) {
      setForm(null);
      setEditing(false);
      return;
    }
    setForm({
      supplier_id: selectedPurchase.supplier_id ? String(selectedPurchase.supplier_id) : "",
      location_id: selectedPurchase.location_id ? String(selectedPurchase.location_id) : "",
      reference: selectedPurchase.reference ?? "",
      discount: String(selectedPurchase.discount ?? 0),
      tax: String(selectedPurchase.tax ?? 0),
      paid_amount: String(selectedPurchase.paid_amount ?? 0),
      lines:
        selectedPurchase.items?.map((it) => ({
          id: it.id,
          product_variant_id: it.product_variant_id,
          label: `${it.product_name}${[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join(" / ")})` : ""}`,
          quantity: String(it.quantity),
          unit_cost: String(it.unit_cost),
        })) ?? [],
    });
    setEditing(false);
  }, [selectedPurchase]);

  const editSubtotal = form
    ? form.lines.reduce(
        (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0),
        0,
      )
    : 0;
  const editTotal = Math.max(
    editSubtotal - Number(form?.discount || 0) + Number(form?.tax || 0),
    0,
  );

  const handleClose = () => {
    clearSelectedPurchase();
    setEditing(false);
    onClose();
  };

  const patchForm = (patch: Partial<EditForm>) =>
    setForm((current) => (current ? { ...current, ...patch } : current));

  const patchLine = (lineId: number, patch: Partial<EditLine>) =>
    setForm((current) =>
      current
        ? {
            ...current,
            lines: current.lines.map((line) =>
              line.id === lineId ? { ...line, ...patch } : line,
            ),
          }
        : current,
    );

  const setPaidAmount = (value: string) => {
    if (!value) {
      patchForm({ paid_amount: "" });
      return;
    }
    patchForm({ paid_amount: String(Math.min(Math.max(Number(value) || 0, 0), editTotal)) });
  };

  const handleSave = async () => {
    if (!selectedPurchase || !form) return;
    if (form.lines.some((line) => Number(line.quantity) <= 0)) {
      toast.error("Las cantidades deben ser mayores a cero");
      return;
    }
    try {
      await updatePurchase(selectedPurchase.id, {
        customer_id: form.supplier_id ? Number(form.supplier_id) : null,
        location_id: form.location_id ? Number(form.location_id) : null,
        reference: form.reference || null,
        discount: Number(form.discount || 0),
        tax: Number(form.tax || 0),
        paid_amount: Math.min(Number(form.paid_amount || 0), editTotal),
        items: form.lines.map((line) => ({
          id: line.id,
          product_variant_id: line.product_variant_id,
          quantity: Math.max(1, Number(line.quantity) || 1),
          unit_cost: Math.max(0, Number(line.unit_cost) || 0),
        })),
      });
      toast.success("Compra actualizada");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar la compra");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Detalle de compra {selectedPurchase?.code}</SheetTitle>
          <SheetDescription>
            {selectedPurchase?.supplier_name || "Sin proveedor"} ·{" "}
            {selectedPurchase?.location_name || "—"}
          </SheetDescription>
        </SheetHeader>

        {selectedPurchase ? (
          <div className="space-y-3 px-4 pb-6 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant(selectedPurchase.status)}>
                {STATUS_LABEL[selectedPurchase.status]}
              </Badge>
              <Badge variant={paymentVariant(selectedPurchase.payment_status)}>
                {PAYMENT_LABEL[selectedPurchase.payment_status]}
              </Badge>
              {selectedPurchase.status === "draft" && !editing && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto h-7 gap-1.5"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </div>

            {editing && form && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Proveedor</Label>
                    <select
                      value={form.supplier_id}
                      onChange={(e) => patchForm({ supplier_id: e.target.value })}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Sin proveedor</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Destino</Label>
                    <select
                      value={form.location_id}
                      onChange={(e) => patchForm({ location_id: e.target.value })}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Ubicación por defecto</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Referencia / factura</Label>
                  <Input
                    value={form.reference}
                    onChange={(e) => patchForm({ reference: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(editing && form ? form.lines : selectedPurchase.items ?? []).map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      {"label" in it ? it.label : it.product_name}
                    </TableCell>
                    <TableCell>
                      {editing && form ? (
                        <Input
                          type="number"
                          min={1}
                          value={(it as EditLine).quantity}
                          onChange={(e) => patchLine(it.id, { quantity: e.target.value })}
                          className="h-8 w-16 px-2"
                        />
                      ) : (
                        (it as PurchaseItem).quantity
                      )}
                    </TableCell>
                    <TableCell>
                      {editing && form ? (
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={(it as EditLine).unit_cost}
                          onChange={(e) => patchLine(it.id, { unit_cost: e.target.value })}
                          className="h-8 w-20 px-2"
                        />
                      ) : (
                        money((it as PurchaseItem).unit_cost)
                      )}
                    </TableCell>
                    <TableCell>
                      {editing && form
                        ? money(Number((it as EditLine).quantity || 0) * Number((it as EditLine).unit_cost || 0))
                        : money((it as PurchaseItem).subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-1 border-t pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(editing ? editSubtotal : selectedPurchase.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Descuento</span>
                {editing && form ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.discount}
                    onChange={(e) => patchForm({ discount: e.target.value })}
                    className="h-8 w-24 text-right"
                  />
                ) : (
                  <span>-{money(selectedPurchase.discount)}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span>Impuesto</span>
                {editing && form ? (
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.tax}
                    onChange={(e) => patchForm({ tax: e.target.value })}
                    className="h-8 w-24 text-right"
                  />
                ) : (
                  <span>{money(selectedPurchase.tax)}</span>
                )}
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{money(editing ? editTotal : selectedPurchase.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagado</span>
                {editing && form ? (
                  <Input
                    type="number"
                    min={0}
                    max={editTotal}
                    step="0.01"
                    value={form.paid_amount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="h-8 w-24 text-right"
                  />
                ) : (
                  <span>{money(selectedPurchase.paid_amount)}</span>
                )}
              </div>
              <div className="flex justify-between text-destructive">
                <span>Saldo</span>
                <span>
                  {money(
                    editing && form
                      ? Math.max(editTotal - Number(form.paid_amount || 0), 0)
                      : selectedPurchase.balance_due,
                  )}
                </span>
              </div>
            </div>

            {editing && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                  <X className="mr-1 h-4 w-4" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
                  <Save className="mr-1 h-4 w-4" /> {isSubmitting ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            )}

            {selectedPurchase.payments && selectedPurchase.payments.length > 0 && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Historial de pagos
                </p>
                {selectedPurchase.payments.map((pm) => (
                  <div
                    key={pm.id}
                    className="flex items-start justify-between border-b pb-2 last:border-0 last:pb-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{money(pm.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {pm.payment_method === "cash" ? "Efectivo" : "Transferencia"} ·{" "}
                        {new Date(pm.created_at).toLocaleString("es-EC")}
                      </p>
                    </div>
                    {pm.proof_image_url && (
                      <a href={pm.proof_image_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <img
                          src={pm.proof_image_url}
                          alt="Comprobante"
                          className="h-10 w-10 rounded-md border object-cover"
                        />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!editing && selectedPurchase.status !== "cancelled" &&
              selectedPurchase.payment_status !== "paid" && (
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => onRegisterPayment(selectedPurchase)}
                >
                  <DollarSign className="mr-2 h-4 w-4" /> Registrar pago
                </Button>
              )}
          </div>
        ) : (
          <p className="px-4 text-sm text-muted-foreground">Cargando...</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
