import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, ShoppingCart, Search, Eye, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
import type { SaleStatus } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Pagination from "../../../components/common/Pagination";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const STATUS_META: Record<SaleStatus, { label: string; className: string }> = {
  completed: { label: "Completada", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

function Thumb({ url, size = "h-9 w-9" }: { url?: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} rounded-md border object-cover`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-md border bg-muted text-muted-foreground`}>
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

// ── Tab 1: lista de ventas + drawer de detalle + confirmación de cancelar ──
function SalesListTab() {
  const {
    sales, pagination, isLoading, fetchSales, updateSaleStatus,
    selectedSale, isLoadingDetail, fetchSale, clearSelectedSale,
  } = useSaleStore();
  const [status, setStatus] = useState<SaleStatus | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);

  useEffect(() => {
    fetchSales(1, pagination.per_page, { status }).catch((e) =>
      toast.error(e.message || "Error al cargar ventas"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openDetail = (id: number) => {
    setDrawerOpen(true);
    fetchSale(id);
  };

  const confirmCancel = async () => {
    if (cancelId == null) return;
    try {
      await updateSaleStatus(cancelId, "cancelled");
      toast.success("Venta cancelada — stock restaurado");
      if (selectedSale?.id === cancelId) {
        setDrawerOpen(false);
        clearSelectedSale();
      }
    } catch (e) {
      toast.error(errorMessage(e, "Error al cancelar la venta"));
    } finally {
      setCancelId(null);
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as SaleStatus | "")}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Todos los estados</option>
        <option value="completed">Completadas</option>
        <option value="pending">Pendientes</option>
        <option value="cancelled">Canceladas</option>
      </select>

      <Card className="p-0 rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center">Cargando ventas...</TableCell></TableRow>
              ) : sales.length ? (
                sales.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => openDetail(s.id)}>
                    <TableCell>{s.sold_at ? new Date(s.sold_at).toLocaleDateString("es-EC") : "—"}</TableCell>
                    <TableCell>{s.customer_name || "Consumidor final"}</TableCell>
                    <TableCell>{s.seller || "—"}</TableCell>
                    <TableCell>{s.items_count}</TableCell>
                    <TableCell className="font-medium">{money(s.total)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_META[s.status].className}>
                        {STATUS_META[s.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(s.id)} title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {s.status !== "cancelled" && (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelId(s.id)}>
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay ventas registradas.
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
        onPageChange={({ selected }) => fetchSales(selected + 1, pagination.per_page, { status })}
      />

      {/* Drawer de detalle */}
      <Sheet open={drawerOpen} onOpenChange={(o) => { setDrawerOpen(o); if (!o) clearSelectedSale(); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalle de venta {selectedSale ? `#${selectedSale.id}` : ""}</SheetTitle>
            <SheetDescription>Información completa de la transacción</SheetDescription>
          </SheetHeader>

          {isLoadingDetail || !selectedSale ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">Cargando...</div>
          ) : (
            <div className="space-y-4 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Cliente</p><p className="font-medium">{selectedSale.customer_name || "Consumidor final"}</p></div>
                <div><p className="text-muted-foreground">Vendedor</p><p className="font-medium">{selectedSale.seller || "—"}</p></div>
                <div><p className="text-muted-foreground">Fecha</p><p className="font-medium">{selectedSale.sold_at ? new Date(selectedSale.sold_at).toLocaleString("es-EC") : "—"}</p></div>
                <div><p className="text-muted-foreground">Estado</p>
                  <Badge variant="secondary" className={STATUS_META[selectedSale.status].className}>
                    {STATUS_META[selectedSale.status].label}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cant.</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>
                          <p className="font-medium">{it.product_name}</p>
                          <p className="text-xs text-muted-foreground">{it.size || "—"}/{it.color || "—"} · {it.sku}</p>
                        </TableCell>
                        <TableCell className="text-center">{it.quantity}</TableCell>
                        <TableCell className="text-right">{money(it.unit_price)}</TableCell>
                        <TableCell className="text-right">{money(it.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="text-lg font-bold">{money(selectedSale.total)}</span></div>
                {selectedSale.profit != null && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Ganancia</span><span className="font-medium text-emerald-600">{money(selectedSale.profit)}</span></div>
                )}
              </div>

              {selectedSale.status !== "cancelled" && (
                <Button variant="outline" className="w-full text-destructive" onClick={() => setCancelId(selectedSale.id)}>
                  Cancelar venta
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmación de cancelar */}
      <AlertDialog open={cancelId != null} onOpenChange={(o) => !o && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Cancelar venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que deseas cancelar esta venta? El stock de los productos será restaurado.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, cancelar venta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Tab 2: POS / nueva venta ──
interface CartItem {
  product_variant_id: number;
  label: string;
  sku: string;
  thumb?: string;
  base_price: number;
  wholesale_price: number | null;
  wholesale_min_quantity: number;
  quantity: number;
  max: number;
  unit_price: number;
  price_edited: boolean;
}

function suggestedPrice(item: Pick<CartItem, "base_price" | "wholesale_price" | "wholesale_min_quantity" | "quantity">) {
  if (item.wholesale_price && item.wholesale_price > 0 && item.quantity >= item.wholesale_min_quantity) {
    return item.wholesale_price;
  }
  return item.base_price;
}

function NewSale({ onComplete }: { onComplete: () => void }) {
  const { products, fetchProducts } = useInventoryStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { createSale, isSubmitting } = useSaleStore();

  const [customerId, setCustomerId] = useState<string>("");
  const [variantQuery, setVariantQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetchProducts(1, 100, {});
    fetchCustomers(1, 100, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variantResults = useMemo(() => {
    const q = variantQuery.trim().toLowerCase();
    const rows: {
      id: number; label: string; sku: string; thumb?: string; stock: number;
      base_price: number; wholesale_price: number | null; wholesale_min_quantity: number;
    }[] = [];
    products.forEach((p) => {
      p.variants.forEach((v) => {
        if (v.stock <= 0) return;
        const label = `${p.name} — ${v.size || ""}/${v.color || ""}`;
        if (q && !`${label} ${v.sku} ${p.brand ?? ""}`.toLowerCase().includes(q)) return;
        rows.push({
          id: v.id, label, sku: v.sku, stock: v.stock,
          thumb: v.images?.[0]?.url || p.images?.[0]?.url,
          base_price: p.base_price,
          wholesale_price: p.wholesale_price ?? null,
          wholesale_min_quantity: p.wholesale_min_quantity ?? 3,
        });
      });
    });
    return rows.slice(0, 10);
  }, [products, variantQuery]);

  const addToCart = (v: (typeof variantResults)[number]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_variant_id === v.id);
      if (existing) {
        if (existing.quantity >= existing.max) {
          toast.error("No hay más stock disponible");
          return prev;
        }
        return prev.map((i) => (i.product_variant_id === v.id ? withQuantity(i, i.quantity + 1) : i));
      }
      const base: CartItem = {
        product_variant_id: v.id, label: v.label, sku: v.sku, thumb: v.thumb,
        base_price: v.base_price, wholesale_price: v.wholesale_price,
        wholesale_min_quantity: v.wholesale_min_quantity,
        quantity: 1, max: v.stock, unit_price: v.base_price, price_edited: false,
      };
      return [...prev, withQuantity(base, 1)];
    });
  };

  // Recalcula el precio sugerido (mayoreo) si el usuario no lo editó manualmente
  function withQuantity(item: CartItem, quantity: number): CartItem {
    const q = Math.max(1, Math.min(quantity, item.max));
    const next = { ...item, quantity: q };
    if (!item.price_edited) next.unit_price = suggestedPrice(next);
    return next;
  }

  const setQuantity = (id: number, qty: number) =>
    setCart((prev) => prev.map((i) => (i.product_variant_id === id ? withQuantity(i, qty) : i)));

  const setPrice = (id: number, price: number) =>
    setCart((prev) => prev.map((i) => (i.product_variant_id === id ? { ...i, unit_price: price, price_edited: true } : i)));

  const resetPrice = (id: number) =>
    setCart((prev) => prev.map((i) => (i.product_variant_id === id ? withQuantity({ ...i, price_edited: false }, i.quantity) : i)));

  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.product_variant_id !== id));

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const complete = async () => {
    if (cart.length === 0) return toast.error("Agrega al menos un producto");
    try {
      await createSale({
        customer_id: customerId ? Number(customerId) : null,
        status: "completed",
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success("Venta completada correctamente");
      setCart([]); setCustomerId(""); setVariantQuery("");
      onComplete();
    } catch (e) {
      toast.error(errorMessage(e, "Error al completar la venta"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Buscador de productos */}
      <div className="space-y-4 lg:col-span-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cliente (opcional)</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Consumidor final</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.city ? ` (${c.city})` : ""}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar producto</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nombre, marca o SKU..." value={variantQuery}
              onChange={(e) => setVariantQuery(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {variantResults.length ? (
              variantResults.map((v) => (
                <button key={v.id} type="button" onClick={() => addToCart(v)}
                  className="flex items-center gap-3 rounded-lg border p-2 text-left text-sm hover:bg-muted/50">
                  <Thumb url={v.thumb} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.label}</p>
                    <p className="text-xs text-muted-foreground">{v.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{money(v.base_price)}</p>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">{v.stock}</Badge>
                  </div>
                </button>
              ))
            ) : (
              <p className="col-span-full px-3 py-6 text-center text-sm text-muted-foreground">
                Sin resultados con stock disponible.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Carrito */}
      <Card className="rounded-xl lg:col-span-2">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 font-medium">
            <ShoppingCart className="h-4 w-4" /> Carrito ({cart.length})
          </div>
          {cart.length ? (
            <div className="space-y-3">
              {cart.map((i) => {
                const wholesaleApplies =
                  !!i.wholesale_price && i.wholesale_price > 0 && i.quantity >= i.wholesale_min_quantity;
                return (
                  <div key={i.product_variant_id} className="space-y-2 rounded-lg border p-2">
                    <div className="flex items-start gap-2">
                      <Thumb url={i.thumb} size="h-8 w-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.label}</p>
                        <p className="text-xs text-muted-foreground">stock {i.max}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(i.product_variant_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* stepper */}
                      <div className="flex items-center rounded-md border">
                        <button type="button" className="px-2 py-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(i.product_variant_id, i.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <input type="number" min={1} max={i.max} value={i.quantity}
                          onChange={(e) => setQuantity(i.product_variant_id, Number(e.target.value))}
                          className="w-12 border-x bg-transparent py-1 text-center text-sm outline-none" />
                        <button type="button" className="px-2 py-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(i.product_variant_id, i.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {/* precio editable */}
                      <div className="relative flex items-center">
                        <span className="absolute left-2 text-xs text-muted-foreground">$</span>
                        <Input type="number" step="0.01" value={i.unit_price}
                          onChange={(e) => setPrice(i.product_variant_id, Number(e.target.value))}
                          className="h-8 w-24 pl-5 text-sm" />
                      </div>
                      <span className="ml-auto text-sm font-medium">{money(i.unit_price * i.quantity)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {wholesaleApplies && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">Mayoreo</Badge>
                      )}
                      {i.price_edited && (
                        <button type="button" onClick={() => resetPrice(i.product_variant_id)}
                          className="text-xs text-muted-foreground underline">
                          Restaurar precio sugerido
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Busca y agrega productos para iniciar la venta.
            </p>
          )}

          <div className="flex items-center justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          <Button className="w-full" disabled={isSubmitting || cart.length === 0} onClick={complete}>
            {isSubmitting ? "Procesando..." : "Completar Venta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SalesIndex() {
  const [tab, setTab] = useState("list");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">Registra y consulta tus ventas</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list">Lista de ventas</TabsTrigger>
          <TabsTrigger value="new">Nueva venta</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <SalesListTab />
        </TabsContent>
        <TabsContent value="new" className="mt-4">
          <NewSale onComplete={() => setTab("list")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
