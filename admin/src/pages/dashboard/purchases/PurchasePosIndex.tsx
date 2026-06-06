import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  UserPlus,
  Clock,
  CheckCircle,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useCustomerStore } from "../../../stores/customerStore";
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
import ProductCard from "../sales/ProductCard";
import {
  money,
  isServiceProduct,
  Thumb,
  parseVariantLabel,
  type CatalogItem,
} from "../shared/pos-helpers";

const validateSupplierId = (idType: string, idNumber: string) => {
  const value = idNumber.trim();
  if (!idType) return "El tipo de documento es requerido";
  if (!value) return "El número de documento es requerido";
  if (idType === "cedula" && !/^\d{10}$/.test(value))
    return "La cédula debe tener 10 dígitos";
  if (idType === "ruc" && !/^\d{13}$/.test(value))
    return "El RUC debe tener 13 dígitos";
  if (idType === "pasaporte" && (value.length < 5 || value.length > 20))
    return "El pasaporte debe tener entre 5 y 20 caracteres";
  return null;
};

export default function PurchasePosIndex() {
  const { products, categories, fetchProducts, fetchCategories } =
    useInventoryStore();
  const { customers, fetchCustomers, createCustomer } = useCustomerStore();
  const { createPurchase, isSubmitting } = usePurchaseStore();
  const { locations, fetchLocations } = useLocationStore();
  const { user } = useAuthStore();
  const restrictedToBranch =
    !!user?.restricted_to_location && !!user?.location_id;

  const {
    cart,
    addToCart,
    setQuantity,
    setUnitValue,
    setItemDiscount,
    toggleItemIva,
    removeItem,
    clearCart,
    itemsTotal,
    itemCount,
  } = usePosCart("purchase");

  const [locationId, setLocationId] = useState("");
  const [variantQuery, setVariantQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");

  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [paid, setPaid] = useState("0");

  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"draft" | "received">(
    "draft",
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  };

  const [supplierQuickOpen, setSupplierQuickOpen] = useState(false);
  const [supplierQuickSaving, setSupplierQuickSaving] = useState(false);
  const [supplierQuickForm, setSupplierQuickForm] = useState({
    name: "",
    id_type: "ruc",
    id_number: "",
    phone: "",
    email: "",
    city: "",
  });

  const itemsSubtotal = cart.reduce(
    (sum, i) => sum + i.unit_value * i.quantity,
    0,
  );
  const itemsDiscount = cart.reduce(
    (sum, i) => sum + i.discount * i.quantity,
    0,
  );
  const itemsTax = cart.reduce(
    (sum, i) =>
      sum +
      (i.applies_iva
        ? (i.unit_value - i.discount) * i.quantity * 0.15
        : 0),
    0,
  );
  const total = itemsTotal + itemsTax;

  const suppliers = useMemo(
    () => customers.filter((c) => c.is_supplier),
    [customers],
  );
  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId);
  const supplierOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: "", label: "Sin proveedor", description: "Compra sin proveedor asignado" },
      ...suppliers.map((s) => ({
        value: String(s.id),
        label: s.name,
        description: [s.id_number, s.phone, s.email].filter(Boolean).join(" · "),
        keywords: [s.id_number, s.phone, s.email, s.city].filter(Boolean).join(" "),
      })),
    ],
    [suppliers],
  );

  useEffect(() => {
    fetchCustomers(1, 200, "");
    fetchCategories();
    fetchLocations().catch(() => {});
    fetchProducts(1, 200, { product_type: "good" });
  }, [fetchCustomers, fetchCategories, fetchLocations, fetchProducts]);

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

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      cart.length > 0 && currentLocation.pathname !== nextLocation.pathname,
  );

  const handleLocationChange = (value: string) => {
    setLocationId(value);
    if (cart.length) {
      clearCart();
      toast("Orden vaciada: cambiaste de destino", { icon: "🏬" });
    }
  };

  // Autofocus en la búsqueda al montar (flujo de ingreso / escáner).
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Atajos: F2 enfoca búsqueda · F4 abre "Recibir".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        focusSearch();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length) {
          setConfirmStatus("received");
          setConfirmOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart.length]);

  // Agrega por SKU exacto (escáner) o, si hay un único resultado, lo resuelve.
  const quickAddFromQuery = () => {
    const q = variantQuery.trim();
    if (!q) return;

    const match = findVariantBySku(products, q);
    if (match) {
      const { product, variant } = match;
      if (isServiceProduct(product)) return;
      const variantLabel = [variant.size, variant.color].filter(Boolean).join(" / ");
      addToCart({
        cart_key: variantCartKey(variant.id),
        id: variant.id,
        is_service: false,
        label: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
        sku: variant.sku,
        thumb: variant.images?.[0]?.url || product.images?.[0]?.url,
        stock: stockAt(variant, locationId),
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
          stock: stockAt(v, locationId),
          sku: v.sku,
          thumb: v.images?.[0]?.url || p.images?.[0]?.url,
        })),
      }));
  }, [products, variantQuery, categoryFilter, locationId]);

  const saveQuickSupplier = async () => {
    if (!supplierQuickForm.name.trim())
      return toast.error("El nombre del proveedor es requerido");
    const idError = validateSupplierId(
      supplierQuickForm.id_type,
      supplierQuickForm.id_number,
    );
    if (idError) return toast.error(idError);
    setSupplierQuickSaving(true);
    try {
      const created = await createCustomer({
        name: supplierQuickForm.name,
        id_type: supplierQuickForm.id_type,
        id_number: supplierQuickForm.id_number,
        phone: supplierQuickForm.phone,
        email: supplierQuickForm.email || undefined,
        city: supplierQuickForm.city,
        is_customer: false,
        is_supplier: true,
      });
      setSupplierId(String(created.id));
      await fetchCustomers(1, 200, "");
      toast.success(`Proveedor ${created.name} creado y seleccionado`);
      setSupplierQuickOpen(false);
      setSupplierQuickForm({
        name: "",
        id_type: "ruc",
        id_number: "",
        phone: "",
        email: "",
        city: "",
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al crear el proveedor",
      );
    } finally {
      setSupplierQuickSaving(false);
    }
  };

  const setPaidAmount = (value: string) => {
    const parsed = Number(value || 0);
    if (!value) {
      setPaid("");
      return;
    }
    setPaid(String(Math.min(Math.max(parsed, 0), Math.max(total, 0))));
  };

  const resetAfterSubmit = () => {
    setConfirmOpen(false);
    clearCart();
    setVariantQuery("");
    setSupplierId("");
    setReference("");
    setPaid("0");
  };

  const clearAll = () => {
    clearCart();
    setVariantQuery("");
    setSupplierId("");
    setReference("");
    setPaid("0");
    setClearConfirmOpen(false);
    toast.success("Orden reiniciada");
    focusSearch();
  };

  const openConfirm = (status: "draft" | "received") => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    setConfirmStatus(status);
    setConfirmOpen(true);
  };

  const submitPurchase = async () => {
    try {
      await createPurchase({
        customer_id: supplierId ? Number(supplierId) : null,
        location_id: locationId ? Number(locationId) : null,
        status: confirmStatus,
        paid_amount: Math.min(Number(paid || 0), Math.max(total, 0)),
        due_date: null,
        reference: reference || null,
        notes: null,
        items: cart.flatMap((i) =>
          i.product_variant_id === null
            ? []
            : [
                {
                  product_variant_id: i.product_variant_id,
                  quantity: i.quantity,
                  unit_cost: i.unit_value,
                  discount: i.discount,
                  applies_iva: i.applies_iva,
                },
              ],
        ),
      });
      toast.success(
        confirmStatus === "received"
          ? "Mercancía recibida — stock actualizado"
          : "Compra guardada por recibir",
      );
      resetAfterSubmit();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Error al registrar la compra",
      );
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      {/* ── Catálogo (izquierda) ── */}
      <div className="flex flex-1 flex-col overflow-hidden border-r">
        {/* Búsqueda + destino */}
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
            <kbd className="rounded border px-1">F4</kbd> recibir
          </p>
          {!restrictedToBranch && locations.length > 1 && (
            <div className="flex shrink-0 items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                Destino
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
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
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
                    price={money(p.cost)}
                    priceSuffix="costo"
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

      {/* ── Orden de compra (derecha) ── */}
      <div className="flex w-80 shrink-0 flex-col overflow-hidden bg-background xl:w-[480px] 2xl:w-[560px]">
        {/* Proveedor + Referencia */}
        <div className="shrink-0 border-b px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">PROVEEDOR</p>
          <div className="flex gap-2">
            <Combobox
              options={supplierOptions}
              value={supplierId}
              onSelect={setSupplierId}
              placeholder="Sin proveedor"
              searchPlaceholder="Buscar por proveedor, RUC, teléfono..."
              emptyText="No se encontró ese proveedor."
              actionLabel="Crear proveedor nuevo"
              onAction={() => setSupplierQuickOpen(true)}
              className="h-9 min-w-0 flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              title="Nuevo proveedor"
              onClick={() => setSupplierQuickOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Referencia / N° factura"
            className="h-9"
          />
        </div>

        {/* Tabla de ítems */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              ORDEN DE COMPRA
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
              <Badge variant="secondary">{itemCount} items</Badge>
            </div>
          </div>
          {cart.length ? (
            <div className="space-y-2">
              {cart.map((i) => (
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
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-sm font-bold tabular-nums">
                          {money((i.unit_value - i.discount) * i.quantity)}
                        </span>
                        {i.discount > 0 && (
                          <p className="text-[10px] text-emerald-600">
                            -{money(i.discount)} desc/u
                          </p>
                        )}
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
                    </div>
                    <div className="flex flex-1 items-center gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                        Desc
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={i.unit_value}
                        step="0.01"
                        value={i.discount}
                        onChange={(e) =>
                          setItemDiscount(
                            i.cart_key,
                            Math.max(
                              0,
                              Math.min(
                                Number(e.target.value) || 0,
                                i.unit_value,
                              ),
                            ),
                          )
                        }
                        className="h-7 flex-1 min-w-0 px-2 text-sm"
                      />
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
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Selecciona productos del catálogo para agregar.
            </p>
          )}
        </div>

        {/* Totales desglosados + CTAs */}
        <div className="shrink-0 border-t bg-background px-4 py-3 space-y-3">
          <div className="space-y-0.5 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{money(itemsSubtotal)}</span>
            </div>
            {itemsDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Descuento</span>
                <span>-{money(itemsDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Neto</span>
              <span>{money(itemsTotal)}</span>
            </div>
            {itemsTax > 0 && (
              <div className="flex justify-between">
                <span>IVA 15%</span>
                <span>{money(itemsTax)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-2xl font-bold tabular-nums">{money(total)}</span>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Pagado</Label>
            <Input
              type="number"
              min={0}
              max={Math.max(total, 0)}
              step="0.01"
              value={paid}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full gap-1.5"
              disabled={cart.length === 0}
              onClick={() => openConfirm("draft")}
            >
              <Clock className="h-4 w-4" /> Por recibir
            </Button>
            <Button
              className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={cart.length === 0}
              onClick={() => openConfirm("received")}
            >
              <CheckCircle className="h-4 w-4" /> Recibir ahora
            </Button>
          </div>
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
                      {money(selectedProduct?.cost ?? 0)} · {selectedProduct?.variants.length ?? 0} opciones
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
                      wholesale_min_quantity: selectedProduct.wholesale_min_quantity,
                      cost: selectedProduct.cost,
                    });
                  };

                  return (
                    <div
                      key={v.id}
                      className={`relative flex flex-col overflow-hidden rounded-lg border transition-all ${inCart ? "border-primary/60 bg-primary/5" : ""} cursor-pointer active:scale-[0.97] hover:border-primary/30`}
                    >
                      {!inCart ? (
                        <button
                          type="button"
                          onClick={handleAdd}
                          className="flex flex-col items-center gap-1 p-1.5 text-center touch-manipulation"
                        >
                          <Thumb url={v.thumb} size="w-full aspect-square rounded-md" />
                          <p className="text-[11px] font-semibold leading-tight line-clamp-1">
                            {sizeLabel}
                          </p>
                          <span className={`text-[9px] font-medium ${stockTone(v.stock)}`}>
                            {v.stock} disp.
                          </span>
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
                            <span className={`text-[9px] font-medium ${stockTone(v.stock)}`}>
                              {v.stock} disp.
                            </span>
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
                              onClick={() => setQuantity(v.cart_key, inCart.quantity + 1)}
                              className="rounded p-0.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform"
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
            <DialogTitle>¿Salir de la orden de compra?</DialogTitle>
            <DialogDescription>
              Tienes {itemCount} ítem{itemCount !== 1 ? "s" : ""} en la orden.
              Si sales ahora perderás el progreso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Volver a la orden
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

      {/* ── Confirmar vaciar orden ── */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Vaciar la orden?</DialogTitle>
            <DialogDescription>
              Se eliminarán los {itemCount} ítem{itemCount !== 1 ? "s" : ""} y
              se reiniciarán proveedor y referencia. Esta acción no se puede
              deshacer.
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

      {/* ── Nuevo proveedor rápido ── */}
      <Dialog open={supplierQuickOpen} onOpenChange={setSupplierQuickOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo proveedor</DialogTitle>
            <DialogDescription>
              Registra un proveedor y selecciónalo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                placeholder="Razón social o nombre comercial"
                value={supplierQuickForm.name}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Documento *</Label>
                <select
                  value={supplierQuickForm.id_type}
                  onChange={(e) =>
                    setSupplierQuickForm((f) => ({
                      ...f,
                      id_type: e.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ruc">RUC</option>
                  <option value="cedula">Cédula</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Número *</Label>
                <Input
                  placeholder="Identificación"
                  value={supplierQuickForm.id_number}
                  onChange={(e) =>
                    setSupplierQuickForm((f) => ({
                      ...f,
                      id_number: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono</Label>
              <Input
                placeholder="09XXXXXXXX"
                value={supplierQuickForm.phone}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                placeholder="proveedor@ejemplo.com"
                value={supplierQuickForm.email}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ciudad</Label>
              <Input
                placeholder="Guayaquil"
                value={supplierQuickForm.city}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSupplierQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveQuickSupplier} disabled={supplierQuickSaving}>
              {supplierQuickSaving ? "Guardando..." : "Guardar y seleccionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar compra ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirmStatus === "received"
                ? "Recibir mercancía"
                : "Guardar por recibir"}
            </DialogTitle>
            <DialogDescription>
              Revisa el resumen antes de registrar.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Proveedor</span>
              <span className="font-medium">
                {selectedSupplier?.name || "Sin proveedor"}
              </span>
            </div>
            {reference && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referencia</span>
                <span className="font-medium">{reference}</span>
              </div>
            )}
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
                      {i.quantity} × {money(i.unit_value - i.discount)}
                      {i.discount > 0 && (
                        <span className="ml-1 text-xs text-emerald-600">
                          (-{money(i.discount)})
                        </span>
                      )}
                      {i.applies_iva && (
                        <span className="ml-1 text-[10px] text-primary">
                          +IVA
                        </span>
                      )}
                    </p>
                    <p className="font-medium">
                      {money(
                        (i.unit_value - i.discount) * i.quantity +
                          (i.applies_iva
                            ? (i.unit_value - i.discount) *
                              i.quantity *
                              0.15
                            : 0),
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(itemsSubtotal)}</span>
              </div>
              {itemsDiscount > 0 && (
                <div className="flex justify-between">
                  <span>Descuento</span>
                  <span>-{money(itemsDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Neto</span>
                <span>{money(itemsTotal)}</span>
              </div>
              {itemsTax > 0 && (
                <div className="flex justify-between">
                  <span>IVA 15%</span>
                  <span>{money(itemsTax)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <Separator />
            <div className="space-y-1">
              {locations.length > 1 && locationId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Destino</span>
                  <span className="font-medium">
                    {locations.find((l) => String(l.id) === locationId)?.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Estado al registrar
                </span>
                <span
                  className={`font-medium ${confirmStatus === "received" ? "text-emerald-600" : "text-amber-600"}`}
                >
                  {confirmStatus === "received"
                    ? "Recibida (stock actualizado)"
                    : "Por recibir"}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Volver a editar
            </Button>
            <Button
              onClick={submitPurchase}
              disabled={isSubmitting}
              className={
                confirmStatus === "received"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : ""
              }
            >
              {isSubmitting
                ? "Procesando..."
                : confirmStatus === "received"
                  ? "Confirmar recepción"
                  : "Guardar por recibir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
