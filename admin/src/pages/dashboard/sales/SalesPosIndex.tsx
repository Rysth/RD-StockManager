import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Banknote,
  ArrowLeftRight,
  Truck,
  UserPlus,
  Printer,
  User,
  CheckCircle,
  Boxes,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useProductBundleStore } from "../../../stores/productBundleStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useBusinessStore } from "../../../stores/businessStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useAuthStore } from "../../../stores/authStore";
import type { PaymentMethod } from "../../../types/inventory";
import { printTicket } from "../../../lib/ticket";
import {
  usePosCart,
  stockAt,
  stockTone,
  findVariantBySku,
  variantCartKey,
  serviceCartKey,
  bundleCartKey,
} from "../../../hooks/usePosCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
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
import ProductCard from "./ProductCard";
import {
  money,
  isServiceProduct,
  Thumb,
  parseVariantLabel,
  type CatalogItem,
} from "../shared/pos-helpers";

export default function SalesPosIndex() {
  const { products, categories, fetchProducts, fetchCategories } =
    useInventoryStore();
  const { bundles, fetchBundles } = useProductBundleStore();
  const { customers, fetchCustomers, createCustomer, updateCustomer } =
    useCustomerStore();
  const { createSale, isSubmitting } = useSaleStore();
  const { publicBusiness, fetchPublicBusiness } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { user } = useAuthStore();
  const restrictedToBranch =
    !!user?.restricted_to_location && !!user?.location_id;

  const {
    cart,
    addToCart,
    addBundleToCart,
    addServiceWithoutVariant,
    setQuantity,
    setUnitValue,
    resetUnitValue,
    toggleItemIva,
    removeItem,
    clearCart,
    itemsTotal,
    itemCount,
  } = usePosCart("sale");

  const [locationId, setLocationId] = useState("");
  const [variantQuery, setVariantQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");

  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashOnDelivery, setCashOnDelivery] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);

  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    city: "",
    id_number: "",
    email: "",
  });
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: "",
    phone: "",
    city: "",
    id_number: "",
    id_type: "cedula",
    email: "",
  });

  const ivaAmount = cart.reduce(
    (sum, i) =>
      sum + (i.applies_iva ? Math.round(i.unit_value * i.quantity * 0.15 * 100) / 100 : 0),
    0,
  );
  const total = itemsTotal + ivaAmount + shippingCost;
  const selectedCustomer = customers.find((c) => String(c.id) === customerId);
  const customerOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "", label: "Consumidor final", description: "Sin cliente asignado" },
      ...customers.map((c) => ({
        value: String(c.id),
        label: c.name,
        description: [c.id_number, c.phone, c.email].filter(Boolean).join(" · "),
        keywords: [c.id_number, c.phone, c.email, c.city].filter(Boolean).join(" "),
      })),
    ],
    [customers],
  );

  useEffect(() => {
    fetchCustomers(1, 200, "");
    fetchCategories();
    fetchLocations().catch(() => {});
    fetchPublicBusiness().catch(() => {});
    fetchProducts(1, 200, {});
  }, [
    fetchCustomers,
    fetchCategories,
    fetchLocations,
    fetchPublicBusiness,
    fetchProducts,
  ]);

  useEffect(() => {
    fetchBundles(locationId).catch(() => {});
  }, [fetchBundles, locationId]);

  useEffect(() => {
    if (restrictedToBranch && user?.location_id) {
      setLocationId(String(user.location_id));
      return;
    }
    if (!locationId && locations.length) {
      const fallback = locations.find((l) => l.is_default) ?? locations[0];
      setLocationId(String(fallback.id));
    }
  }, [locations, restrictedToBranch, user, locationId]);

  // Autofocus en la búsqueda al montar (flujo de cajero / escáner).
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Atajos: F2 enfoca búsqueda · F4 abre cobro.
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

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      cart.length > 0 && currentLocation.pathname !== nextLocation.pathname,
  );

  const handleLocationChange = (value: string) => {
    setLocationId(value);
    if (cart.length) {
      clearCart();
      toast("Carrito vaciado: cambiaste de ubicación", { icon: "🏬" });
    }
  };

  // Agrega por SKU exacto (escáner) o, si hay un único resultado, lo resuelve.
  const quickAddFromQuery = () => {
    const q = variantQuery.trim();
    if (!q) return;

    const match = findVariantBySku(products, q);
    if (match) {
      const { product, variant } = match;
      const service = isServiceProduct(product);
      const stock = stockAt(variant, locationId);
      if (!service && stock <= 0) {
        toast.error("Sin stock disponible");
        return;
      }
      const variantLabel = [variant.size, variant.color].filter(Boolean).join(" / ");
      addToCart({
        cart_key: variantCartKey(variant.id),
        id: variant.id,
        is_service: service,
        label: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
        sku: variant.sku,
        thumb: variant.images?.[0]?.url || product.images?.[0]?.url,
        stock,
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
      if (only.item_type === "bundle") {
        addBundleToCart({
          id: only.id,
          name: only.name,
          base_price: only.base_price,
          cost: only.cost,
          available_stock: only.available_stock ?? 0,
        });
      } else if (only.product_type === "service" && !only.variants.length) {
        addServiceWithoutVariant(only);
      } else if (only.variants.length === 1 && !only.variants.some((v) => !!v.size || !!v.color)) {
        const v = only.variants[0];
        addToCart({
          cart_key: v.cart_key,
          id: v.id,
          is_service: v.is_service,
          label: `${only.name} — ${[v.size, v.color].filter(Boolean).join(" / ") || "Producto base"}`,
          sku: v.sku,
          thumb: v.thumb,
          stock: v.stock,
          base_price: only.base_price,
          wholesale_price: only.wholesale_price,
          wholesale_min_quantity: only.wholesale_min_quantity,
          cost: only.cost,
        });
      } else {
        setSelectedProduct(only);
        return;
      }
      setVariantQuery("");
      focusSearch();
    }
  };

  const activeCategoryIds = useMemo(() => {
    const ids = new Set<number>();
    products.forEach((p) => {
      const relevant =
        isServiceProduct(p) ||
        p.variants.some((v) => stockAt(v, locationId) > 0);
      if (p.category_id && relevant) ids.add(p.category_id);
    });
    return ids;
  }, [products, locationId]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => activeCategoryIds.has(c.id)),
    [categories, activeCategoryIds],
  );

  const productGroups = useMemo<CatalogItem[]>(() => {
    const q = variantQuery.trim().toLowerCase();
    const productItems = products
      .filter((p) => {
        if (categoryFilter !== "all" && p.category_id !== categoryFilter)
          return false;
        if (
          !isServiceProduct(p) &&
          !p.variants.some((v) => stockAt(v, locationId) > 0)
        )
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
      .map<CatalogItem>((p) => {
        const variants = (
          isServiceProduct(p)
            ? p.variants
            : p.variants.filter((v) => stockAt(v, locationId) > 0)
        ).map((v) => ({
          cart_key: variantCartKey(v.id),
          id: v.id,
          is_service: isServiceProduct(p),
          size: v.size,
          color: v.color,
          stock: stockAt(v, locationId),
          sku: v.sku,
          thumb: v.images?.[0]?.url || p.images?.[0]?.url,
        }));
        return {
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
          variantCount: variants.length,
          variants,
        };
      });

    const bundleItems =
      categoryFilter === "all"
        ? bundles
            .filter(
              (b) =>
                b.available_stock > 0 &&
                (!q ||
                  `${b.name} ${b.description ?? ""}`.toLowerCase().includes(q)),
            )
            .map<CatalogItem>((b) => ({
              item_type: "bundle",
              id: b.id,
              name: b.name,
              product_type: "good",
              brand: "Combo",
              base_price: b.base_price,
              wholesale_price: null,
              wholesale_min_quantity: 1,
              cost: b.total_cost,
              variantCount: b.items_count,
              available_stock: b.available_stock,
              variants: [],
            }))
        : [];

    return [...productItems, ...bundleItems];
  }, [products, bundles, variantQuery, categoryFilter, locationId]);

  const saveQuickCustomer = async () => {
    if (!quickForm.name.trim()) return toast.error("El nombre es requerido");
    if (!quickForm.phone.trim()) return toast.error("El teléfono es requerido");
    if (!quickForm.email.trim())
      return toast.error("El correo electrónico es requerido");
    setQuickSaving(true);
    try {
      const created = await createCustomer({
        name: quickForm.name,
        phone: quickForm.phone,
        email: quickForm.email || undefined,
        city: quickForm.city,
        id_number: quickForm.id_number || undefined,
        id_type:
          (quickForm.id_type as "cedula" | "pasaporte" | "ruc") || "cedula",
      });
      setCustomerId(String(created.id));
      await fetchCustomers(1, 200, "");
      toast.success(`Cliente ${created.name} creado y seleccionado`);
      setQuickOpen(false);
      setQuickForm({
        name: "",
        phone: "",
        city: "",
        id_number: "",
        id_type: "cedula",
        email: "",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear el cliente");
    } finally {
      setQuickSaving(false);
    }
  };

  const openEditCustomer = () => {
    const c = selectedCustomer;
    if (!c) return;
    setEditForm({
      name: c.name || "",
      phone: c.phone || "",
      city: c.city || "",
      id_number: c.id_number || "",
      email: c.email || "",
    });
    setEditOpen(true);
  };

  const saveEditCustomer = async () => {
    if (!selectedCustomer) return;
    if (!editForm.name.trim()) return toast.error("El nombre es requerido");
    if (!editForm.phone.trim()) return toast.error("El teléfono es requerido");
    if (!editForm.email.trim())
      return toast.error("El correo electrónico es requerido");
    setEditSaving(true);
    try {
      await updateCustomer(selectedCustomer.id, {
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email || undefined,
        city: editForm.city,
        id_number: editForm.id_number || undefined,
      });
      await fetchCustomers(1, 200, "");
      toast.success("Cliente actualizado");
      setEditOpen(false);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al actualizar el cliente",
      );
    } finally {
      setEditSaving(false);
    }
  };

  const handlePrintTicket = () => {
    const ok = printTicket({
      businessName: publicBusiness?.name || "StockManager",
      businessSlogan: publicBusiness?.slogan || "",
      date: new Date(),
      customerName: selectedCustomer?.name || "Consumidor final",
      lines: cart.map((i) => ({
        label: i.label,
        quantity: i.quantity,
        unit_price: i.unit_value,
      })),
      shippingCost,
      total,
      paymentMethod,
      cashOnDelivery,
    });
    if (!ok) toast.error("Permite ventanas emergentes para imprimir");
  };

  const resetAfterSubmit = () => {
    setConfirmOpen(false);
    clearCart();
    setVariantQuery("");
    setCustomerId("");
    setPaymentMethod("cash");
    setCashOnDelivery(false);
    setShippingCost(0);
  };

  const submitSale = async () => {
    const isTransfer = paymentMethod === "transfer";
    const finalStatus = cashOnDelivery || isTransfer ? "pending" : "completed";
    try {
      await createSale({
        customer_id: customerId ? Number(customerId) : null,
        location_id: locationId ? Number(locationId) : null,
        status: finalStatus,
        payment_method: paymentMethod,
        cash_on_delivery: cashOnDelivery,
        shipping_cost: shippingCost,
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          product_bundle_id: i.product_bundle_id ?? null,
          description: i.product_variant_id ? undefined : i.label,
          quantity: i.quantity,
          unit_price: i.unit_value,
          applies_iva: i.applies_iva,
        })),
      });
      toast.success(
        isTransfer
          ? "Venta por transferencia registrada — pendiente de verificación"
          : cashOnDelivery
            ? "Pedido registrado — pendiente de entrega y pago"
            : "Venta completada correctamente",
      );
      resetAfterSubmit();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al registrar la venta",
      );
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      {/* ── Catálogo (izquierda) ── */}
      <div className="flex flex-1 flex-col overflow-hidden border-r">
        {/* Barra de búsqueda + ubicación */}
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
            <kbd className="rounded border px-1">F4</kbd> cobrar
          </p>
          {!restrictedToBranch && locations.length > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Ubicación
              </Label>
              <select
                value={locationId}
                onChange={(e) => handleLocationChange(e.target.value)}
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
              <Truck className="h-3.5 w-3.5" />
              {user?.location_name || "Sucursal"}
            </Badge>
          )}
        </div>

        {/* Filtros de categoría */}
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
                  .filter((c) => {
                    if (p.item_type === "bundle")
                      return c.cart_key === bundleCartKey(p.id);
                    if (p.variants.length)
                      return p.variants.some((v) => v.cart_key === c.cart_key);
                    return c.cart_key === serviceCartKey(p.id);
                  })
                  .reduce((s, c) => s + c.quantity, 0);
                const hasNamedVariants = p.variants.some(
                  (v) => !!v.size || !!v.color,
                );
                return (
                  <ProductCard
                    key={p.item_type === "bundle" ? `bundle-${p.id}` : p.id}
                    name={p.name}
                    brand={p.brand}
                    thumb={p.thumb}
                    icon={
                      p.item_type === "bundle" ? (
                        <Boxes className="h-10 w-10" />
                      ) : p.product_type === "service" ? (
                        <Zap className="h-10 w-10" />
                      ) : undefined
                    }
                    badge={
                      p.item_type === "bundle"
                        ? `${p.variantCount} productos`
                        : p.product_type === "service" && p.variantCount === 0
                          ? "Servicio"
                          : p.variantCount === 1 && !hasNamedVariants
                            ? "Prod. base"
                            : `${p.variantCount} ${p.variantCount === 1 ? "talla" : "tallas"}`
                    }
                    price={money(p.base_price)}
                    inCartCount={inCartCount}
                    onClick={() => {
                      if (p.item_type === "bundle") {
                        addBundleToCart({
                          id: p.id,
                          name: p.name,
                          base_price: p.base_price,
                          cost: p.cost,
                          available_stock: p.available_stock ?? 0,
                        });
                        return;
                      }
                      if (p.product_type === "service" && !p.variants.length) {
                        addServiceWithoutVariant(p);
                        return;
                      }
                      // Variante única sin talla/color → agregar directo (sin diálogo).
                      if (p.variants.length === 1 && !hasNamedVariants) {
                        const v = p.variants[0];
                        addToCart({
                          cart_key: v.cart_key,
                          id: v.id,
                          is_service: v.is_service,
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
              Sin resultados con stock disponible.
            </p>
          )}
        </div>
      </div>

      {/* ── Carrito (derecha) ── */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden bg-background xl:w-[420px] 2xl:w-[480px]">
        {/* Cliente */}
        <div className="shrink-0 border-b px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            CLIENTE
          </p>
          <div className="flex gap-2">
            <Combobox
              options={customerOptions}
              value={customerId}
              onSelect={setCustomerId}
              placeholder="Consumidor final"
              searchPlaceholder="Buscar por nombre, cédula, teléfono..."
              emptyText="No se encontró ese cliente."
              actionLabel="Crear cliente nuevo"
              onAction={() => setQuickOpen(true)}
              className="h-9 min-w-0 flex-1"
            />
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
          {customerId && (
            <Badge
              variant="secondary"
              className="mt-2 cursor-pointer text-xs"
              onClick={openEditCustomer}
            >
              <User className="mr-1 h-3 w-3" />
              {selectedCustomer?.name || "Seleccionado"}
            </Badge>
          )}
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">CARRITO</p>
            <Badge variant="secondary">{itemCount}</Badge>
          </div>
          {cart.length ? (
            <div className="space-y-2">
              {cart.map((i) => {
                const wholesaleApplies =
                  !i.value_edited &&
                  !!i.wholesale_price &&
                  i.wholesale_price > 0 &&
                  i.quantity >= i.wholesale_min_quantity;
                return (
                  <div
                    key={i.cart_key}
                    className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
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
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {i.value_edited && (
                            <Badge
                              variant="secondary"
                              className="bg-amber-100 px-1.5 py-0 text-[10px] text-amber-800"
                            >
                              Editado
                            </Badge>
                          )}
                          {wholesaleApplies && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 px-1.5 py-0 text-[10px] text-blue-800"
                            >
                              Mayoreo
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold tabular-nums">
                          {money(i.unit_value * i.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeItem(i.cart_key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                          max={i.is_service ? undefined : i.max}
                          value={i.quantity}
                          onChange={(e) =>
                            setQuantity(i.cart_key, Number(e.target.value) || 1)
                          }
                          className="h-7 w-12 rounded-none border-x px-1 text-center text-sm font-semibold focus-visible:ring-0"
                        />
                        <button
                          type="button"
                          className="px-2 py-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
                          onClick={() => setQuantity(i.cart_key, i.quantity + 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-1 items-center gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                          $/u
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={i.unit_value}
                          onChange={(e) =>
                            setUnitValue(
                              i.cart_key,
                              Math.max(0, Number(e.target.value) || 0),
                            )
                          }
                          className="h-7 flex-1 min-w-0 px-2 text-sm"
                        />
                        {i.value_edited && (
                          <button
                            type="button"
                            className="shrink-0 rounded-md bg-muted px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            title="Restaurar precio sugerido"
                            onClick={() => resetUnitValue(i.cart_key)}
                          >
                            Restaurar
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleItemIva(i.cart_key)}
                        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${i.applies_iva ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground hover:bg-muted"}`}
                      >
                        IVA 15%
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Toca un producto para agregarlo.
            </p>
          )}
        </div>

        {/* Pago + Total + CTA */}
        <div className="shrink-0 border-t bg-background px-4 py-3 space-y-3">
          {/* Método de pago */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              MÉTODO DE PAGO
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${paymentMethod === "cash" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <Banknote className="h-4 w-4" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("transfer")}
                className={`flex items-center justify-center gap-2 rounded-md border py-2 text-sm font-medium transition-colors ${paymentMethod === "transfer" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <ArrowLeftRight className="h-4 w-4" /> Transferencia
              </button>
            </div>
            <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
              <Checkbox
                checked={cashOnDelivery}
                onCheckedChange={(c) => setCashOnDelivery(c === true)}
              />
              <Truck className="h-4 w-4 text-muted-foreground" />
              Pago contra entrega
            </label>
          </div>

          {/* Envío */}
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              COSTO DE ENVÍO
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setShippingCost(0)}
                className={`rounded-md border py-1.5 text-sm font-medium transition-colors ${shippingCost === 0 ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                Gratis
              </button>
              <button
                type="button"
                onClick={() => setShippingCost(3)}
                className={`rounded-md border py-1.5 text-sm font-medium transition-colors ${shippingCost === 3 ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                $3
              </button>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={shippingCost ? String(shippingCost) : ""}
                placeholder="Otro"
                className="h-8"
                onChange={(e) =>
                  setShippingCost(Math.max(0, Number(e.target.value) || 0))
                }
              />
            </div>
          </div>

          {/* Total */}
          {(shippingCost > 0 || ivaAmount > 0) && (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(itemsTotal)}</span>
              </div>
              {shippingCost > 0 && (
                <div className="flex justify-between">
                  <span>Envío</span>
                  <span>{money(shippingCost)}</span>
                </div>
              )}
              {ivaAmount > 0 && (
                <div className="flex justify-between">
                  <span>IVA {sriIvaRate}%</span>
                  <span>{money(ivaAmount)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-2xl font-bold tabular-nums">{money(total)}</span>
          </div>

          <Button
            className="h-12 w-full text-base font-semibold"
            disabled={cart.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {paymentMethod === "transfer"
              ? "Registrar Transferencia"
              : cashOnDelivery
                ? "Registrar Pedido"
                : "Completar Venta"}
            <kbd className="ml-2 hidden rounded border border-primary-foreground/30 px-1 text-[10px] font-normal opacity-80 sm:inline">
              F4
            </kbd>
          </Button>
        </div>
      </div>

      {/* ── Selector de variante (bottom drawer) ── */}
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
                      {money(selectedProduct?.base_price ?? 0)} · {selectedProduct?.variants.length ?? 0} opciones
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
                    (v.is_service ? "Servicio" : "Prod. base");
                  const inCart = cart.find((c) => c.cart_key === v.cart_key);
                  const disabled = !v.is_service && v.stock <= 0;

                  const handleAdd = () => {
                    if (disabled || !selectedProduct) return;
                    addToCart({
                      cart_key: v.cart_key,
                      id: v.id,
                      is_service: v.is_service,
                      label: `${selectedProduct.name} — ${sizeLabel}`,
                      sku: v.sku,
                      thumb: v.thumb,
                      stock: v.stock,
                      base_price: selectedProduct.base_price,
                      wholesale_price: selectedProduct.wholesale_price,
                      wholesale_min_quantity: selectedProduct.wholesale_min_quantity,
                      cost: selectedProduct.cost,
                    });
                  };

                  return (
                    <div
                      key={v.id}
                      className={`relative flex flex-col overflow-hidden rounded-lg border transition-all ${inCart ? "border-primary/60 bg-primary/5" : ""} ${disabled ? "opacity-35" : "cursor-pointer active:scale-[0.97] hover:border-primary/30"}`}
                    >
                      {!inCart ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={handleAdd}
                          className="flex flex-col items-center gap-1 p-1.5 text-center touch-manipulation"
                        >
                          <Thumb url={v.thumb} size="w-full aspect-square rounded-md" />
                          <p className="text-[11px] font-semibold leading-tight line-clamp-1">
                            {sizeLabel}
                          </p>
                          {v.is_service ? (
                            <span className="text-[9px] text-muted-foreground">Servicio</span>
                          ) : (
                            <span className={`text-[9px] font-medium ${stockTone(v.stock)}`}>
                              {v.stock} disp.
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={handleAdd}
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
                            {v.is_service ? (
                              <span className="text-[9px] text-muted-foreground">Servicio</span>
                            ) : (
                              <span className={`text-[9px] font-medium ${stockTone(v.stock)}`}>
                                {v.stock} disp.
                              </span>
                            )}
                          </button>
                          <div className="flex items-center justify-around border-t bg-primary/5 px-1 py-1">
                            <button
                              type="button"
                              onClick={() => setQuantity(v.cart_key, inCart.quantity - 1)}
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-[10px] font-bold tabular-nums">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={!v.is_service && inCart.quantity >= inCart.max}
                              onClick={() => setQuantity(v.cart_key, inCart.quantity + 1)}
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 active:scale-90 transition-transform"
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

      {/* ── Nuevo cliente rápido ── */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>Registra los datos básicos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {[
              {
                id: "qc-name",
                label: "Nombre *",
                key: "name",
                placeholder: "Ej. María González",
              },
              {
                id: "qc-id",
                label: "Cédula / RUC",
                key: "id_number",
                placeholder: "Número de identificación",
              },
              {
                id: "qc-phone",
                label: "Teléfono *",
                key: "phone",
                placeholder: "09XXXXXXXX",
              },
              {
                id: "qc-email",
                label: "Correo *",
                key: "email",
                placeholder: "cliente@ejemplo.com",
                type: "email",
              },
              {
                id: "qc-city",
                label: "Ciudad",
                key: "city",
                placeholder: "Guayaquil",
              },
            ].map(({ id, label, key, placeholder, type }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={(quickForm as Record<string, string>)[key]}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
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

      {/* ── Editar cliente ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {[
              { id: "ec-name", label: "Nombre *", key: "name" },
              {
                id: "ec-phone",
                label: "Teléfono *",
                key: "phone",
                placeholder: "09XXXXXXXX",
              },
              {
                id: "ec-email",
                label: "Correo *",
                key: "email",
                type: "email",
                placeholder: "cliente@ejemplo.com",
              },
              {
                id: "ec-city",
                label: "Ciudad",
                key: "city",
                placeholder: "Guayaquil",
              },
              {
                id: "ec-id",
                label: "Cédula / RUC",
                key: "id_number",
                placeholder: "Número de identificación",
              },
            ].map(({ id, label, key, type, placeholder }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={(editForm as Record<string, string>)[key]}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEditCustomer} disabled={editSaving}>
              {editSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar venta ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar venta</DialogTitle>
            <DialogDescription>
              Revisa el resumen antes de registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">
                {selectedCustomer?.name || "Consumidor final"}
              </span>
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
                    <p>
                      {i.quantity} × {money(i.unit_value)}
                    </p>
                    <p className="font-medium">
                      {money(i.unit_value * i.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            {(shippingCost > 0 || ivaAmount > 0) && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(itemsTotal)}</span>
                </div>
                {shippingCost > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Envío</span>
                    <span>{money(shippingCost)}</span>
                  </div>
                )}
                {ivaAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA {sriIvaRate}%</span>
                    <span>{money(ivaAmount)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <Separator />
            <div className="space-y-1">
              {locations.length > 1 && locationId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ubicación</span>
                  <span className="font-medium">
                    {locations.find((l) => String(l.id) === locationId)?.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de pago</span>
                <span className="font-medium">
                  {paymentMethod === "cash" ? "Efectivo" : "Transferencia"}
                </span>
              </div>
              {cashOnDelivery && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modalidad</span>
                  <span className="font-medium text-amber-600">
                    Pago contra entrega
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Estado al registrar
                </span>
                <span
                  className={`font-medium ${cashOnDelivery || paymentMethod === "transfer" ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {cashOnDelivery
                    ? "Pendiente"
                    : paymentMethod === "transfer"
                      ? "Pendiente verificación"
                      : "Completada"}
                </span>
              </div>
              {paymentMethod === "transfer" && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                  <p className="font-medium">La transferencia debe ser verificada</p>
                  <p className="mt-1 text-xs text-amber-700">
                    La venta quedará pendiente hasta que se confirme el pago. Deberás completar la venta manualmente desde el listado de ventas.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePrintTicket}
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

      {/* ── Bloqueo de navegación con carrito activo ── */}
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Salir del punto de venta?</DialogTitle>
            <DialogDescription>
              Tienes {itemCount} ítem{itemCount !== 1 ? "s" : ""} en el
              carrito. El carrito se guardará y podrás continuar al volver.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Volver al POS
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
    </div>
  );
}
