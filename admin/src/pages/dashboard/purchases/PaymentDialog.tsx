import { useRef, useState } from "react";
import { ArrowLeftRight, Banknote, X, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import type { Purchase } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: Purchase | null;
}

export default function PaymentDialog({ open, onClose, purchase }: PaymentDialogProps) {
  const { createPayment, isSubmitting } = usePurchaseStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "transfer">("cash");
  const [proof, setProof] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleClose = () => {
    setAmount("");
    setMethod("cash");
    setProof(null);
    setPreview(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe ser menor a 2MB");
      return;
    }
    setProof(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!purchase) return;
    const balance = purchase.balance_due;
    const numAmount = Number(amount || 0);
    if (numAmount <= 0) return toast.error("Ingresa un monto mayor a cero");
    if (numAmount > balance)
      return toast.error(`El monto no puede exceder el saldo pendiente de ${money(balance)}`);

    try {
      await createPayment(purchase.id, numAmount, method, proof);
      toast.success("Pago registrado correctamente");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar el pago");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {purchase?.supplier_name || "Sin proveedor"} · Saldo pendiente{" "}
            {money(purchase?.balance_due ?? 0)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Monto del abono</Label>
            <Input
              type="number"
              min={0}
              max={purchase?.balance_due ?? undefined}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${
                  method === "cash" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <Banknote className="h-4 w-4" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMethod("transfer")}
                className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${
                  method === "transfer" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" /> Transferencia
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Comprobante (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="Preview" className="h-24 w-24 rounded-md border object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setProof(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="mr-1 h-4 w-4" /> Subir foto
              </Button>
            )}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Pagado actual: {money(purchase?.paid_amount ?? 0)} · Total: {money(purchase?.total ?? 0)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
