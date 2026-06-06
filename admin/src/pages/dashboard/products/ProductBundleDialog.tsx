import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../utils/api";
import { useProductBundleStore } from "../../../stores/productBundleStore";
import type { Product, ProductBundle } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BundleLine {
  id?: number;
  product_variant_id: string;
  quantity: string;
}

interface ProductBundleDialogProps {
  open: boolean;
  onClose: () => void;
  bundle?: ProductBundle | null;
}

const emptyLine = (): BundleLine => ({ product_variant_id: "", quantity: "1" });

export default function ProductBundleDialog({ open, onClose, bundle }: ProductBundleDialogProps) {
  const { createBundle, updateBundle, isSubmitting } = useProductBundleStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [lines, setLines] = useState<BundleLine[]>([emptyLine(), emptyLine()]);
  const isEditing = !!bundle;

  useEffect(() => {
    if (!open) return;
    api
      .get("/api/v1/products", { params: { page: 1, per_page: 200 } })
      .then((response) => setProducts(response.data.products ?? []))
      .catch(() => toast.error("Error al cargar productos para el combo"));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!bundle) {
      reset();
      return;
    }

    setName(bundle.name);
    setDescription(bundle.description ?? "");
    setBasePrice(String(bundle.base_price));
    setLines(
      bundle.items.map((item) => ({
        id: item.id,
        product_variant_id: String(item.product_variant_id),
        quantity: String(item.quantity),
      })),
    );
  }, [open, bundle]);

  const variantOptions = useMemo(() => {
    return products.filter((product) => product.product_type !== "service").flatMap((product) =>
      product.variants.map((variant) => ({
        id: variant.id,
        label: `${product.name}${[variant.size, variant.color].filter(Boolean).length ? ` (${[variant.size, variant.color].filter(Boolean).join(" / ")})` : ""}`,
        sku: variant.sku,
        cost: product.cost,
      })),
    );
  }, [products]);

  const estimatedCost = lines.reduce((sum, line) => {
    const variant = variantOptions.find((option) => String(option.id) === line.product_variant_id);
    return sum + (variant?.cost ?? 0) * (Number(line.quantity) || 0);
  }, 0);

  const reset = () => {
    setName("");
    setDescription("");
    setBasePrice("");
    setLines([emptyLine(), emptyLine()]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const validLines = lines.filter((line) => line.product_variant_id && Number(line.quantity) > 0);
    const uniqueVariantIds = new Set(validLines.map((line) => line.product_variant_id));
    if (!name.trim()) return toast.error("El nombre del combo es requerido");
    if (Number(basePrice) <= 0) return toast.error("El precio del combo debe ser mayor a cero");
    if (validLines.length < 2) return toast.error("Agrega al menos dos productos al combo");
    if (uniqueVariantIds.size !== validLines.length) return toast.error("No repitas el mismo producto en el combo");

    try {
      const removedLines =
        bundle?.items
          .filter((item) => !validLines.some((line) => line.id === item.id))
          .map((item) => ({
            id: item.id,
            product_variant_id: item.product_variant_id,
            quantity: item.quantity,
            _destroy: true,
          })) ?? [];

      const payload = {
        name,
        description,
        base_price: Number(basePrice),
        active: bundle?.active ?? true,
        product_bundle_items_attributes: [
          ...validLines.map((line) => ({
          id: line.id,
          product_variant_id: Number(line.product_variant_id),
          quantity: Number(line.quantity),
        })),
          ...removedLines,
        ],
      };

      if (bundle) {
        await updateBundle(bundle.id, payload);
      } else {
        await createBundle(payload);
      }
      toast.success(bundle ? "Combo actualizado correctamente" : "Combo creado correctamente");
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : bundle ? "Error al actualizar el combo" : "Error al crear el combo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Combo / Promo" : "Nuevo Combo / Promo"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los productos, cantidades o precio promocional del combo."
              : "Vende varios productos juntos con un precio promocional. El stock se descontará de cada producto del combo."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Combo Creatinas" />
            </div>
            <div className="space-y-2">
              <Label>Precio combo</Label>
              <Input type="number" min={0} step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Productos incluidos</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyLine()])}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
              </Button>
            </div>

            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[1fr_80px_36px] items-start gap-2">
                <Combobox
                  options={variantOptions.map((o) => ({
                    value: String(o.id),
                    label: o.label,
                    description: o.sku,
                    keywords: o.sku,
                  }))}
                  value={line.product_variant_id}
                  onSelect={(val) =>
                    setLines((current) =>
                      current.map((item, i) => (i === index ? { ...item, product_variant_id: val } : item)),
                    )
                  }
                  placeholder="Selecciona variante..."
                  searchPlaceholder="Buscar por nombre o SKU..."
                  emptyText="No se encontraron variantes"
                />
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((current) =>
                      current.map((item, i) => (i === index ? { ...item, quantity: e.target.value } : item)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  disabled={lines.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Costo estimado del combo: {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(estimatedCost)}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear combo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
