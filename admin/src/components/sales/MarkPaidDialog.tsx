import { useState } from "react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../stores/saleStore";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MarkPaidDialogProps {
  open: boolean;
  saleId: number | null;
  paymentMethod?: "cash" | "transfer" | null;
  onClose: () => void;
  /** Se llama tras registrar el pago, para refrescar la lista que abrió el diálogo. */
  onPaid?: () => void;
}

/**
 * Diálogo para registrar el pago completo de una venta (a crédito / cobro pendiente)
 * y marcarla como pagada. En transferencias el comprobante (foto/PDF) es obligatorio.
 * Reutiliza la acción existente `confirmSalePayment`, que funciona tanto en ventas
 * pendientes como ya completadas/facturadas.
 */
export default function MarkPaidDialog({
  open,
  saleId,
  paymentMethod,
  onClose,
  onPaid,
}: MarkPaidDialogProps) {
  const { confirmSalePayment, isSubmitting } = useSaleStore();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const isTransfer = paymentMethod === "transfer";

  const close = () => {
    setProofFile(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (saleId == null) return;
    if (isTransfer && !proofFile) {
      toast.error("Debes adjuntar el comprobante de la transferencia");
      return;
    }
    try {
      await confirmSalePayment(saleId, proofFile);
      toast.success("Pago registrado — venta marcada como pagada");
      close();
      onPaid?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar el pago");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Marcar como pagada</DialogTitle>
          <DialogDescription>
            {isTransfer
              ? "Confirma que recibiste la transferencia. Debes adjuntar el comprobante (foto o PDF). La venta quedará registrada como pagada."
              : "Confirma que recibiste el pago. La venta quedará registrada como pagada."}
          </DialogDescription>
        </DialogHeader>
        {isTransfer && (
          <div className="space-y-1.5">
            <Label htmlFor="mark-paid-proof">
              Comprobante de transferencia{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mark-paid-proof"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            {proofFile ? (
              <p className="truncate text-xs text-muted-foreground">
                {proofFile.name}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Obligatorio: adjunta la foto o PDF de la transferencia.
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={close}>
            Cancelar
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={isSubmitting || (isTransfer && !proofFile)}
            onClick={handleConfirm}
          >
            {isSubmitting ? "Procesando..." : "Marcar como pagada"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
