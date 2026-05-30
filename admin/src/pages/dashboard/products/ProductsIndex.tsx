import { Fragment, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, X } from "lucide-react";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useAuthStore } from "../../../stores/authStore";
import { Permissions } from "../../../types/auth";
import type { Product, ProductVariant } from "../../../types/inventory";
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

// Badge de stock según cantidad
function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
        Sin Stock
      </Badge>
    );
  if (stock <= 5)
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        Stock Bajo ({stock})
      </Badge>
    );
  return (
    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
      {stock}
    </Badge>
  );
}

interface VariantForm {
  id?: number;
  size: string;
  color: string;
  stock: number;
  _destroy?: boolean;
}

interface ProductForm {
  name: string;
  brand: string;
  base_price: string;
  description: string;
  active: boolean;
  category_id: string;
  variants: VariantForm[];
}

const EMPTY_FORM: ProductForm = {
  name: "",
  brand: "",
  base_price: "",
  description: "",
  active: true,
  category_id: "",
  variants: [{ size: "", color: "", stock: 0 }],
};

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

export default function ProductsIndex() {
  const {
    products,
    categories,
    pagination,
    isLoading,
    fetchProducts,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useInventoryStore();
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission(Permissions.MANAGE_PRODUCTS);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts(1, pagination.per_page, {
      search,
      category_id: categoryFilter,
    }).catch((e) => toast.error(e.message || "Error al cargar productos"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, variants: [{ size: "", color: "", stock: 0 }] });
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      brand: product.brand ?? "",
      base_price: String(product.base_price),
      description: product.description ?? "",
      active: product.active,
      category_id: String(product.category_id),
      variants: product.variants.map((v: ProductVariant) => ({
        id: v.id,
        size: v.size ?? "",
        color: v.color ?? "",
        stock: v.stock,
      })),
    });
    setModalOpen(true);
  };

  const addVariantRow = () =>
    setForm((f) => ({ ...f, variants: [...f.variants, { size: "", color: "", stock: 0 }] }));

  const updateVariant = (index: number, patch: Partial<VariantForm>) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));

  const removeVariant = (index: number) =>
    setForm((f) => {
      const variant = f.variants[index];
      // Si ya existe en BD, marcar _destroy; si no, quitar de la lista
      if (variant.id) {
        return {
          ...f,
          variants: f.variants.map((v, i) =>
            i === index ? { ...v, _destroy: true } : v,
          ),
        };
      }
      return { ...f, variants: f.variants.filter((_, i) => i !== index) };
    });

  const handleSubmit = async () => {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    if (!form.category_id) return toast.error("Selecciona una categoría");

    const payload = {
      name: form.name,
      brand: form.brand,
      base_price: parseFloat(form.base_price) || 0,
      description: form.description,
      active: form.active,
      category_id: Number(form.category_id),
      product_variants_attributes: form.variants
        .filter((v) => v.id || (!v._destroy && (v.size || v.color)))
        .map((v) => ({
          id: v.id,
          size: v.size,
          color: v.color,
          stock: Number(v.stock) || 0,
          _destroy: v._destroy,
        })),
    };

    try {
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success("Producto actualizado correctamente");
      } else {
        await createProduct(payload);
        toast.success("Producto creado correctamente");
      }
      setModalOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error al guardar el producto");
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteProduct(toDelete.id);
      toast.success("Producto eliminado correctamente");
      setToDelete(null);
    } catch (e: any) {
      toast.error(e.message || "Error al eliminar el producto");
    }
  };

  const visibleVariants = form.variants.filter((v) => !v._destroy);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Productos, tallas, colores y stock
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
          </Button>
        )}
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
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Producto</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock total</TableHead>
                <TableHead>Estado</TableHead>
                {canManage && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    Cargando productos...
                  </TableCell>
                </TableRow>
              ) : products.length ? (
                products.map((p) => (
                  <Fragment key={p.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleExpand(p.id)}>
                      <TableCell>
                        {expanded.has(p.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.brand || "—"}</TableCell>
                      <TableCell>{p.category || "—"}</TableCell>
                      <TableCell>{money(p.base_price)}</TableCell>
                      <TableCell>
                        <StockBadge stock={p.total_stock} />
                      </TableCell>
                      <TableCell>
                        {p.active ? (
                          <Badge variant="outline" className="text-green-700">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setToDelete(p)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {expanded.has(p.id) && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={canManage ? 7 : 6}>
                          {p.variants.length ? (
                            <div className="flex flex-wrap gap-3 py-2">
                              {p.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                                >
                                  <span className="font-medium">
                                    {v.size || "—"} / {v.color || "—"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{v.sku}</span>
                                  <StockBadge stock={v.stock} />
                                </div>
                              ))}
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
              Define los datos del producto y sus variantes (talla / color / stock)
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
                <Input id="p-brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-price">Precio base</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-category">Categoría</Label>
                <select
                  id="p-category"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecciona...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">Descripción</Label>
              <Textarea
                id="p-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Producto activo
            </label>

            {/* Variantes dinámicas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Variantes (talla / color / stock)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addVariantRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                </Button>
              </div>
              <div className="space-y-2">
                {visibleVariants.map((v) => {
                  const realIndex = form.variants.indexOf(v);
                  return (
                    <div key={realIndex} className="flex items-center gap-2">
                      <Input
                        placeholder="Talla"
                        value={v.size}
                        onChange={(e) => updateVariant(realIndex, { size: e.target.value })}
                      />
                      <Input
                        placeholder="Color"
                        value={v.color}
                        onChange={(e) => updateVariant(realIndex, { color: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Stock"
                        value={v.stock}
                        onChange={(e) => updateVariant(realIndex, { stock: Number(e.target.value) })}
                        className="w-24"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => removeVariant(realIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {editing ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas eliminar {toDelete?.name}? Se eliminarán también
              sus variantes. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
