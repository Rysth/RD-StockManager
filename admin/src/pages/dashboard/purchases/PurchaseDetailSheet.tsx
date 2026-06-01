import { DollarSign } from "lucide-react";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import type { Purchase, PurchaseStatus, PaymentStatus } from "../../../types/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  draft: "Borrador",
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
  const { selectedPurchase, clearSelectedPurchase } = usePurchaseStore();

  const handleClose = () => {
    clearSelectedPurchase();
    onClose();
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
            <div className="flex gap-2">
              <Badge variant={statusVariant(selectedPurchase.status)}>
                {STATUS_LABEL[selectedPurchase.status]}
              </Badge>
              <Badge variant={paymentVariant(selectedPurchase.payment_status)}>
                {PAYMENT_LABEL[selectedPurchase.payment_status]}
              </Badge>
            </div>

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
                {selectedPurchase.items?.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      {it.product_name}
                      {[it.size, it.color].filter(Boolean).length
                        ? ` (${[it.size, it.color].filter(Boolean).join(" / ")})`
                        : ""}
                    </TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{money(it.unit_cost)}</TableCell>
                    <TableCell>{money(it.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="space-y-1 border-t pt-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(selectedPurchase.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Descuento</span>
                <span>-{money(selectedPurchase.discount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuesto</span>
                <span>{money(selectedPurchase.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{money(selectedPurchase.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pagado</span>
                <span>{money(selectedPurchase.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-destructive">
                <span>Saldo</span>
                <span>{money(selectedPurchase.balance_due)}</span>
              </div>
            </div>

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

            {selectedPurchase.status !== "cancelled" &&
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
