import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, ChevronRight, ChevronDown, X, ImagePlus, ImageIcon, Archive, Upload, FileSpreadsheet, Download, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useAuthStore } from "../../../stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Permissions } from "../../../types/auth";
import type { Product, ProductVariant, ProductImage } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_IMAGES = 3;

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Sin Stock</Badge>;
  if (stock <= 5)
    return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">Stock Bajo ({stock})</Badge>;
  return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">{stock}</Badge>;
}

// Miniatura cuadrada (imagen o placeholder)
function Thumb({ url, size = "h-10 w-10" }: { url?: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} rounded-md object-cover border`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-md border bg-muted text-muted-foreground`}>
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

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

// Galería reutilizable: muestra imágenes existentes (con borrar) y pendientes (preview)
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

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductsIndex() {
  const {
    products,
    categories,
    brands,
    pagination,
    isLoading,
    fetchProducts,
    fetchCategories,
    fetchBrands,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    deleteProductImage,
    uploadVariantImages,
    deleteVariantImage,
    importProducts,
    downloadImportTemplate,
    exportProducts,
  } = useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission(Permissions.MANAGE_PRODUCTS);

  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  // Importación masiva por Excel
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const productFilters = () => ({
    search,
    category_id: categoryFilter,
    ...(showArchived ? { active: false } : {}),
  });

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchLocations().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async (locationId?: number) => {
    try {
      await exportProducts(locationId);
    } catch (e) {
      toast.error(errorMessage(e, "Error al exportar"));
    }
  };

  useEffect(() => {
    fetchProducts(1, pagination.per_page, productFilters())
      .catch((e) => toast.error(e.message || "Error al cargar productos"))
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, showArchived]);

  const reload = () =>
    fetchProducts(pagination.current_page, pagination.per_page, productFilters());

  const categoryOptions = useMemo(() => {
    const byParent = new Map<number | null, (typeof categories)[number][]>();
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null;
      byParent.set(parentId, [...(byParent.get(parentId) ?? []), category]);
    });

    const options: { id: number; name: string }[] = [];
    const addOptions = (parentId: number | null, prefix = "") => {
      (byParent.get(parentId) ?? []).forEach((category) => {
        options.push({ id: category.id, name: `${prefix}${category.name}` });
        addOptions(category.id, `${prefix}-- `);
      });
    };

    addOptions(null);
    return options;
  }, [categories]);

  const productLocationStock = (product: Product) => {
    const totals = new Map<string, number>();
    product.variants.forEach((variant) => {
      variant.stock_by_location?.forEach((level) => {
        totals.set(level.location_name, (totals.get(level.location_name) ?? 0) + level.quantity);
      });
    });
    return Array.from(totals.entries()).map(([name, quantity]) => ({ name, quantity }));
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, variants: [emptyVariant()] });
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
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
    setModalOpen(true);
  };

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

  // Borrado inmediato de imagen existente (producto ya guardado)
  const removeProductImage = async (imageId: number) => {
    if (!editing) return;
    try {
      await deleteProductImage(editing.id, imageId);
      setForm((f) => ({ ...f, existingImages: f.existingImages.filter((i) => i.id !== imageId) }));
    } catch (e) {
      toast.error(errorMessage(e, "Error al eliminar la imagen"));
    }
  };

  const removeVariantImage = async (variantIndex: number, imageId: number) => {
    const v = form.variants[variantIndex];
    if (!v.id) return;
    try {
      await deleteVariantImage(v.id, imageId);
      patchVariant(variantIndex, { existingImages: v.existingImages.filter((i) => i.id !== imageId) });
    } catch (e) {
      toast.error(errorMessage(e, "Error al eliminar la imagen"));
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    if (!form.category_id) return toast.error("Selecciona una categoría");

    const payload = {
      name: form.name,
      brand_id: form.brand_id ? Number(form.brand_id) : null,
      base_price: parseFloat(form.base_price) || 0,
      cost: parseFloat(form.cost) || 0,
      wholesale_price: form.wholesale_price ? parseFloat(form.wholesale_price) : null,
      wholesale_min_quantity: Number(form.wholesale_min_quantity) || 3,
      description: form.description,
      active: form.active,
      category_id: Number(form.category_id),
      product_variants_attributes: form.variants
        .filter((v) => v.id || (!v._destroy && (v.size || v.color)))
        .map((v) => ({ id: v.id, size: v.size, color: v.color, stock: Number(v.stock) || 0, _destroy: v._destroy })),
    };

    setSaving(true);
    try {
      const saved = editing ? await updateProduct(editing.id, payload) : await createProduct(payload);

      // Imágenes del producto
      if (form.pendingFiles.length) await uploadProductImages(saved.id, form.pendingFiles);

      // Imágenes de variantes (match por id, o por talla+color para las nuevas)
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

      await reload();
      toast.success(editing ? "Producto actualizado correctamente" : "Producto creado correctamente");
      setModalOpen(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al guardar el producto"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id);
      toast.success("Producto archivado correctamente");
      setToDelete(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al archivar el producto"));
    }
  };

  const handleImport = async () => {
    if (!importFile) return toast.error("Selecciona un archivo .xlsx");
    setImporting(true);
    try {
      const result = await importProducts(importFile);
      const errors = result.errors?.length
        ? ` · ${result.errors.length} con error`
        : "";
      toast.success(
        `Importación: ${result.products_created} productos, ${result.variants_created} variantes${errors}`,
      );
      if (result.errors?.length) {
        result.errors.slice(0, 3).forEach((msg) => toast.error(msg));
      }
      setImportOpen(false);
      setImportFile(null);
    } catch (e) {
      toast.error(errorMessage(e, "Error al importar"));
    } finally {
      setImporting(false);
    }
  };

  if (isLoading && firstLoad) return <ProductsSkeleton />;

  const margin =
    form.base_price && form.cost ? parseFloat(form.base_price) - parseFloat(form.cost) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">Productos, precios, costos e imágenes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <FileDown className="w-4 h-4 mr-2" /> Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuLabel>Exportar inventario</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport()}>
                Inventario general
              </DropdownMenuItem>
              {locations.length > 1 &&
                locations.map((l) => (
                  <DropdownMenuItem key={l.id} onClick={() => handleExport(l.id)}>
                    {l.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <>
              <Button onClick={() => setImportOpen(true)} size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-2" /> Importar Excel
              </Button>
              <Button onClick={openCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar
          placeholder="Buscar por nombre o marca..."
          value={search}
          onSearch={setSearch}
          className="max-w-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Ver archivados
        </label>
      </div>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Mayoreo</TableHead>
                <TableHead>Stock</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">Cargando productos...</TableCell>
                </TableRow>
              ) : products.length ? (
                products.map((p) => (
                  <Fragment key={p.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleExpand(p.id)}>
                      <TableCell>
                        {expanded.has(p.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Thumb url={p.images?.[0]?.url} />
                          <div>
                            <p className="font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.brand || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{p.category || "—"}</TableCell>
                      <TableCell>{money(p.base_price)}</TableCell>
                      <TableCell className="text-muted-foreground">{money(p.cost)}</TableCell>
                      <TableCell>{p.wholesale_price ? money(p.wholesale_price) : "—"}</TableCell>
                      <TableCell>
                        <StockBadge stock={p.total_stock} />
                        {productLocationStock(p).length > 0 && (
                          <span className="mt-1 block text-xs text-muted-foreground">Clic para ver bodegas</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setToDelete(p)} title="Archivar">
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {expanded.has(p.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={canManage ? 7 : 6}>
                          {p.variants.length ? (
                            <div className="space-y-3 py-2">
                              {productLocationStock(p).length > 0 && (
                                <div>
                                  <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Stock por bodega</p>
                                  <div className="flex flex-wrap gap-2">
                                    {productLocationStock(p).map((level) => (
                                      <div key={level.name} className="rounded-md border bg-background px-3 py-2 text-sm">
                                        <span className="text-muted-foreground">{level.name}</span>
                                        <span className="ml-2 font-semibold">{level.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-3">
                              {p.variants.map((v) => (
                                <div key={v.id} className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                                  <Thumb url={v.images?.[0]?.url} size="h-9 w-9" />
                                  <div>
                                    <span className="font-medium">{v.size || "—"} / {v.color || "—"}</span>
                                    <span className="ml-2 text-xs text-muted-foreground">{v.sku}</span>
                                    {(v.stock_by_location?.length ?? 0) > 0 && (
                                      <div className="mt-0.5 text-xs text-muted-foreground">
                                        {v.stock_by_location!
                                          .map((sl) => `${sl.location_name}: ${sl.quantity}`)
                                          .join(" · ")}
                                      </div>
                                    )}
                                  </div>
                                  <StockBadge stock={v.stock} />
                                </div>
                              ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin variantes</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No se encontraron productos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        currentPage={pagination.current_page - 1}
        pageCount={pagination.total_pages}
        totalCount={pagination.total_count}
        perPage={pagination.per_page}
        onPageChange={({ selected }) =>
          fetchProducts(selected + 1, pagination.per_page, { search, category_id: categoryFilter })
        }
      />

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              Datos del producto, precios, imágenes y variantes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Nombre</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-brand">Marca</Label>
                <select id="p-brand" value={form.brand_id}
                  onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Sin marca</option>
                  {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
              </div>
            </div>

            {/* Precios */}
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
                Margen estimado por unidad: <span className="font-medium text-foreground">{money(margin)}</span>
                {form.wholesale_price ? ` · mayoreo desde ${form.wholesale_min_quantity} uds a ${money(parseFloat(form.wholesale_price))}` : ""}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="p-category">Categoría</Label>
              <select id="p-category" value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecciona...</option>
                {categoryOptions.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">Descripción</Label>
              <Textarea id="p-desc" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Producto activo
            </label>

            {/* Imágenes del producto */}
            <div className="space-y-2">
              <Label>Imágenes del producto (máx. {MAX_IMAGES})</Label>
              <ImageGallery
                existing={form.existingImages}
                pending={form.pendingFiles}
                onAddFiles={(files) => setForm((f) => ({ ...f, pendingFiles: [...f.pendingFiles, ...files] }))}
                onRemoveExisting={removeProductImage}
                onRemovePending={(i) => setForm((f) => ({ ...f, pendingFiles: f.pendingFiles.filter((_, idx) => idx !== i) }))}
              />
            </div>

            {/* Variantes dinámicas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Variantes (talla / color / stock / imágenes)</Label>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }))}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-3">
                {form.variants.map((v, index) =>
                  v._destroy ? null : (
                    <div key={index} className="space-y-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <Input placeholder="Talla" value={v.size} onChange={(e) => patchVariant(index, { size: e.target.value })} />
                        <Input placeholder="Color" value={v.color} onChange={(e) => patchVariant(index, { color: e.target.value })} />
                        <Input type="number" placeholder="Stock" value={v.stock} className="w-24"
                          onChange={(e) => patchVariant(index, { stock: Number(e.target.value) })} />
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive"
                          onClick={() => removeVariant(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <ImageGallery
                        thumbSize="h-12 w-12"
                        existing={v.existingImages}
                        pending={v.pendingFiles}
                        onAddFiles={(files) => patchVariant(index, { pendingFiles: [...v.pendingFiles, ...files] })}
                        onRemoveExisting={(imageId) => removeVariantImage(index, imageId)}
                        onRemovePending={(i) => patchVariant(index, { pendingFiles: v.pendingFiles.filter((_, idx) => idx !== i) })}
                      />
                      {!v.id && v.pendingFiles.length > 0 && (
                        <p className="text-xs text-muted-foreground">Las imágenes se subirán al guardar el producto.</p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar {toDelete?.name}? No se eliminará: quedará inactivo
              y podrás consultarlo con el filtro "Ver archivados".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Importación masiva por Excel */}
      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setImportFile(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar productos desde Excel</DialogTitle>
            <DialogDescription>
              Cada fila es una variante (producto, marca, categoría, precios, talla, color, stock).
              Las marcas y categorías nuevas se crean automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Button variant="outline" className="w-full" onClick={() => downloadImportTemplate().catch((e) => toast.error(errorMessage(e, "Error al descargar")))}>
              <Download className="mr-2 h-4 w-4" /> Descargar plantilla
            </Button>

            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground hover:bg-muted/50"
            >
              <FileSpreadsheet className="h-8 w-8" />
              {importFile ? (
                <span className="font-medium text-foreground">{importFile.name}</span>
              ) : (
                <span>Haz clic para seleccionar un archivo .xlsx</span>
              )}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setImportFile(file);
                e.target.value = "";
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importing || !importFile}>
              {importing ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
