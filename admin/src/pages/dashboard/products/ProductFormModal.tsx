import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, ImagePlus, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import type { Product, ProductVariant, ProductImage } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_IMAGES = 3;

// ── Local types ──────────────────────────────────────────────

interface VariantForm {
  id?: number;
  size: string;
  color: string;
  stock: number;
  existingImages: ProductImage[];
  pendingFiles: File[];
  _destroy?: boolean;
}

interface ProductForm {
  name: string;
  product_type: "good" | "service";
  brand_id: string;
  base_price: string;
  cost: string;
  wholesale_price: string;
  wholesale_min_quantity: string;
  description: string;
  active: boolean;
  category_id: string;
  existingImages: ProductImage[];
  pendingFiles: File[];
  variants: VariantForm[];
}

const emptyVariant = (): VariantForm => ({
  size: "",
  color: "",
  stock: 0,
  existingImages: [],
  pendingFiles: [],
});

const EMPTY_FORM: ProductForm = {
  name: "",
  product_type: "good",
  brand_id: "",
  base_price: "",
  cost: "",
  wholesale_price: "",
  wholesale_min_quantity: "3",
  description: "",
  active: true,
  category_id: "",
  existingImages: [],
  pendingFiles: [],
  variants: [emptyVariant()],
};

// ── Thumb ────────────────────────────────────────────────────

function Thumb({ url, size = "h-16 w-16" }: { url?: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} rounded-md object-cover border`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-md border bg-muted text-muted-foreground`}>
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

// ── ImageGallery ─────────────────────────────────────────────

function ImageGallery({
  existing,
  pending,
  onAddFiles,
  onRemoveExisting,
  onRemovePending,
  thumbSize = "h-16 w-16",
}: {
  existing: ProductImage[];
  pending: File[];
  onAddFiles: (files: File[]) => void;
  onRemoveExisting: (imageId: number) => void;
  onRemovePending: (index: number) => void;
  thumbSize?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const total = existing.length + pending.length;
  const canAdd = total < MAX_IMAGES;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {existing.map((img) => (
        <div key={`e-${img.id}`} className="relative">
          <Thumb url={img.url} size={thumbSize} />
          <button
            type="button"
            onClick={() => onRemoveExisting(img.id)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
            title="Eliminar imagen"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {pending.map((file, i) => (
        <div key={`p-${i}`} className="relative">
          <Thumb url={URL.createObjectURL(file)} size={thumbSize} />
          <button
            type="button"
            onClick={() => onRemovePending(i)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
            title="Quitar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={`${thumbSize} flex flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-muted/50`}
        >
          <ImagePlus className="h-4 w-4" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onAddFiles(files.slice(0, MAX_IMAGES - total));
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const {
    categories,
    brands,
    createProduct,
    updateProduct,
    uploadProductImages,
    deleteProductImage,
    uploadVariantImages,
    deleteVariantImage,
    fetchProducts,
    pagination,
    currentFilters,
  } = useInventoryStore();

  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        name: product.name,
        product_type: product.product_type ?? "good",
        brand_id: product.brand_id != null ? String(product.brand_id) : "",
        base_price: String(product.base_price),
        cost: String(product.cost ?? ""),
        wholesale_price: product.wholesale_price != null ? String(product.wholesale_price) : "",
        wholesale_min_quantity: String(product.wholesale_min_quantity ?? 3),
        description: product.description ?? "",
        active: product.active,
        category_id: String(product.category_id),
        existingImages: product.images ?? [],
        pendingFiles: [],
        variants: product.variants.map((v: ProductVariant) => ({
          id: v.id,
          size: v.size ?? "",
          color: v.color ?? "",
          stock: v.stock,
          existingImages: v.images ?? [],
          pendingFiles: [],
        })),
      });
    } else {
      setForm({ ...EMPTY_FORM, variants: [emptyVariant()] });
    }
  }, [open, product]);

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

  const patchVariant = (index: number, patch: Partial<VariantForm>) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));

  const removeVariant = (index: number) =>
    setForm((f) => {
      const v = f.variants[index];
      if (v.id) {
        return { ...f, variants: f.variants.map((x, i) => (i === index ? { ...x, _destroy: true } : x)) };
      }
      return { ...f, variants: f.variants.filter((_, i) => i !== index) };
    });

  const removeProductImage = async (imageId: number) => {
    if (!product) return;
    try {
      await deleteProductImage(product.id, imageId);
      setForm((f) => ({ ...f, existingImages: f.existingImages.filter((i) => i.id !== imageId) }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar la imagen");
    }
  };

  const removeVariantImage = async (variantIndex: number, imageId: number) => {
    const v = form.variants[variantIndex];
    if (!v.id) return;
    try {
      await deleteVariantImage(v.id, imageId);
      patchVariant(variantIndex, { existingImages: v.existingImages.filter((i) => i.id !== imageId) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar la imagen");
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    if (!form.category_id) return toast.error("Selecciona una categoría");

    const variantAttributes = form.variants
      .filter((v) => v.id || (!v._destroy && (v.size || v.color)))
      .map((v) => ({ id: v.id, size: v.size, color: v.color, stock: Number(v.stock) || 0, _destroy: v._destroy }));

    if (!product && form.product_type === "service" && variantAttributes.length === 0) {
      variantAttributes.push({ id: undefined, size: "Servicio", color: "", stock: 0, _destroy: undefined });
    }

    const payload = {
      name: form.name,
      product_type: form.product_type,
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      base_price: parseFloat(form.base_price) || 0,
      cost: parseFloat(form.cost) || 0,
      wholesale_price: form.wholesale_price ? parseFloat(form.wholesale_price) : null,
      wholesale_min_quantity: Number(form.wholesale_min_quantity) || 3,
      description: form.description,
      active: form.active,
      category_id: Number(form.category_id),
      product_variants_attributes: variantAttributes,
    };

    setSaving(true);
    try {
      const saved = product
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);

      if (form.pendingFiles.length) await uploadProductImages(saved.id, form.pendingFiles);

      const used = new Set<number>();
      for (const v of form.variants) {
        if (v._destroy || !v.pendingFiles.length) continue;
        const target = v.id
          ? saved.variants.find((s) => s.id === v.id)
          : saved.variants.find((s) => s.size === v.size && s.color === v.color && !used.has(s.id));
        if (target) {
          used.add(target.id);
          await uploadVariantImages(target.id, v.pendingFiles);
        }
      }

      await fetchProducts(pagination.current_page, pagination.per_page, currentFilters);
      toast.success(product ? "Producto actualizado correctamente" : "Producto creado correctamente");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const margin =
    form.base_price && form.cost ? parseFloat(form.base_price) - parseFloat(form.cost) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{product ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
          <DialogDescription>Datos del producto, precios, imágenes y variantes</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nombre</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-brand">Marca</Label>
              <select
                id="p-brand"
                value={form.brand_id}
                onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sin marca</option>
                {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-type">Tipo</Label>
              <select
                id="p-type"
                value={form.product_type}
                onChange={(e) => setForm({ ...form, product_type: e.target.value as "good" | "service" })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="good">Bien físico</option>
                <option value="service">Servicio</option>
              </select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Precio venta</Label>
              <Input id="p-price" type="number" step="0.01" value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-cost">Costo unitario</Label>
              <Input id="p-cost" type="number" step="0.01" value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-wprice">Precio mayoreo</Label>
              <Input id="p-wprice" type="number" step="0.01" placeholder="Opcional" value={form.wholesale_price}
                onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-wmin">Mín. mayoreo</Label>
              <Input id="p-wmin" type="number" min="1" value={form.wholesale_min_quantity}
                onChange={(e) => setForm({ ...form, wholesale_min_quantity: e.target.value })} />
            </div>
          </div>
          {margin != null && (
            <p className="text-xs text-muted-foreground">
              Margen estimado por unidad:{" "}
              <span className="font-medium text-foreground">
                {new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(margin)}
              </span>
              {form.wholesale_price
                ? ` · mayoreo desde ${form.wholesale_min_quantity} uds a ${new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(parseFloat(form.wholesale_price))}`
                : ""}
            </p>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="p-category">Categoría</Label>
            <select
              id="p-category"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecciona...</option>
              {categoryOptions.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea
              id="p-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Active */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Producto activo
          </label>

          {/* Product images */}
          <div className="space-y-2">
            <Label>Imágenes del producto (máx. {MAX_IMAGES})</Label>
            <ImageGallery
              existing={form.existingImages}
              pending={form.pendingFiles}
              onAddFiles={(files) => setForm((f) => ({ ...f, pendingFiles: [...f.pendingFiles, ...files] }))}
              onRemoveExisting={removeProductImage}
              onRemovePending={(i) =>
                setForm((f) => ({ ...f, pendingFiles: f.pendingFiles.filter((_, idx) => idx !== i) }))
              }
            />
          </div>

          {/* Variants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Variantes (talla / color / stock / imágenes)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }))}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-3">
              {form.variants.map((v, index) =>
                v._destroy ? null : (
                  <div key={index} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Talla"
                        value={v.size}
                        onChange={(e) => patchVariant(index, { size: e.target.value })}
                      />
                      <Input
                        placeholder="Color"
                        value={v.color}
                        onChange={(e) => patchVariant(index, { color: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Stock"
                        value={v.stock}
                        className="w-24"
                        onChange={(e) => patchVariant(index, { stock: Number(e.target.value) })}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => removeVariant(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <ImageGallery
                      thumbSize="h-12 w-12"
                      existing={v.existingImages}
                      pending={v.pendingFiles}
                      onAddFiles={(files) => patchVariant(index, { pendingFiles: [...v.pendingFiles, ...files] })}
                      onRemoveExisting={(imageId) => removeVariantImage(index, imageId)}
                      onRemovePending={(i) =>
                        patchVariant(index, { pendingFiles: v.pendingFiles.filter((_, idx) => idx !== i) })
                      }
                    />
                    {!v.id && v.pendingFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Las imágenes se subirán al guardar el producto.
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Guardando..." : product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
