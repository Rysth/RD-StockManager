import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle,
  ArrowRightLeft,
  Send,
  Package,
  Boxes,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTransferStore } from "../../../stores/transferStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useAuthStore } from "../../../stores/authStore";
import {
  usePosCart,
  stockAt,
  stockTone,
  findVariantBySku,
  variantCartKey,
} from "../../../hooks/usePosCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ProductCard from "../sales/ProductCard";
import {
  isServiceProduct,
  Thumb,
  parseVariantLabel,
  type CatalogItem,
} from "../shared/pos-helpers";

export default function TransferPosIndex() {
  const { products, categories, fetchProducts, fetchCategories } =
    useInventoryStore();
  const { locations, fetchLocations } = useLocationStore();
  const { createTransfer, isSubmitting } = useTransferStore();
  const { user } = useAuthStore();
  const restrictedToBranch =
    !!user?.restricted_to_location && !!user?.location_id;

  const {
    cart,
    addToCart,
    setQuantity,
    removeItem,
    clearCart,
    itemCount,
  } = usePosCart("transfer");

  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [variantQuery, setVariantQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [notes, setNotes] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  useEffect(() => {
    fetchCategories();
    fetchLocations().catch(() => {});
    fetchProducts(1, 200, { product_type: "good" });
  }, [fetchCategories, fetchLocations, fetchProducts]);

  useEffect(() => {
    if (restrictedToBranch && user?.location_id) {
      setFromLocationId(String(user.location_id));
      return;
    }
    if (!fromLocationId && locations.length) {
      const fallback = locations.find((l) => l.is_default) ?? locations[0];
      setFromLocationId(String(fallback.id));
    }
  }, [locations, restrictedToBranch, user, fromLocationId]);

  useEffect(() => {
    if (fromLocationId && toLocationId === fromLocationId) {
      const other = locations.find((l) => String(l.id) !== fromLocationId);
      setToLocationId(other ? String(other.id) : "");
    }
  }, [fromLocationId, toLocationId, locations]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      cart.length > 0 && currentLocation.pathname !== nextLocation.pathname,
  );

  const handleFromLocationChange = (value: string) => {
    setFromLocationId(value);
    if (cart.length) {
      clearCart();
      toast("Carrito vaciado: cambiaste de origen", { icon: "🏬" });
    }
  };

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length) setConfirmOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length]);

  const quickAddFromQuery = () => {
    const q = variantQuery.trim();
    if (!q) return;

    const match = findVariantBySku(products, q);
    if (match) {
      const { product, variant } = match;
      if (isServiceProduct(product)) return;
      const variantLabel = [variant.size, variant.color]
        .filter(Boolean)
        .join(" / ");
      addToCart({
        cart_key: variantCartKey(variant.id),
        id: variant.id,
        is_service: false,
        label: variantLabel
          ? `${product.name} — ${variantLabel}`
          : product.name,
        sku: variant.sku,
        thumb: variant.images?.[0]?.url || product.images?.[0]?.url,
        stock: stockAt(variant, fromLocationId),
        base_price: product.base_price,
        wholesale_price: product.wholesale_price ?? null,
        wholesale_min_quantity: product.wholesale_min_quantity ?? 3,
        cost: product.cost,
      });
      setVariantQuery("");
      focusSearch();
      return;
    }

    if (productGroups.length === 1) {
      const only = productGroups[0];
      if (only.variants.length === 1) {
        const v = only.variants[0];
        addToCart({
          cart_key: v.cart_key,
          id: v.id,
          is_service: false,
          label: `${only.name} — ${[v.size, v.color].filter(Boolean).join(" / ") || "Producto base"}`,
          sku: v.sku,
          thumb: v.thumb,
          stock: v.stock,
          base_price: only.base_price,
          wholesale_price: only.wholesale_price,
          wholesale_min_quantity: only.wholesale_min_quantity,
          cost: only.cost,
        });
        setVariantQuery("");
        focusSearch();
      } else {
        setSelectedProduct(only);
      }
    }
  };

  const activeCategoryIds = useMemo(() => {
    const ids = new Set<number>();
    products.forEach((p) => {
      if (!isServiceProduct(p) && p.category_id) ids.add(p.category_id);
    });
    return ids;
  }, [products]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => activeCategoryIds.has(c.id)),
    [categories, activeCategoryIds],
  );

  const productGroups = useMemo<CatalogItem[]>(() => {
    const q = variantQuery.trim().toLowerCase();
    return products
      .filter((p) => {
        if (isServiceProduct(p)) return false;
        if (categoryFilter !== "all" && p.category_id !== categoryFilter)
          return false;
        if (!q) return true;
        return (
          `${p.name} ${p.brand ?? ""}`.toLowerCase().includes(q) ||
          p.variants.some((v) =>
            `${v.sku} ${v.size ?? ""} ${v.color ?? ""}`
              .toLowerCase()
              .includes(q),
          )
        );
      })
      .map<CatalogItem>((p) => ({
        item_type: "product",
        id: p.id,
        name: p.name,
        product_type: p.product_type,
        brand: p.brand,
        base_price: p.base_price,
        wholesale_price: p.wholesale_price ?? null,
        wholesale_min_quantity: p.wholesale_min_quantity ?? 3,
        cost: p.cost,
        thumb:
          p.images?.[0]?.url ||
          p.variants.find((v) => v.images?.[0]?.url)?.images?.[0]?.url,
        variantCount: p.variants.length,
        variants: p.variants.map((v) => ({
          cart_key: variantCartKey(v.id),
          id: v.id,
          is_service: false,
          size: v.size,
          color: v.color,
          stock: stockAt(v, fromLocationId),
          sku: v.sku,
          thumb: v.images?.[0]?.url || p.images?.[0]?.url,
        })),
      }));
  }, [products, variantQuery, categoryFilter, fromLocationId]);

  const resetAfterSubmit = () => {
    setConfirmOpen(false);
    clearCart();
    setVariantQuery("");
    setNotes("");
  };

  const clearAll = () => {
    clearCart();
    setVariantQuery("");
    setNotes("");
    setClearConfirmOpen(false);
    toast.success("Transferencia reiniciada");
    focusSearch();
  };

  const openConfirm = () => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (!fromLocationId) {
      toast.error("Selecciona un origen");
      return;
    }
    if (!toLocationId) {
      toast.error("Selecciona un destino");
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error("El origen y destino deben ser diferentes");
      return;
    }
    setConfirmOpen(true);
  };

  const submitTransfer = async () => {
    try {
      await createTransfer({
        from_location_id: Number(fromLocationId),
        to_location_id: Number(toLocationId),
        notes: notes || null,
        items: cart.flatMap((i) =>
          i.product_variant_id === null
            ? []
            : [
                {
                  product_variant_id: i.product_variant_id,
                  quantity: i.quantity,
                },
              ],
        ),
      });
      toast.success("Transferencia creada correctamente");
      resetAfterSubmit();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al crear la transferencia",
      );
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      {/* ── Catálogo (izquierda) ── */}
      <div className="flex flex-1 flex-col overflow-hidden border-r">
        {/* Búsqueda + origen */}
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              className="pl-9"
              placeholder="Buscar o escanear SKU…  (Enter agrega)"
              value={variantQuery}
              onChange={(e) => setVariantQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  quickAddFromQuery();
                }
              }}
            />
          </div>
          <p className="hidden shrink-0 text-[11px] text-muted-foreground lg:block">
            <kbd className="rounded border px-1">F2</kbd> buscar ·{" "}
            <kbd className="rounded border px-1">F4</kbd> crear
          </p>
          {!restrictedToBranch && locations.length > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Origen
              </Label>
              <select
                value={fromLocationId}
                onChange={(e) => handleFromLocationChange(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {restrictedToBranch && (
            <Badge variant="secondary" className="shrink-0 gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {user?.location_name || "Sucursal"}
            </Badge>
          )}
        </div>

        {/* Categorías */}
        <div className="flex shrink-0 gap-2 overflow-x-auto border-b bg-background px-4 py-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${categoryFilter === "all" ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            Todas
          </button>
          {filteredCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryFilter(c.id)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${categoryFilter === c.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        <div className="flex-1 overflow-y-auto p-4">
          {productGroups.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {productGroups.map((p) => {
                const inCartCount = cart
                  .filter((c) =>
                    p.variants.some((v) => v.cart_key === c.cart_key),
                  )
                  .reduce((s, c) => s + c.quantity, 0);
                const hasNamedVariants = p.variants.some(
                  (v) => !!v.size || !!v.color,
                );
                return (
                  <ProductCard
                    key={p.id}
                    name={p.name}
                    brand={p.brand}
                    thumb={p.thumb}
                    badge={
                      p.variantCount === 1 && !hasNamedVariants
                        ? "Prod. base"
                        : `${p.variantCount} ${p.variantCount === 1 ? "talla" : "tallas"}`
                    }
                    price={`${p.variantCount} ${p.variantCount === 1 ? "opción" : "opciones"}`}
                    priceSuffix=""
                    inCartCount={inCartCount}
                    onClick={() => {
                      if (p.variants.length === 1 && !hasNamedVariants) {
                        const v = p.variants[0];
                        addToCart({
                          cart_key: v.cart_key,
                          id: v.id,
                          is_service: false,
                          label: p.name,
                          sku: v.sku,
                          thumb: v.thumb,
                          stock: v.stock,
                          base_price: p.base_price,
                          wholesale_price: p.wholesale_price,
                          wholesale_min_quantity: p.wholesale_min_quantity,
                          cost: p.cost,
                        });
                        return;
                      }
                      setSelectedProduct(p);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-muted-foreground">
              Sin resultados.
            </p>
          )}
        </div>
      </div>

      {/* ── Panel de transferencia (derecha) ── */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden bg-background xl:w-[420px] 2xl:w-[480px]">
        {/* Destino + notas */}
        <div className="shrink-0 border-b px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            DESTINO
          </p>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Seleccionar destino…</option>
              {locations
                .filter((l) => String(l.id) !== fromLocationId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas sobre la transferencia…"
            className="min-h-[60px] text-sm"
          />
        </div>

        {/* Tabla de ítems */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              PRODUCTOS
            </p>
            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(true)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Vaciar
                </button>
              )}
              <Badge variant="secondary">{itemCount} ítems</Badge>
            </div>
          </div>
          {cart.length ? (
            <div className="space-y-2">
              {cart.map((i) => {
                  const atMax = i.quantity >= i.max;
                  return (
                <div
                  key={i.cart_key}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
                >
                  <Thumb url={i.thumb} size="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight">
                      {parseVariantLabel(i.label).name}
                    </p>
                    {parseVariantLabel(i.label).variant && (
                      <p className="text-[11px] font-medium text-primary">
                        {parseVariantLabel(i.label).variant}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      {i.sku}
                    </p>
                    <span className={`inline-block px-1 py-0.5 rounded text-[10px] font-medium ${i.is_service ? "" : stockTone(i.max)}`}>
                      {i.is_service ? "∞ disp." : `${i.max} disponibles`}
                    </span>
                  </div>
                  <div className="flex items-center rounded-lg border bg-background">
                    <button
                      type="button"
                      className="px-2 py-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
                      onClick={() => setQuantity(i.cart_key, i.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <Input
                      type="number"
                      min={1}
                      max={i.max}
                      value={i.quantity}
                      onChange={(e) =>
                        setQuantity(i.cart_key, Number(e.target.value) || 1)
                      }
                      className="h-7 w-12 rounded-none border-x px-1 text-center text-sm font-semibold focus-visible:ring-0"
                    />
                    <button
                      type="button"
                      className={`px-2 py-1.5 transition-transform active:scale-90 ${atMax ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground hover:text-foreground"}`}
                      onClick={() => !atMax && setQuantity(i.cart_key, i.quantity + 1)}
                      disabled={atMax}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(i.cart_key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                  );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Boxes className="h-8 w-8 text-muted-foreground/50" />
              <p>Selecciona productos del catálogo para agregar.</p>
            </div>
          )}
        </div>

        {/* Totales + CTAs */}
        <div className="shrink-0 border-t bg-background px-4 py-3 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              Total ítems
            </span>
            <span className="text-2xl font-bold tabular-nums">{itemCount}</span>
          </div>

          <Button
            className="w-full gap-1.5"
            disabled={cart.length === 0 || !toLocationId}
            onClick={openConfirm}
          >
            <Send className="h-4 w-4" /> Crear transferencia
          </Button>
        </div>
      </div>

      {/* ── Selector de variante (right-side drawer) ── */}
      <Sheet
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            focusSearch();
          }
        }}
      >
        <SheetContent side="right" className="w-full px-0 pb-0 pt-3 sm:max-w-xs">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {selectedProduct && (
                    <Thumb url={selectedProduct.thumb} size="h-9 w-9" />
                  )}
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-left text-sm font-bold">
                      {selectedProduct?.name}
                    </SheetTitle>
                    <SheetDescription className="text-left text-[11px]">
                      {selectedProduct?.brand && `${selectedProduct.brand} · `}
                      {selectedProduct?.variants.length ?? 0} opciones
                    </SheetDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => {
                    setSelectedProduct(null);
                    focusSearch();
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                {selectedProduct?.variants.map((v) => {
                  const sizeLabel =
                    [v.size, v.color].filter(Boolean).join(" / ") ||
                    "Producto base";
                  const inCart = cart.find((c) => c.cart_key === v.cart_key);

                  const handleAdd = () => {
                    if (!selectedProduct) return;
                    if (v.stock <= 0) {
                      toast.error("Sin stock disponible en el origen");
                      return;
                    }
                    addToCart({
                      cart_key: v.cart_key,
                      id: v.id,
                      is_service: false,
                      label: `${selectedProduct.name} — ${sizeLabel}`,
                      sku: v.sku,
                      thumb: v.thumb,
                      stock: v.stock,
                      base_price: selectedProduct.base_price,
                      wholesale_price: selectedProduct.wholesale_price,
                      wholesale_min_quantity:
                        selectedProduct.wholesale_min_quantity,
                      cost: selectedProduct.cost,
                    });
                  };

                  const atMax = inCart ? inCart.quantity >= v.stock : false;

                  return (
                    <div
                      key={v.id}
                      className={`relative flex flex-col overflow-hidden rounded-lg border transition-all ${inCart ? "border-primary/60 bg-primary/5" : v.stock <= 0 ? "opacity-40" : ""} ${v.stock > 0 ? "cursor-pointer active:scale-[0.97] hover:border-primary/30" : ""}`}
                    >
                      {!inCart ? (
                        <button
                          type="button"
                          onClick={v.stock > 0 ? handleAdd : undefined}
                          disabled={v.stock <= 0}
                          className="flex flex-col items-center gap-1 p-1.5 text-center touch-manipulation"
                        >
                          <Thumb url={v.thumb} size="w-full aspect-square rounded-md" />
                          <p className="text-[11px] font-semibold leading-tight line-clamp-1">
                            {sizeLabel}
                          </p>
                          <span
                            className={`text-[9px] font-medium ${stockTone(v.stock)}`}
                          >
                            {v.stock <= 0 ? "Sin stock" : `${v.stock} disp.`}
                          </span>
                        </button>
                      ) : (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={atMax ? undefined : handleAdd}
                            disabled={atMax}
                            className="flex flex-col items-center gap-1 p-1.5 text-center touch-manipulation"
                          >
                            <div className="relative w-full aspect-square">
                              <Thumb url={v.thumb} size="w-full aspect-square rounded-md" />
                              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow">
                                {inCart.quantity}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold leading-tight line-clamp-1">
                              {sizeLabel}
                            </p>
                            <span
                              className={`text-[9px] font-medium ${stockTone(v.stock)}`}
                            >
                              {v.stock} disp.
                            </span>
                          </button>
                          <div className="flex items-center justify-around border-t bg-primary/5 px-1 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setQuantity(v.cart_key, inCart.quantity - 1)
                              }
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-[10px] font-bold tabular-nums">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                !atMax && setQuantity(v.cart_key, inCart.quantity + 1)
                              }
                              disabled={atMax}
                              className={`rounded p-0.5 transition-transform active:scale-90 ${atMax ? "text-muted-foreground/30" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Bloqueo de navegación con orden activa ── */}
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Salir de la transferencia?</DialogTitle>
            <DialogDescription>
              Tienes {itemCount} ítem{itemCount !== 1 ? "s" : ""} en la
              transferencia. Si sales ahora perderás el progreso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Volver a la transferencia
            </Button>
            <Button
              variant="destructive"
              onClick={() => blocker.proceed?.()}
            >
              Salir de todas formas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar vaciar transferencia ── */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Vaciar la transferencia?</DialogTitle>
            <DialogDescription>
              Se eliminarán los {itemCount} ítem{itemCount !== 1 ? "s" : ""} y
              se reiniciarán las notas. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={clearAll}>
              Sí, vaciar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar transferencia ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear transferencia</DialogTitle>
            <DialogDescription>
              Revisa el resumen antes de registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Origen</span>
                <span className="font-medium">
                  {
                    locations.find((l) => String(l.id) === fromLocationId)
                      ?.name
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destino</span>
                <span className="font-medium">
                  {
                    locations.find((l) => String(l.id) === toLocationId)
                      ?.name
                  }
                </span>
              </div>
              {notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notas</span>
                  <span className="font-medium">{notes}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              {cart.map((i) => (
                <div
                  key={i.cart_key}
                  className="flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.label}</p>
                    <p className="text-xs text-muted-foreground">{i.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{i.quantity} u.</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total ítems</span>
              <span>{itemCount}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Volver a editar
            </Button>
            <Button
              onClick={submitTransfer}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? "Procesando..." : "Confirmar transferencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


