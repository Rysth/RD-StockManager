import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useLocationStore } from "../../../stores/locationStore";
import type { Sale } from "../../../types/inventory";
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

interface EditSaleDialogProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export default function EditSaleDialog({ open, onClose, sale }: EditSaleDialogProps) {
  const { updateSale, isSubmitting } = useSaleStore();
  const { locations } = useLocationStore();

  const [form, setForm] = useState({
    payment_method: "cash",
    cash_on_delivery: false,
    shipping_cost: "0",
    location_id: "",
  });

  useEffect(() => {
    if (sale && open) {
      setForm({
        payment_method: sale.payment_method ?? "cash",
        cash_on_delivery: sale.cash_on_delivery ?? false,
        shipping_cost: String(sale.shipping_cost ?? 0),
        location_id: sale.location_id ? String(sale.location_id) : "",
      });
    }
  }, [sale, open]);

  const handleSave = async () => {
    if (!sale) return;
    try {
      await updateSale(sale.id, {
        payment_method: form.payment_method as "cash" | "transfer",
        cash_on_delivery: form.cash_on_delivery,
        shipping_cost: Number(form.shipping_cost || 0),
        location_id: form.location_id ? Number(form.location_id) : null,
      });
      toast.success("Venta actualizada");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar la venta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar datos de venta</DialogTitle>
          <DialogDescription>
            Ajusta método de pago, ubicación y envío. No se puede editar si la factura ya fue autorizada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Ubicación</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.location_id}
              onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}
            >
              <option value="">Ubicación por defecto</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Costo de envío</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.shipping_cost}
              onChange={(e) => setForm((f) => ({ ...f, shipping_cost: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.cash_on_delivery}
              onChange={(e) => setForm((f) => ({ ...f, cash_on_delivery: e.target.checked }))}
            />
            Contra entrega
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
