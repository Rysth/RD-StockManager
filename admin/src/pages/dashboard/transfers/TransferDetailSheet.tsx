import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowRight, PackageCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import type { StockTransfer, TransferStatus } from "../../../types/inventory";
import { useTransferStore } from "../../../stores/transferStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useState } from "react";

const STATUS_LABEL: Record<TransferStatus, string> = {
  pending: "Pendiente",
  received: "Recibida",
  cancelled: "Cancelada",
};

const statusVariant = (s: TransferStatus): "secondary" | "default" | "destructive" => {
  if (s === "received") return "default";
  if (s === "cancelled") return "destructive";
  return "secondary";
};

const fmt = (d: string | null) =>
  d ? format(new Date(d), "dd MMM yyyy, HH:mm", { locale: es }) : "—";

interface TransferDetailSheetProps {
  transfer: StockTransfer | null;
  open: boolean;
  onClose: () => void;
}

export default function TransferDetailSheet({ transfer, open, onClose }: TransferDetailSheetProps) {
  const { receiveTransfer, cancelTransfer, isSubmitting } = useTransferStore();
  const [confirmReceive, setConfirmReceive] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!transfer) return null;

  const handleReceive = async () => {
    try {
      await receiveTransfer(transfer.id);
      toast.success("Transferencia confirmada — stock actualizado");
      setConfirmReceive(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al confirmar");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTransfer(transfer.id);
      toast.success("Transferencia cancelada");
      setConfirmCancel(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {transfer.code}
              <Badge variant={statusVariant(transfer.status as TransferStatus)}>
                {STATUS_LABEL[transfer.status as TransferStatus]}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Detalle de la transferencia de stock
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Locations */}
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3">
              <span className="font-medium">{transfer.from_location_name}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{transfer.to_location_name}</span>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Solicitado por</p>
                <p className="font-medium">{transfer.requested_by_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-medium">{fmt(transfer.created_at)}</p>
              </div>
              {transfer.received_by_name && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground">Recibido por</p>
                    <p className="font-medium">{transfer.received_by_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fecha recepción</p>
                    <p className="font-medium">{fmt(transfer.received_at)}</p>
                  </div>
                </>
              )}
            </div>

            {transfer.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="mt-0.5 rounded-md border bg-muted/30 px-3 py-2">{transfer.notes}</p>
              </div>
            )}

            <Separator />

            {/* Items */}
            <div className="space-y-2">
              <p className="font-medium text-muted-foreground">Productos</p>
              {transfer.items && transfer.items.length > 0 ? (
                transfer.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant_label} · <span className="font-mono">{item.sku}</span>
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 font-semibold">×{item.quantity}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Abre el detalle para ver los productos.
                </p>
              )}
            </div>

            {/* Actions */}
            {transfer.status === "pending" && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 text-destructive border-destructive/40 hover:bg-destructive/5"
                    onClick={() => setConfirmCancel(true)}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4" /> Cancelar transferencia
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setConfirmReceive(true)}
                    disabled={isSubmitting}
                  >
                    <PackageCheck className="h-4 w-4" /> Confirmar recibo
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm receive */}
      <AlertDialog open={confirmReceive} onOpenChange={setConfirmReceive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recepción</AlertDialogTitle>
            <AlertDialogDescription>
              El stock se moverá de <strong>{transfer.from_location_name}</strong> a{" "}
              <strong>{transfer.to_location_name}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleReceive}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Confirmar y mover stock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm cancel */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar transferencia</AlertDialogTitle>
            <AlertDialogDescription>
              La transferencia <strong>{transfer.code}</strong> quedará cancelada. No se moverá stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Cancelando..." : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
