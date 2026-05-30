import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  Eye,
  ImageIcon,
  Banknote,
  ArrowLeftRight,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
import type { SaleStatus, PaymentMethod } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const STATUS_META: Record<SaleStatus, { label: string; className: string }> = {
  completed: { label: "Completada", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  pending: { label: "Pendiente", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
  cancelled: { label: "Cancelada", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

function SaleListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-44 rounded-md" />
      <Card className="rounded-xl p-0">
        <CardContent className="p-0">
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-8 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <div className="ml-auto flex gap-1">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const [firstLoad, setFirstLoad] = useState(true);
  const [status, setStatus] = useState<SaleStatus | "">("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);

  useEffect(() => {
    fetchSales(1, pagination.per_page, { status })
      .catch((e) => toast.error(e.message || "Error al cargar ventas"))
      .finally(() => setFirstLoad(false));
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

  if (isLoading && firstLoad) return <SaleListSkeleton />;

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
                <div><p className="text-muted-foreground">Método de pago</p>
                  <p className="font-medium">
                    {PAYMENT_LABEL[selectedSale.payment_method ?? "cash"] || "—"}
                    {selectedSale.cash_on_delivery ? " · Contra entrega" : ""}
                  </p>
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
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const { createSale, isSubmitting } = useSaleStore();

  const [customerId, setCustomerId] = useState<string>("");
  const [variantQuery, setVariantQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashOnDelivery, setCashOnDelivery] = useState(false);

  useEffect(() => {
    fetchProducts(1, 100, {});
    fetchCustomers(1, 100, "");
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const variantResults = useMemo(() => {
    const q = variantQuery.trim().toLowerCase();
    const rows: {
      id: number; label: string; sku: string; thumb?: string; stock: number;
      base_price: number; wholesale_price: number | null; wholesale_min_quantity: number;
    }[] = [];
    products.forEach((p) => {
      if (categoryFilter !== "all" && p.category_id !== categoryFilter) return;
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
    return rows.slice(0, 60);
  }, [products, variantQuery, categoryFilter]);

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

  const removeItem = (id: number) => setCart((prev) => prev.filter((i) => i.product_variant_id !== id));

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const complete = async () => {
    if (cart.length === 0) return toast.error("Agrega al menos un producto");
    try {
      await createSale({
        customer_id: customerId ? Number(customerId) : null,
        status: "completed",
        payment_method: paymentMethod,
        cash_on_delivery: cashOnDelivery,
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success("Venta completada correctamente");
      setCart([]); setCustomerId(""); setVariantQuery("");
      setPaymentMethod("cash"); setCashOnDelivery(false);
      onComplete();
    } catch (e) {
      toast.error(errorMessage(e, "Error al completar la venta"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* ── Catálogo de productos (grilla tipo POS) ── */}
      <div className="space-y-4 lg:col-span-7 xl:col-span-8">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, marca o SKU..."
            value={variantQuery}
            onChange={(e) => setVariantQuery(e.target.value)}
          />
        </div>

        {/* Filtro por categoría (chips) */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                categoryFilter === c.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Grilla de variantes con stock */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {variantResults.length ? (
            variantResults.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => addToCart(v)}
                className="group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md"
              >
                <div className="relative aspect-square w-full bg-muted">
                  {v.thumb ? (
                    <img src={v.thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                  <Badge
                    variant="secondary"
                    className="absolute right-1.5 top-1.5 bg-green-100 text-green-800"
                  >
                    {v.stock}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5">
                  <p className="line-clamp-2 text-sm font-medium leading-tight">{v.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{v.sku}</p>
                  <p className="mt-auto pt-1 font-semibold text-primary">{money(v.base_price)}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="col-span-full px-3 py-12 text-center text-sm text-muted-foreground">
              Sin resultados con stock disponible.
            </p>
          )}
        </div>
      </div>

      {/* ── Panel de checkout (sticky) ── */}
      <div className="lg:col-span-5 xl:col-span-4">
        <Card className="sticky top-4 rounded-xl">
          <CardContent className="flex max-h-[calc(100vh-7rem)] flex-col gap-4 p-4">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-5 w-5" /> Carrito
              <Badge variant="secondary" className="ml-auto">{itemCount}</Badge>
            </div>

            {/* Cliente */}
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Consumidor final</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.city ? ` (${c.city})` : ""}
                </option>
              ))}
            </select>

            {/* Líneas del carrito */}
            <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
              {cart.length ? (
                cart.map((i) => {
                  const wholesaleApplies =
                    !!i.wholesale_price && i.wholesale_price > 0 && i.quantity >= i.wholesale_min_quantity;
                  return (
                    <div key={i.product_variant_id} className="flex items-center gap-2 rounded-lg border p-2">
                      <Thumb url={i.thumb} size="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{i.label}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">{money(i.unit_price)} c/u</span>
                          {wholesaleApplies && (
                            <Badge variant="secondary" className="bg-blue-100 px-1 py-0 text-[10px] text-blue-800">
                              Mayoreo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center rounded-md border">
                        <button type="button" className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(i.product_variant_id, i.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-sm">{i.quantity}</span>
                        <button type="button" className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(i.product_variant_id, i.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="w-16 text-right text-sm font-medium">
                        {money(i.unit_price * i.quantity)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(i.product_variant_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Toca un producto para agregarlo a la venta.
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${
                    paymentMethod === "cash"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Banknote className="h-4 w-4" /> Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${
                    paymentMethod === "transfer"
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <ArrowLeftRight className="h-4 w-4" /> Transferencia
                </button>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
                <Checkbox
                  checked={cashOnDelivery}
                  onCheckedChange={(c) => setCashOnDelivery(c === true)}
                />
                <Truck className="h-4 w-4 text-muted-foreground" />
                Pago contra entrega
              </label>
            </div>

            {/* Total + acción */}
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
              <Button className="h-11 w-full text-base" disabled={isSubmitting || cart.length === 0} onClick={complete}>
                {isSubmitting ? "Procesando..." : "Completar Venta"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
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
