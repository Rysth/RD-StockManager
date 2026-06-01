import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
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

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

interface AddedVariant {
  variantId: number;
  label: string;
  sku: string;
  cost: number;
}

interface QuickProductDialogProps {
  open: boolean;
  onClose: () => void;
  onProductAdded: (variant: AddedVariant) => void;
}

export default function QuickProductDialog({ open, onClose, onProductAdded }: QuickProductDialogProps) {
  const { categories, brands, createProduct, fetchProducts } = useInventoryStore();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    brand_id: "",
    base_price: "",
    cost: "",
    size: "",
    color: "",
  });

  const resetForm = () =>
    setForm({ name: "", category_id: "", brand_id: "", base_price: "", cost: "", size: "", color: "" });

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const categoryOptions = useMemo(() => {
    const byParent = new Map<number | null, (typeof categories)[number][]>();
    categories.forEach((c) => {
      const pid = c.parent_id ?? null;
      byParent.set(pid, [...(byParent.get(pid) ?? []), c]);
    });
    const options: { id: number; name: string }[] = [];
    const addOptions = (parentId: number | null, prefix = "") => {
      (byParent.get(parentId) ?? []).forEach((c) => {
        options.push({ id: c.id, name: `${prefix}${c.name}` });
        addOptions(c.id, `${prefix}-- `);
      });
    };
    addOptions(null);
    return options;
  }, [categories]);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    if (!form.category_id) return toast.error("Selecciona una categoría");
    setSaving(true);
    try {
      const saved = await createProduct({
        name: form.name,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        base_price: Number(form.base_price) || 0,
        cost: Number(form.cost) || 0,
        wholesale_price: null,
        wholesale_min_quantity: 3,
        description: "",
        active: true,
        category_id: Number(form.category_id),
        product_variants_attributes: [{ size: form.size, color: form.color, stock: 0 }],
      });
      await fetchProducts(1, 200);
      const newVariant = saved.variants?.[0];
      if (newVariant) {
        const attrs = [newVariant.size, newVariant.color].filter(Boolean).join(" / ");
        onProductAdded({
          variantId: newVariant.id,
          label: `${saved.name}${attrs ? ` (${attrs})` : ""}`,
          sku: newVariant.sku,
          cost: Number(form.cost) || 0,
        });
      }
      toast.success("Producto creado y agregado a la compra");
      handleClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear el producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()} >
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Crear producto nuevo</DialogTitle>
          <DialogDescription>
            Crea el producto y una variante; se agregará automáticamente a la compra (el stock entra al recibir).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Gorra New Era 9FORTY"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <select
                className={selectClass}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Marca</Label>
              <select
                className={selectClass}
                value={form.brand_id}
                onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
              >
                <option value="">Sin marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Precio de venta</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Costo</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Talla / Variante</Label>
              <Input
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="Ej. M (opcional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="Ej. Negro (opcional)"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creando..." : "Crear y agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
