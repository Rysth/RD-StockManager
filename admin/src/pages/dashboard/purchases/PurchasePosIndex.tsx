import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ImageIcon,
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
  type VariantOption,
} from "../../../hooks/usePosCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ProductCard from "../sales/ProductCard";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    n || 0,
  );

const isServiceProduct = (product: { product_type?: string | null }) =>
  ["service", "servicio"].includes(
    String(product.product_type ?? "").toLowerCase(),
  );

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

function Thumb({ url, size = "h-9 w-9" }: { url?: string; size?: string }) {
  return url ? (
    <img
      src={url}
      alt=""
      className={`${size} aspect-square rounded-md border bg-white object-contain`}
    />
  ) : (
    <div
      className={`${size} flex items-center justify-center rounded-md border bg-muted text-muted-foreground`}
    >
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

interface CatalogItem {
  item_type: "product";
  id: number;
  name: string;
  product_type?: "good" | "service";
  brand?: string | null;
  base_price: number;
  wholesale_price: number | null;
  wholesale_min_quantity: number;
  cost: number;
  thumb?: string;
  variantCount: number;
  variants: {
    cart_key: string;
    id: number;
    is_service: boolean;
    size?: string | null;
    color?: string | null;
    stock: number;
    sku: string;
    thumb?: string;
  }[];
}

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
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paid, setPaid] = useState("0");

  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(
    null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
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

  const discountNum = Number(discount || 0);
  const taxNum = Number(tax || 0);
  const total = itemsTotal - discountNum + taxNum;

  const suppliers = useMemo(
    () => customers.filter((c) => c.is_supplier),
    [customers],
  );
  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId);

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
    setDiscount("0");
    setTax("0");
    setPaid("0");
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
        discount: discountNum,
        tax: taxNum,
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
      <div className="flex w-96 shrink-0 flex-col overflow-hidden bg-background xl:w-[26rem]">
        {/* Proveedor + Referencia */}
        <div className="shrink-0 border-b px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">PROVEEDOR</p>
          <div className="flex gap-2">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
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
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              ORDEN DE COMPRA
            </p>
            <Badge variant="secondary">{itemCount} items</Badge>
          </div>
          {cart.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Producto</TableHead>
                  <TableHead className="w-20 text-center">Cant.</TableHead>
                  <TableHead className="w-24">Costo u.</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((i) => (
                  <TableRow key={i.cart_key}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <Thumb url={i.thumb} size="h-8 w-8" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {i.label}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {i.sku}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center rounded-md border">
                        <button
                          type="button"
                          className="px-1 py-1 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setQuantity(i.cart_key, i.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <Input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) =>
                            setQuantity(i.cart_key, Number(e.target.value) || 1)
                          }
                          className="h-7 w-10 rounded-none border-0 px-1 text-center text-sm focus-visible:ring-0"
                        />
                        <button
                          type="button"
                          className="px-1 py-1 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setQuantity(i.cart_key, i.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={i.unit_value}
                        onChange={(e) =>
                          setUnitValue(i.cart_key, Number(e.target.value) || 0)
                        }
                        className="h-8 w-24 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeItem(i.cart_key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground px-4">
              Selecciona productos del catálogo para agregar.
            </p>
          )}
        </div>

        {/* Descuento / IVA / Pagado + Total + CTAs */}
        <div className="shrink-0 border-t bg-background px-4 py-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Descuento", value: discount, setter: setDiscount },
              { label: "IVA", value: tax, setter: setTax },
            ].map(({ label, value, setter }) => (
              <div key={label} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Pagado
              </Label>
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
          </div>

          {(discountNum > 0 || taxNum > 0) && (
            <div className="space-y-0.5 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(itemsTotal)}</span>
              </div>
              {discountNum > 0 && (
                <div className="flex justify-between">
                  <span>Descuento</span>
                  <span>-{money(discountNum)}</span>
                </div>
              )}
              {taxNum > 0 && (
                <div className="flex justify-between">
                  <span>IVA</span>
                  <span>{money(taxNum)}</span>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-2xl font-bold tabular-nums">{money(total)}</span>
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

      {/* ── Selector de variante ── */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            focusSearch();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.brand && `${selectedProduct.brand} · `}
              {`Costo base ${money(selectedProduct?.cost ?? 0)} · Selecciona variante`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4">
            {selectedProduct && (
              <div className="hidden w-28 shrink-0 sm:block">
                {selectedProduct.thumb ? (
                  <img
                    src={selectedProduct.thumb}
                    alt={selectedProduct.name}
                    className="h-28 w-28 rounded-lg border bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 space-y-2">
              {selectedProduct?.variants.map((v) => {
                const sizeLabel =
                  [v.size, v.color].filter(Boolean).join(" / ") ||
                  "Producto base";
                const inCart = cart.find((c) => c.cart_key === v.cart_key);
                const variantOpt: VariantOption = {
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
                };
                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${inCart ? "border-primary/40 bg-primary/5" : ""}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{sizeLabel}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Badge
                          variant="secondary"
                          className={`px-1.5 py-0 text-[10px] ${stockTone(v.stock)}`}
                        >
                          {v.stock} en stock
                        </Badge>
                        · <span className="font-mono">{v.sku}</span>
                      </p>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-0.5 rounded-md border bg-background">
                        <button
                          type="button"
                          className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setQuantity(v.cart_key, inCart.quantity - 1)
                          }
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setQuantity(v.cart_key, inCart.quantity + 1)
                          }
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => addToCart(variantOpt)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedProduct(null)}
            >
              Cerrar
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
            {(discountNum > 0 || taxNum > 0) && (
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(itemsTotal)}</span>
                </div>
                {discountNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Descuento</span>
                    <span>-{money(discountNum)}</span>
                  </div>
                )}
                {taxNum > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA</span>
                    <span>{money(taxNum)}</span>
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
