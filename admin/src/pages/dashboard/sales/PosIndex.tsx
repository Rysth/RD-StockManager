import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  ImageIcon,
  Banknote,
  ArrowLeftRight,
  Truck,
  UserPlus,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useBusinessStore } from "../../../stores/businessStore";
import type { PaymentMethod } from "../../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(n);

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function Thumb({ url, size = "h-9 w-9" }: { url?: string; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} rounded-md border object-cover`} />
  ) : (
    <div
      className={`${size} flex items-center justify-center rounded-md border bg-muted text-muted-foreground`}
    >
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

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

interface VariantOption {
  id: number;
  label: string;
  sku: string;
  thumb?: string;
  stock: number;
  base_price: number;
  wholesale_price: number | null;
  wholesale_min_quantity: number;
}

function suggestedPrice(
  item: Pick<CartItem, "base_price" | "wholesale_price" | "wholesale_min_quantity" | "quantity">
) {
  if (
    item.wholesale_price &&
    item.wholesale_price > 0 &&
    item.quantity >= item.wholesale_min_quantity
  ) {
    return item.wholesale_price;
  }
  return item.base_price;
}

export default function PosIndex() {
  const { products, categories, fetchProducts, fetchCategories } = useInventoryStore();
  const { customers, fetchCustomers, createCustomer } = useCustomerStore();
  const { createSale, isSubmitting } = useSaleStore();
  const { publicBusiness, fetchPublicBusiness } = useBusinessStore();

  // Cart state
  const [customerId, setCustomerId] = useState<string>("");
  const [variantQuery, setVariantQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashOnDelivery, setCashOnDelivery] = useState(false);

  // Dialog state
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number;
    name: string;
    brand?: string | null;
    base_price: number;
    wholesale_price: number | null;
    wholesale_min_quantity: number;
    thumb?: string;
    variants: {
      id: number;
      size?: string | null;
      color?: string | null;
      stock: number;
      sku: string;
      thumb?: string;
    }[];
  } | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Quick customer creation
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: "", phone: "", city: "" });
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    fetchProducts(1, 200, {});
    fetchCustomers(1, 200, "");
    fetchCategories();
    fetchPublicBusiness().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Product grid data ────────────────────────────────────────
  const productGroups = useMemo(() => {
    const q = variantQuery.trim().toLowerCase();
    return products
      .filter((p) => {
        if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
        if (!p.variants.some((v) => v.stock > 0)) return false;
        if (!q) return true;
        const productMatch = `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(q);
        const variantMatch = p.variants.some((v) =>
          `${v.sku} ${v.size ?? ""} ${v.color ?? ""}`.toLowerCase().includes(q)
        );
        return productMatch || variantMatch;
      })
      .map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        base_price: p.base_price,
        wholesale_price: p.wholesale_price ?? null,
        wholesale_min_quantity: p.wholesale_min_quantity ?? 3,
        thumb: p.images?.[0]?.url,
        variantCount: p.variants.filter((v) => v.stock > 0).length,
        variants: p.variants
          .filter((v) => v.stock > 0)
          .map((v) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            stock: v.stock,
            sku: v.sku,
            thumb: v.images?.[0]?.url || p.images?.[0]?.url,
          })),
      }));
  }, [products, variantQuery, categoryFilter]);

  // ── Cart operations ──────────────────────────────────────────
  function withQuantity(item: CartItem, quantity: number): CartItem {
    const q = Math.max(1, Math.min(quantity, item.max));
    const next = { ...item, quantity: q };
    if (!item.price_edited) next.unit_price = suggestedPrice(next);
    return next;
  }

  const addToCart = (v: VariantOption) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_variant_id === v.id);
      if (existing) {
        if (existing.quantity >= existing.max) {
          toast.error("No hay más stock disponible");
          return prev;
        }
        return prev.map((i) =>
          i.product_variant_id === v.id ? withQuantity(i, i.quantity + 1) : i
        );
      }
      const base: CartItem = {
        product_variant_id: v.id,
        label: v.label,
        sku: v.sku,
        thumb: v.thumb,
        base_price: v.base_price,
        wholesale_price: v.wholesale_price,
        wholesale_min_quantity: v.wholesale_min_quantity,
        quantity: 1,
        max: v.stock,
        unit_price: v.base_price,
        price_edited: false,
      };
      return [...prev, withQuantity(base, 1)];
    });
  };

  const setQuantity = (id: number, qty: number) =>
    setCart((prev) =>
      prev.map((i) => (i.product_variant_id === id ? withQuantity(i, qty) : i))
    );

  const removeItem = (id: number) =>
    setCart((prev) => prev.filter((i) => i.product_variant_id !== id));

  const total = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const selectedCustomer = customers.find((c) => String(c.id) === customerId);

  // ── Quick customer create ────────────────────────────────────
  const saveQuickCustomer = async () => {
    if (!quickForm.name.trim()) return toast.error("El nombre es requerido");
    setQuickSaving(true);
    try {
      const created = await createCustomer(quickForm);
      setCustomerId(String(created.id));
      await fetchCustomers(1, 200, "");
      toast.success(`Cliente ${created.name} creado y seleccionado`);
      setQuickOpen(false);
      setQuickForm({ name: "", phone: "", city: "" });
    } catch (e) {
      toast.error(errorMessage(e, "Error al crear el cliente"));
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Print ticket ─────────────────────────────────────────────
  const printTicket = () => {
    const bizName = publicBusiness?.name || "EDLU Store";
    const bizSlogan = publicBusiness?.slogan || "";
    const now = new Date();
    const dateStr = now.toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const customerName = selectedCustomer?.name || "Consumidor final";

    const rows = cart
      .map(
        (i) => `
      <tr>
        <td>${escapeHtml(i.label)}</td>
        <td style="text-align:center">${i.quantity}</td>
        <td style="text-align:right">${money(i.unit_price)}</td>
        <td style="text-align:right">${money(i.unit_price * i.quantity)}</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;font-size:11px;width:80mm;padding:3mm}
  h1{font-size:16px;text-align:center;letter-spacing:3px;font-weight:bold}
  .sub{font-size:9px;text-align:center;color:#555;margin-bottom:5px}
  hr.dash{border:none;border-top:1px dashed #000;margin:4px 0}
  hr.solid{border:none;border-top:1px solid #000;margin:4px 0}
  .row{display:flex;justify-content:space-between;margin:2px 0}
  .label{color:#555}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;border-bottom:1px solid #000;padding-bottom:3px;text-align:left}
  th:nth-child(n+2),td:nth-child(n+2){text-align:center}
  th:nth-child(3),td:nth-child(3),th:nth-child(4),td:nth-child(4){text-align:right}
  td{padding:2px 0;vertical-align:top}
  .total{display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin-top:3px}
  .cod{text-align:center;font-weight:bold;color:#b45309;margin:4px 0}
  .footer{text-align:center;margin-top:8px;font-size:10px}
  @media print{body{width:80mm}@page{size:80mm auto;margin:0}}
</style></head>
<body>
  <h1>${escapeHtml(bizName.toUpperCase())}</h1>
  ${bizSlogan ? `<p class="sub">${escapeHtml(bizSlogan)}</p>` : ""}
  <hr class="solid">
  <div class="row"><span class="label">Fecha</span><span>${dateStr} ${timeStr}</span></div>
  <div class="row"><span class="label">Cliente</span><span>${escapeHtml(customerName)}</span></div>
  <hr class="dash">
  <table>
    <thead><tr><th>Producto</th><th>Cant</th><th>P.Unit</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr class="dash">
  <div class="total"><span>TOTAL</span><span>${money(total)}</span></div>
  <hr class="dash">
  <div class="row">
    <span class="label">Método de pago</span>
    <span>${paymentMethod === "cash" ? "Efectivo" : "Transferencia"}</span>
  </div>
  ${cashOnDelivery ? '<p class="cod">PAGO CONTRA ENTREGA</p>' : ""}
  <hr class="solid">
  <p class="footer">¡Gracias por su compra!</p>
</body></html>`;

    const win = window.open("", "_blank", "width=360,height=640,toolbar=0,menubar=0,location=0");
    if (!win) {
      toast.error("Permite ventanas emergentes para imprimir");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  // ── Submit sale ──────────────────────────────────────────────
  const submitSale = async () => {
    try {
      await createSale({
        customer_id: customerId ? Number(customerId) : null,
        status: cashOnDelivery ? "pending" : "completed",
        payment_method: paymentMethod,
        cash_on_delivery: cashOnDelivery,
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success(
        cashOnDelivery
          ? "Pedido registrado — pendiente de entrega y pago"
          : "Venta completada correctamente"
      );
      setConfirmOpen(false);
      setCart([]);
      setCustomerId("");
      setVariantQuery("");
      setPaymentMethod("cash");
      setCashOnDelivery(false);
    } catch (e) {
      toast.error(errorMessage(e, "Error al registrar la venta"));
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-sm text-muted-foreground">Registra una venta nueva</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── Catálogo ── */}
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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {productGroups.length ? (
              productGroups.map((p) => {
                const inCartCount = cart
                  .filter((c) => p.variants.some((v) => v.id === c.product_variant_id))
                  .reduce((s, c) => s + c.quantity, 0);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProduct(p)}
                    className="group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary hover:shadow-md"
                  >
                    <div className="relative aspect-square w-full bg-muted">
                      {p.thumb ? (
                        <img src={p.thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      <Badge
                        variant="secondary"
                        className="absolute left-1.5 top-1.5 bg-background/85 text-foreground backdrop-blur-sm text-[10px]"
                      >
                        {p.variantCount} {p.variantCount === 1 ? "talla" : "tallas"}
                      </Badge>
                      {inCartCount > 0 && (
                        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                          {inCartCount}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                      <p className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</p>
                      {p.brand && (
                        <p className="truncate text-[11px] text-muted-foreground">{p.brand}</p>
                      )}
                      <p className="mt-auto pt-1 font-semibold text-primary">
                        {money(p.base_price)}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="col-span-full px-3 py-12 text-center text-sm text-muted-foreground">
                Sin resultados con stock disponible.
              </p>
            )}
          </div>
        </div>

        {/* ── Carrito ── */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="sticky top-4 rounded-xl">
            <CardContent className="flex max-h-[calc(100vh-7rem)] flex-col gap-4 p-4">
              <div className="flex items-center gap-2 font-semibold">
                <ShoppingCart className="h-5 w-5" /> Carrito
                <Badge variant="secondary" className="ml-auto">{itemCount}</Badge>
              </div>

              {/* Cliente + botón crear */}
              <div className="flex gap-2">
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Consumidor final</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.city ? ` (${c.city})` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  title="Nuevo cliente"
                  onClick={() => setQuickOpen(true)}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Líneas del carrito */}
              <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
                {cart.length ? (
                  cart.map((i) => {
                    const wholesaleApplies =
                      !!i.wholesale_price &&
                      i.wholesale_price > 0 &&
                      i.quantity >= i.wholesale_min_quantity;
                    return (
                      <div
                        key={i.product_variant_id}
                        className="flex items-center gap-2 rounded-lg border p-2"
                      >
                        <Thumb url={i.thumb} size="h-10 w-10" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{i.label}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">
                              {money(i.unit_price)} c/u
                            </span>
                            {wholesaleApplies && (
                              <Badge
                                variant="secondary"
                                className="bg-blue-100 px-1 py-0 text-[10px] text-blue-800"
                              >
                                Mayoreo
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center rounded-md border">
                          <button
                            type="button"
                            className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setQuantity(i.product_variant_id, i.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-sm">{i.quantity}</span>
                          <button
                            type="button"
                            className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setQuantity(i.product_variant_id, i.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="w-16 text-right text-sm font-medium">
                          {money(i.unit_price * i.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(i.product_variant_id)}
                        >
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
                <Button
                  className="h-11 w-full text-base"
                  disabled={cart.length === 0}
                  onClick={() => setConfirmOpen(true)}
                >
                  {cashOnDelivery ? "Registrar pedido (contra entrega)" : "Completar Venta"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Selector de variante ── */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.brand && `${selectedProduct.brand} · `}
              Desde {money(selectedProduct?.base_price ?? 0)}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct?.thumb && (
            <img
              src={selectedProduct.thumb}
              alt={selectedProduct.name}
              className="h-36 w-full rounded-lg object-cover"
            />
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {selectedProduct?.variants.map((v) => {
              const sizeLabel = [v.size, v.color].filter(Boolean).join(" / ") || v.sku;
              const inCart = cart.find((c) => c.product_variant_id === v.id);
              return (
                <div
                  key={v.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                    inCart ? "border-primary/40 bg-primary/5" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{sizeLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.stock} en stock · <span className="font-mono">{v.sku}</span>
                    </p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-0.5 rounded-md border bg-background">
                      <button
                        type="button"
                        className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => setQuantity(v.id, inCart.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">
                        {inCart.quantity}
                      </span>
                      <button
                        type="button"
                        className="px-2 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                        onClick={() => setQuantity(v.id, inCart.quantity + 1)}
                        disabled={inCart.quantity >= inCart.max}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        addToCart({
                          id: v.id,
                          label: `${selectedProduct.name} — ${sizeLabel}`,
                          sku: v.sku,
                          thumb: v.thumb,
                          stock: v.stock,
                          base_price: selectedProduct.base_price,
                          wholesale_price: selectedProduct.wholesale_price,
                          wholesale_min_quantity: selectedProduct.wholesale_min_quantity,
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setSelectedProduct(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Nuevo cliente rápido ── */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Registra los datos básicos. Podrás completarlos después desde Clientes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="qc-name">Nombre *</Label>
              <Input
                id="qc-name"
                placeholder="Ej. María González"
                value={quickForm.name}
                onChange={(e) => setQuickForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-phone">Teléfono</Label>
              <Input
                id="qc-phone"
                placeholder="09XXXXXXXX"
                value={quickForm.phone}
                onChange={(e) => setQuickForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-city">Ciudad</Label>
              <Input
                id="qc-city"
                placeholder="Guayaquil"
                value={quickForm.city}
                onChange={(e) => setQuickForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveQuickCustomer} disabled={quickSaving}>
              {quickSaving ? "Guardando..." : "Guardar y seleccionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmación + ticket ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar venta</DialogTitle>
            <DialogDescription>Revisa el resumen antes de registrar.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{selectedCustomer?.name || "Consumidor final"}</span>
            </div>

            <Separator />

            <div className="space-y-2">
              {cart.map((i) => (
                <div
                  key={i.product_variant_id}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.label}</p>
                    <p className="text-xs text-muted-foreground">{i.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p>
                      {i.quantity} × {money(i.unit_price)}
                    </p>
                    <p className="font-medium">{money(i.unit_price * i.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>

            <Separator />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de pago</span>
                <span className="font-medium">
                  {paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                </span>
              </div>
              {cashOnDelivery && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modalidad</span>
                  <span className="font-medium text-amber-600">Pago contra entrega</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado al registrar</span>
                <span
                  className={`font-medium ${
                    cashOnDelivery ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {cashOnDelivery ? "Pendiente" : "Completada"}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="gap-2"
              onClick={printTicket}
              disabled={cart.length === 0}
            >
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Volver a editar
              </Button>
              <Button onClick={submitSale} disabled={isSubmitting}>
                {isSubmitting ? "Procesando..." : "Confirmar y registrar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
