import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Upload,
  FileDown,
  Boxes,
  Package2,
  PackageX,
  SearchX,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import toast from "react-hot-toast";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useProductBundleStore } from "../../../stores/productBundleStore";
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
import type { Product, ProductBundle } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import Pagination from "../../../components/common/Pagination";
import SearchBar from "../../../components/common/SearchBar";
import EmptyState from "../../../components/common/EmptyState";
import ArchivedToggle from "../../../components/common/ArchivedToggle";
import { EditAction, ArchiveAction, RestoreAction } from "../../../components/common/RowActions";
import { toastUndo } from "../../../lib/toastUndo";
import ProductFormModal from "./ProductFormModal";
import ImportProductsDialog from "./ImportProductsDialog";
import ProductBundleDialog from "./ProductBundleDialog";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    n,
  );

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0)
    return (
      <Badge
        variant="secondary"
        className="bg-red-100 text-red-800 hover:bg-red-100"
      >
        Sin Stock
      </Badge>
    );
  if (stock <= 5)
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 hover:bg-amber-100"
      >
        Stock Bajo ({stock})
      </Badge>
    );
  return (
    <Badge
      variant="secondary"
      className="bg-green-100 text-green-800 hover:bg-green-100"
    >
      {stock}
    </Badge>
  );
}

function Thumb({ url, size = "h-10 w-10" }: { url?: string; size?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  return url && !failed ? (
    <img
      src={url}
      alt=""
      className={`${size} aspect-square rounded-md border bg-white object-contain`}
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      className={`${size} flex items-center justify-center rounded-md border bg-muted text-muted-foreground`}
    >
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

function productThumb(product: Product) {
  return (
    product.images?.[0]?.url ??
    product.variants.find((variant) => variant.images?.[0]?.url)?.images?.[0]
      ?.url
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
    pagination,
    isLoading,
    fetchProducts,
    fetchCategories,
    fetchBrands,
    deleteProduct,
    restoreProduct,
    exportProducts,
  } = useInventoryStore();
  const { bundles, fetchBundles, deleteBundle, restoreBundle } = useProductBundleStore();
  const { locations, fetchLocations } = useLocationStore();
  const { hasPermission, user } = useAuthStore();
  const canManage = hasPermission(Permissions.MANAGE_PRODUCTS);
  const isBusinessEmployee = user?.roles?.includes("business_employee") ?? false;

  const [firstLoad, setFirstLoad] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<ProductBundle | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [toDeleteBundle, setToDeleteBundle] = useState<ProductBundle | null>(
    null,
  );
  const [expandedBundles, setExpandedBundles] = useState<Set<number>>(
    new Set(),
  );

  const activeCategoryIds = useMemo(() => {
    const ids = new Set<number>();
    products.forEach((p) => {
      if (p.category_id) ids.add(p.category_id);
    });
    return ids;
  }, [products]);

  const productFilters = () => ({
    search,
    category_id: categoryFilter,
    ...(showArchived ? { active: false } : {}),
  });

  useEffect(() => {
    fetchCategories();
    fetchBrands();
    fetchLocations().catch(() => {});
    fetchBundles().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts(1, pagination.per_page, productFilters())
      .catch((e) =>
        toast.error(
          e instanceof Error ? e.message : "Error al cargar productos",
        ),
      )
      .finally(() => setFirstLoad(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, showArchived]);

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

  const filteredCategoryOptions = useMemo(
    () => categoryOptions.filter((c) => activeCategoryIds.has(c.id)),
    [categoryOptions, activeCategoryIds],
  );

  const productLocationStock = (product: Product) => {
    const totals = new Map<string, number>();
    product.variants.forEach((v) => {
      v.stock_by_location?.forEach((level) => {
        totals.set(
          level.location_name,
          (totals.get(level.location_name) ?? 0) + level.quantity,
        );
      });
    });
    return Array.from(totals.entries()).map(([name, quantity]) => ({
      name,
      quantity,
    }));
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleExpandBundle = (id: number) =>
    setExpandedBundles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openCreate = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const openEditBundle = (bundle: ProductBundle) => {
    setEditingBundle(bundle);
    setBundleOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    try {
      await deleteProduct(target.id);
      toastUndo(`${target.name} archivado`, async () => {
        await restoreProduct(target.id);
        toast.success("Producto restaurado");
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al archivar el producto",
      );
    }
  };

  const handleRestore = async (product: Product) => {
    try {
      await restoreProduct(product.id);
      toast.success("Producto restaurado");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al restaurar el producto",
      );
    }
  };

  const handleDeleteBundle = async () => {
    if (!toDeleteBundle) return;
    const target = toDeleteBundle;
    setToDeleteBundle(null);
    try {
      await deleteBundle(target.id);
      toastUndo(`Combo "${target.name}" archivado`, async () => {
        await restoreBundle(target.id);
        toast.success("Combo restaurado");
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al archivar el combo",
      );
    }
  };

  const handleExport = async (locationId?: number) => {
    try {
      await exportProducts(locationId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al exportar");
    }
  };

  if (isLoading && firstLoad) return <ProductsSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            Productos, precios, costos e imágenes
          </p>
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
                  <DropdownMenuItem
                    key={l.id}
                    onClick={() => handleExport(l.id)}
                  >
                    {l.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <>
              <Button
                onClick={() => setImportOpen(true)}
                size="sm"
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" /> Importar Excel
              </Button>
              <Button onClick={openCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="combos" className="gap-2">
            Combos / Promos
            {bundles.length > 0 && (
              <Badge
                variant="secondary"
                className="rounded-full px-1.5 py-0 text-[11px]"
              >
                {bundles.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Productos ── */}
        <TabsContent value="products" className="space-y-4">
          {/* Filters */}
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
              {filteredCategoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <ArchivedToggle checked={showArchived} onChange={setShowArchived} />
          </div>

          {!isLoading && products.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {pagination.total_count} {pagination.total_count === 1 ? "producto" : "productos"}
              {showArchived && " archivados"}
            </p>
          )}

          {/* Table */}
          <Card className="p-0 rounded-xl">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-8" />
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    {!isBusinessEmployee && <TableHead>Costo</TableHead>}
                    <TableHead>Mayoreo</TableHead>
                    <TableHead>Stock</TableHead>
                    {canManage && (
                      <TableHead className="text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 9 : isBusinessEmployee ? 7 : 8} className="h-24 text-center">
                        Cargando productos...
                      </TableCell>
                    </TableRow>
                  ) : products.length ? (
                    products.map((p, idx) => (
                      <Fragment key={p.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleExpand(p.id)}
                        >
                          <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                            {(pagination.current_page - 1) * pagination.per_page + idx + 1}
                          </TableCell>
                          <TableCell>
                            {expanded.has(p.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Thumb url={productThumb(p)} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{p.name}</p>
                                  <Badge
                                    variant="outline"
                                    className="text-[11px]"
                                  >
                                    {p.product_type === "service"
                                      ? "Servicio"
                                      : "Bien"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {p.brand || "—"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{p.category || "—"}</TableCell>
                          <TableCell>{money(p.base_price)}</TableCell>
                          {!isBusinessEmployee && (
                            <TableCell className="text-muted-foreground">
                              {money(p.cost)}
                            </TableCell>
                          )}
                          <TableCell>
                            {p.wholesale_price ? money(p.wholesale_price) : "—"}
                          </TableCell>
                          <TableCell>
                            <StockBadge stock={p.total_stock} />
                            {productLocationStock(p).length > 0 && (
                              <span className="mt-1 block text-xs text-muted-foreground">
                                Clic para ver bodegas
                              </span>
                            )}
                          </TableCell>
                          {canManage && (
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {showArchived ? (
                                <RestoreAction onClick={() => handleRestore(p)} />
                              ) : (
                                <>
                                  <EditAction onClick={() => openEdit(p)} />
                                  <ArchiveAction onClick={() => setToDelete(p)} />
                                </>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                        {expanded.has(p.id) && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell />
                            <TableCell />
                            <TableCell colSpan={canManage ? 7 : isBusinessEmployee ? 5 : 6}>
                              {p.variants.length ? (
                                <div className="space-y-3 py-2">
                                  {productLocationStock(p).length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                                        Stock por bodega
                                      </p>
                                      <div className="flex flex-wrap gap-2">
                                        {productLocationStock(p).map(
                                          (level) => (
                                            <div
                                              key={level.name}
                                              className="rounded-md border bg-background px-3 py-2 text-sm"
                                            >
                                              <span className="text-muted-foreground">
                                                {level.name}
                                              </span>
                                              <span className="ml-2 font-semibold">
                                                {level.quantity}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-3">
                                    {p.variants.map((v) => (
                                      <div
                                        key={v.id}
                                        className="flex items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                                      >
                                        <Thumb
                                          url={v.images?.[0]?.url}
                                          size="h-9 w-9"
                                        />
                                        <div>
                                          <span className="font-medium">
                                            {v.size || "—"} / {v.color || "—"}
                                          </span>
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            {v.sku}
                                          </span>
                                          {(v.stock_by_location?.length ?? 0) >
                                            0 && (
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                              {v
                                                .stock_by_location!.map(
                                                  (sl) =>
                                                    `${sl.location_name}: ${sl.quantity}`,
                                                )
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
                                <span className="text-sm text-muted-foreground">
                                  Sin variantes
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={canManage ? 9 : isBusinessEmployee ? 7 : 8} className="p-0">
                        {search.trim() || categoryFilter ? (
                          <EmptyState
                            variant="no-results"
                            icon={SearchX}
                            title="Sin resultados"
                            description="No hay productos que coincidan con los filtros aplicados."
                            action={{
                              label: "Limpiar filtros",
                              onClick: () => { setSearch(""); setCategoryFilter(""); },
                            }}
                          />
                        ) : showArchived ? (
                          <EmptyState
                            variant="no-results"
                            icon={PackageX}
                            title="No hay productos archivados"
                            description="Los productos que archives aparecerán aquí."
                          />
                        ) : (
                          <EmptyState
                            icon={Package2}
                            title="Aún no tienes productos"
                            description="Crea tu primer producto o impórtalos masivamente desde un Excel."
                            action={
                              canManage
                                ? { label: "Nuevo producto", onClick: openCreate, icon: Plus }
                                : undefined
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          <Pagination
            currentPage={pagination.current_page - 1}
            pageCount={pagination.total_pages}
            totalCount={pagination.total_count}
            perPage={pagination.per_page}
            onPageChange={({ selected }) =>
              fetchProducts(selected + 1, pagination.per_page, {
                search,
                category_id: categoryFilter,
              })
            }
          />
        </TabsContent>

        {/* ── Tab Combos ── */}
        <TabsContent value="combos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Combos / Promos</h2>
              <p className="text-sm text-muted-foreground">
                Paquetes de productos con precio especial
              </p>
            </div>
            {canManage && (
              <Button onClick={() => { setEditingBundle(null); setBundleOpen(true); }} size="sm">
                <Boxes className="w-4 h-4 mr-2" /> Nuevo Combo
              </Button>
            )}
          </div>

          <Card className="rounded-xl p-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-8" />
                    <TableHead>Nombre</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Precio combo</TableHead>
                    <TableHead>Costo total</TableHead>
                    <TableHead>Stock disponible</TableHead>
                    {canManage && (
                      <TableHead className="text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundles.length ? (
                    bundles.map((b, idx) => (
                      <Fragment key={b.id}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggleExpandBundle(b.id)}
                        >
                          <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                            {idx + 1}
                          </TableCell>
                          <TableCell>
                            {expandedBundles.has(b.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{b.name}</p>
                              {b.description && (
                                <p className="text-xs text-muted-foreground">
                                  {b.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {b.items_count} items
                            </Badge>
                          </TableCell>
                          <TableCell>{money(b.base_price)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {money(b.total_cost)}
                          </TableCell>
                          <TableCell>
                            <StockBadge stock={b.available_stock} />
                          </TableCell>
                          {canManage && (
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EditAction onClick={() => openEditBundle(b)} />
                              <ArchiveAction onClick={() => setToDeleteBundle(b)} />
                            </TableCell>
                          )}
                        </TableRow>
                        {expandedBundles.has(b.id) && (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell />
                            <TableCell />
                            <TableCell colSpan={canManage ? 6 : 5}>
                              <div className="flex flex-wrap gap-3 py-2">
                                {b.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
                                  >
                                    <div>
                                      <span className="font-medium">
                                        {item.product_name}
                                      </span>
                                      {item.variant_label &&
                                        item.variant_label !== item.sku && (
                                          <span className="text-muted-foreground">
                                            {" "}
                                            — {item.variant_label}
                                          </span>
                                        )}
                                      <span className="ml-2 text-xs text-muted-foreground font-mono">
                                        {item.sku}
                                      </span>
                                      <p className="text-xs text-muted-foreground">
                                        x{item.quantity}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={canManage ? 8 : 7} className="p-0">
                        <EmptyState
                          icon={Boxes}
                          title="Aún no hay combos"
                          description="Agrupa varios productos en un paquete con precio especial para venderlos juntos."
                            action={
                              canManage
                                ? { label: "Nuevo Combo", onClick: () => { setEditingBundle(null); setBundleOpen(true); }, icon: Boxes }
                                : undefined
                            }
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sub-components */}
      <ProductFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
      />

      <ImportProductsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      <ProductBundleDialog
        open={bundleOpen}
        onClose={() => {
          setBundleOpen(false);
          setEditingBundle(null);
        }}
        bundle={editingBundle}
      />

      {/* Archive product confirmation */}
      <AlertDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar {toDelete?.name}? No se eliminará:
              quedará inactivo y podrás consultarlo con el filtro "Ver
              archivados".
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

      {/* Archive bundle confirmation */}
      <AlertDialog
        open={!!toDeleteBundle}
        onOpenChange={(o) => !o && setToDeleteBundle(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivar combo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas archivar{" "}
              <strong>{toDeleteBundle?.name}</strong>? Quedará inactivo y dejará
              de aparecer en el punto de venta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBundle}>
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
