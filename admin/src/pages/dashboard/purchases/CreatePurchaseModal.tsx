import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useLocationStore } from "../../../stores/locationStore";
import type { PurchaseItemInput, Product, PurchaseStatus } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import QuickProductDialog from "./QuickProductDialog";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n || 0);

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

interface CartLine extends PurchaseItemInput {
  label: string;
  sku: string;
}

interface CreatePurchaseModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePurchaseModal({ open, onClose }: CreatePurchaseModalProps) {
  const { createPurchase, isSubmitting } = usePurchaseStore();
  const { products, fetchProducts } = useInventoryStore();
  const { customers } = useCustomerStore();
  const { locations } = useLocationStore();

  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paid, setPaid] = useState("0");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);

  const suppliers = customers.filter((c) => c.is_supplier);

  useEffect(() => {
    if (open) {
      fetchProducts(1, 200).catch(() => {});
      const def = locations.find((l) => l.is_default);
      setLocationId(def ? String(def.id) : locations[0] ? String(locations[0].id) : "");
    }
  }, [open, fetchProducts, locations]);

  const variantOptions = useMemo(() => {
    const opts: { id: number; label: string; sku: string; cost: number }[] = [];
    (products as Product[]).forEach((p) => {
      p.variants.forEach((v) => {
        const attrs = [v.size, v.color].filter(Boolean).join(" / ");
        opts.push({ id: v.id, label: `${p.name}${attrs ? ` (${attrs})` : ""}`, sku: v.sku, cost: p.cost });
      });
    });
    return opts;
  }, [products]);

  const comboboxOptions = useMemo(
    () => variantOptions.map((o) => ({ value: String(o.id), label: o.label, description: o.sku, keywords: o.sku })),
    [variantOptions],
  );

  const subtotal = cart.reduce((s, l) => s + l.quantity * l.unit_cost, 0);
  const total = subtotal - Number(discount || 0) + Number(tax || 0);

  const reset = () => {
    setSupplierId("");
    setDiscount("0");
    setTax("0");
    setPaid("0");
    setDueDate("");
    setReference("");
    setCart([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addVariantById = (idStr: string) => {
    const opt = variantOptions.find((o) => o.id === Number(idStr));
    if (!opt) return;
    if (cart.some((l) => l.product_variant_id === opt.id)) {
      toast.error("Esa variante ya está en la compra");
      return;
    }
    setCart((prev) => [
      ...prev,
      { product_variant_id: opt.id, quantity: 1, unit_cost: opt.cost || 0, label: opt.label, sku: opt.sku },
    ]);
  };

  const updateLine = (id: number, field: "quantity" | "unit_cost", value: number) =>
    setCart(cart.map((l) => (l.product_variant_id === id ? { ...l, [field]: value } : l)));

  const removeLine = (id: number) =>
    setCart(cart.filter((l) => l.product_variant_id !== id));

  const handleSubmit = async (status: PurchaseStatus) => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    try {
      await createPurchase({
        customer_id: supplierId ? Number(supplierId) : null,
        location_id: locationId ? Number(locationId) : null,
        status,
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        paid_amount: Number(paid || 0),
        due_date: dueDate || null,
        reference: reference || null,
        items: cart.map((l) => ({
          product_variant_id: l.product_variant_id,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
        })),
      });
      toast.success(
        status === "received" ? "Compra recibida (stock actualizado)" : "Compra guardada como borrador",
      );
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar la compra");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent
          className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Nueva Compra</DialogTitle>
            <DialogDescription>Registra una compra a un proveedor</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <select className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Sin proveedor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {locations.length > 1 && (
                <div className="space-y-2">
                  <Label>Ubicación destino</Label>
                  <select className={selectClass} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Agregar producto</Label>
              <Combobox
                options={comboboxOptions}
                onSelect={addVariantById}
                placeholder="Busca un producto o variante..."
                searchPlaceholder="Nombre, talla, color o SKU..."
                emptyText="No se encontró ese producto."
                actionLabel="Crear producto nuevo"
                onAction={() => setQuickOpen(true)}
              />
            </div>

            {cart.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-20">Cant.</TableHead>
                      <TableHead className="w-28">Costo U.</TableHead>
                      <TableHead className="w-24">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((l) => (
                      <TableRow key={l.product_variant_id}>
                        <TableCell className="text-sm">{l.label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) =>
                              updateLine(l.product_variant_id, "quantity", Math.max(1, Number(e.target.value)))
                            }
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={l.unit_cost}
                            onChange={(e) => updateLine(l.product_variant_id, "unit_cost", Number(e.target.value))}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell className="text-sm">{money(l.quantity * l.unit_cost)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeLine(l.product_variant_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Descuento</Label>
                <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Impuesto (IVA)</Label>
                <Input type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pagado</Label>
                <Input type="number" min={0} step="0.01" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Referencia / Factura</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° factura" />
              </div>
            </div>

            <div className="flex justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Subtotal: {money(subtotal)}</span>
              <span className="font-semibold">Total: {money(total)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={() => handleSubmit("draft")} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar compra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickProductDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onProductAdded={({ variantId, label, sku, cost }) => {
          if (cart.some((l) => l.product_variant_id === variantId)) return;
          setCart((prev) => [
            ...prev,
            { product_variant_id: variantId, quantity: 1, unit_cost: cost, label, sku },
          ]);
        }}
      />
    </>
  );
}
