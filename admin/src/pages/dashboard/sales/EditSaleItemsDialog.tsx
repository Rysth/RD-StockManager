import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
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

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

interface EditItem {
  product_variant_id: number | null;
  description?: string;
  label: string;
  quantity: number;
  unit_price: number;
}

interface EditSaleItemsDialogProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export default function EditSaleItemsDialog({ open, onClose, sale }: EditSaleItemsDialogProps) {
  const { syncSaleItems, isSubmitting } = useSaleStore();
  const [items, setItems] = useState<EditItem[]>([]);

  useEffect(() => {
    if (sale?.items && open) {
      setItems(
        sale.items.map((it) => ({
          product_variant_id: it.product_variant_id,
          description: it.product_name,
          label: it.product_variant_id
            ? `${it.product_name}${[it.size, it.color].filter(Boolean).length ? ` (${[it.size, it.color].filter(Boolean).join("/")})` : ""} - ${it.sku}`
            : it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
        }))
      );
    }
  }, [sale, open]);

  const handleSave = async () => {
    if (!sale) return;
    const filtered = items.filter((i) => i.quantity > 0);
    if (filtered.length === 0) {
      toast.error("La venta debe tener al menos un producto");
      return;
    }
    try {
      await syncSaleItems(sale.id, filtered);
      toast.success("Items actualizados");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar los items");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar productos</DialogTitle>
          <DialogDescription>
            Modifica cantidades o precios de la venta pendiente {sale?.code}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {items.map((it, idx) => {
            const img = sale?.items?.find((si) => si.product_variant_id === it.product_variant_id)?.images?.[0];
            return (
              <div
                key={`${it.product_variant_id ?? "service"}-${idx}`}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
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
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: q } : x)));
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
                        setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, unit_price: p } : x)));
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
                    onClick={() =>
                      setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, quantity: 0 } : x)))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
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
