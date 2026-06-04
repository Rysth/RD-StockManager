import { useEffect, useMemo, useRef, useState } from "react";
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
  User,
  PackagePlus,
  CheckCircle,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSaleStore } from "../../../stores/saleStore";
import { usePurchaseStore } from "../../../stores/purchaseStore";
import { useInventoryStore } from "../../../stores/inventoryStore";
import { useProductBundleStore } from "../../../stores/productBundleStore";
import { useCustomerStore } from "../../../stores/customerStore";
import { useBusinessStore } from "../../../stores/businessStore";
import { useLocationStore } from "../../../stores/locationStore";
import { useAuthStore } from "../../../stores/authStore";
import { Permissions } from "../../../types/auth";
import type { PaymentMethod, ProductVariant } from "../../../types/inventory";
import { printTicket } from "../../../lib/ticket";
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
import { Separator } from "@/components/ui/separator";
import ProductCard from "./ProductCard";

type Mode = "sale" | "purchase";

const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    n || 0,
  );

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

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

interface CartItem {
  cart_key: string;
  product_variant_id: number | null;
  product_bundle_id?: number | null;
  is_service: boolean;
  label: string;
  sku: string;
  thumb?: string;
  base_price: number;
  wholesale_price: number | null;
  wholesale_min_quantity: number;
  cost: number;
  quantity: number;
  max: number; // stock disponible (tope solo en venta)
  unit_value: number; // precio (venta) o costo (compra)
  value_edited: boolean;
}

interface VariantOption {
  cart_key: string;
  id: number | null;
  is_service: boolean;
  label: string;
  sku: string;
  thumb?: string;
  stock: number;
  base_price: number;
  wholesale_price: number | null;
  wholesale_min_quantity: number;
  cost: number;
}

interface CatalogItem {
  item_type: "product" | "bundle";
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
  available_stock?: number;
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

function suggestedPrice(
  item: Pick<
    CartItem,
    "base_price" | "wholesale_price" | "wholesale_min_quantity" | "quantity"
  >,
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

const variantCartKey = (id: number) => `variant:${id}`;
const serviceCartKey = (id: number) => `service:${id}`;
const bundleCartKey = (id: number) => `bundle:${id}`;

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

interface PosIndexProps {
  forcedMode?: Mode;
}

export default function PosIndex({ forcedMode }: PosIndexProps) {
  const { products, categories, fetchProducts, fetchCategories } =
    useInventoryStore();
  const { bundles, fetchBundles } = useProductBundleStore();
  const { customers, fetchCustomers, createCustomer, updateCustomer } =
    useCustomerStore();
  const { createSale, isSubmitting: isSubmittingSale } = useSaleStore();
  const { createPurchase, isSubmitting: isSubmittingPurchase } =
    usePurchaseStore();
  const { publicBusiness, fetchPublicBusiness } = useBusinessStore();
  const { locations, fetchLocations } = useLocationStore();
  const { user, hasPermission } = useAuthStore();
  const restrictedToBranch =
    !!user?.restricted_to_location && !!user?.location_id;

  const isBusinessEmployee = user?.roles?.includes("business_employee");
  const canSell = hasPermission(Permissions.MANAGE_SALES);
  const canPurchase =
    hasPermission(Permissions.VIEW_PURCHASES) && !isBusinessEmployee;

  // ── Mode (venta / compra) ────────────────────────────────────
  const [mode, setMode] = useState<Mode>(() =>
    forcedMode ?? (canSell ? "sale" : "purchase"),
  );
  const isSubmitting =
    mode === "sale" ? isSubmittingSale : isSubmittingPurchase;

  // ── Shared state ─────────────────────────────────────────────
  const [locationId, setLocationId] = useState<string>("");
  const [variantQuery, setVariantQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "all">("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  // ── Sale-only state ──────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashOnDelivery, setCashOnDelivery] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);

  // ── Purchase-only state ──────────────────────────────────────
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paid, setPaid] = useState("0");
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

  // ── Dialog state ─────────────────────────────────────────────
  const [selectedProduct, setSelectedProduct] = useState<CatalogItem | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<"draft" | "received">(
    "draft",
  );

  // Customer flows (sale only)
  const [customerByOpen, setCustomerByOpen] = useState(false);
  const [customerByQuery, setCustomerByQuery] = useState("");
  const customerSearchRef = useRef<HTMLInputElement>(null);
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
  const [quickForm, setQuickForm] = useState({
    name: "",
    phone: "",
    city: "",
    id_number: "",
    id_type: "cedula",
    email: "",
  });
  const [quickSaving, setQuickSaving] = useState(false);

  const suppliers = useMemo(
    () => customers.filter((c) => c.is_supplier),
    [customers],
  );

  useEffect(() => {
    fetchProducts(1, 200, {});
    fetchCustomers(1, 200, "");
    fetchCategories();
    fetchLocations().catch(() => {});
    fetchPublicBusiness().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "sale") fetchBundles(locationId).catch(() => {});
  }, [fetchBundles, locationId, mode]);

  useEffect(() => {
    if (restrictedToBranch && user?.location_id) {
      setLocationId(String(user.location_id));
      return;
    }
    if (!locationId && locations.length) {
      const fallback = locations.find((l) => l.is_default) ?? locations[0];
      setLocationId(String(fallback.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations, restrictedToBranch]);

  // Cambiar de modo limpia el carrito y los datos específicos (operación distinta).
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setCart([]);
    setVariantQuery("");
    setCustomerId("");
    setCustomerSearch("");
    setPaymentMethod("cash");
    setCashOnDelivery(false);
    setShippingCost(0);
    setSupplierId("");
    setReference("");
    setDiscount("0");
    setTax("0");
    setPaid("0");
  };

  useEffect(() => {
    if (forcedMode && mode !== forcedMode) switchMode(forcedMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedMode, mode]);

  // Stock de una variante en la ubicación seleccionada (cae al total si no hay desglose).
  const stockAt = (v: ProductVariant): number => {
    if (locationId && v.stock_by_location?.length) {
      const found = v.stock_by_location.find(
        (sl) => String(sl.location_id) === locationId,
      );
      return found ? found.quantity : 0;
    }
    return v.stock;
  };

  // ── Categorías con productos relevantes según el modo ─────────
  const activeCategoryIds = useMemo(() => {
    const ids = new Set<number>();
    products.forEach((p) => {
      // En compra mostramos todo; en venta los servicios no requieren stock.
      const relevant =
        mode === "purchase" ||
        p.product_type === "service" ||
        p.variants.some((v) => stockAt(v) > 0);
      if (p.category_id && relevant) ids.add(p.category_id);
    });
    return ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, locationId, mode]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => activeCategoryIds.has(c.id)),
    [categories, activeCategoryIds],
  );

  // ── Grid de productos ────────────────────────────────────────
  const productGroups = useMemo<CatalogItem[]>(() => {
    const q = variantQuery.trim().toLowerCase();
    const productItems = products
      .filter((p) => {
        if (categoryFilter !== "all" && p.category_id !== categoryFilter)
          return false;
        // En venta requerimos stock solo para bienes; los servicios son ilimitados.
        if (
          mode === "sale" &&
          p.product_type !== "service" &&
          !p.variants.some((v) => stockAt(v) > 0)
        )
          return false;
        if (!q) return true;
        const productMatch = `${p.name} ${p.brand ?? ""}`
          .toLowerCase()
          .includes(q);
        const variantMatch = p.variants.some((v) =>
          `${v.sku} ${v.size ?? ""} ${v.color ?? ""}`.toLowerCase().includes(q),
        );
        return productMatch || variantMatch;
      })
      .map<CatalogItem>((p) => {
        const variants = (
          mode === "sale" && p.product_type !== "service"
            ? p.variants.filter((v) => stockAt(v) > 0)
            : p.variants
        ).map((v) => ({
          cart_key: variantCartKey(v.id),
          id: v.id,
          is_service: p.product_type === "service",
          size: v.size,
          color: v.color,
          stock: stockAt(v),
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
          thumb: p.images?.[0]?.url,
          variantCount: variants.length,
          variants,
        };
      });

    const bundleItems =
      mode === "sale" && categoryFilter === "all"
        ? bundles
            .filter((bundle) => {
              if (bundle.available_stock <= 0) return false;
              if (!q) return true;
              return `${bundle.name} ${bundle.description ?? ""}`
                .toLowerCase()
                .includes(q);
            })
            .map<CatalogItem>((bundle) => ({
              item_type: "bundle",
              id: bundle.id,
              name: bundle.name,
              product_type: "good",
              brand: "Combo",
              base_price: bundle.base_price,
              wholesale_price: null,
              wholesale_min_quantity: 1,
              cost: bundle.total_cost,
              variantCount: bundle.items_count,
              available_stock: bundle.available_stock,
              variants: [],
            }))
        : [];

    return [...productItems, ...bundleItems];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, bundles, variantQuery, categoryFilter, locationId, mode]);

  // ── Operaciones de carrito ───────────────────────────────────
  function withQuantity(item: CartItem, quantity: number): CartItem {
    const cap = mode === "sale" ? item.max : Number.MAX_SAFE_INTEGER;
    const q = Math.max(1, Math.min(quantity, cap));
    const next = { ...item, quantity: q };
    // En venta, si no se editó el precio, recalcula (puede aplicar mayoreo).
    if (mode === "sale" && !item.value_edited)
      next.unit_value = suggestedPrice(next);
    return next;
  }

  const addToCart = (v: VariantOption) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.cart_key === v.cart_key);
      if (existing) {
        if (
          mode === "sale" &&
          !existing.is_service &&
          existing.quantity >= existing.max
        ) {
          toast.error("No hay más stock disponible");
          return prev;
        }
        return prev.map((i) =>
          i.cart_key === v.cart_key ? withQuantity(i, i.quantity + 1) : i,
        );
      }
      const base: CartItem = {
        cart_key: v.cart_key,
        product_variant_id: v.id,
        product_bundle_id: null,
        is_service: v.is_service,
        label: v.label,
        sku: v.sku,
        thumb: v.thumb,
        base_price: v.base_price,
        wholesale_price: v.wholesale_price,
        wholesale_min_quantity: v.wholesale_min_quantity,
        cost: v.cost,
        quantity: 1,
        max: v.is_service ? Number.MAX_SAFE_INTEGER : v.stock,
        unit_value: mode === "sale" ? v.base_price : v.cost,
        value_edited: false,
      };
      return [...prev, withQuantity(base, 1)];
    });
  };

  const addBundleToCart = (bundle: CatalogItem) => {
    setCart((prev) => {
      const key = bundleCartKey(bundle.id);
      const existing = prev.find((i) => i.cart_key === key);
      if (existing) {
        if (existing.quantity >= existing.max) {
          toast.error("No hay más stock disponible para este combo");
          return prev;
        }
        return prev.map((i) =>
          i.cart_key === key ? withQuantity(i, i.quantity + 1) : i,
        );
      }
      return [
        ...prev,
        {
          cart_key: key,
          product_variant_id: null,
          product_bundle_id: bundle.id,
          is_service: false,
          label: bundle.name,
          sku: "COMBO",
          thumb: bundle.thumb,
          base_price: bundle.base_price,
          wholesale_price: null,
          wholesale_min_quantity: 1,
          cost: bundle.cost,
          quantity: 1,
          max: bundle.available_stock ?? 0,
          unit_value: bundle.base_price,
          value_edited: false,
        },
      ];
    });
  };

  const addServiceWithoutVariant = (p: {
    id: number;
    name: string;
    thumb?: string;
    base_price: number;
    wholesale_price: number | null;
    wholesale_min_quantity: number;
    cost: number;
  }) => {
    addToCart({
      cart_key: serviceCartKey(p.id),
      id: null,
      is_service: true,
      label: p.name,
      sku: "SERVICIO",
      thumb: p.thumb,
      stock: 0,
      base_price: p.base_price,
      wholesale_price: p.wholesale_price,
      wholesale_min_quantity: p.wholesale_min_quantity,
      cost: p.cost,
    });
  };

  const setQuantity = (key: string, qty: number) =>
    setCart((prev) =>
      prev.map((i) => (i.cart_key === key ? withQuantity(i, qty) : i)),
    );

  const setUnitValue = (key: string, value: number) =>
    setCart((prev) =>
      prev.map((i) =>
        i.cart_key === key ? { ...i, unit_value: value, value_edited: true } : i,
      ),
    );

  const removeItem = (key: string) =>
    setCart((prev) => prev.filter((i) => i.cart_key !== key));

  const handleLocationChange = (value: string) => {
    setLocationId(value);
    if (cart.length) {
      setCart([]);
      toast("Carrito vaciado: cambiaste de ubicación", { icon: "🏬" });
    }
  };

  // ── Totales ──────────────────────────────────────────────────
  const itemsTotal = cart.reduce(
    (sum, i) => sum + i.unit_value * i.quantity,
    0,
  );
  const discountNum = Number(discount || 0);
  const taxNum = Number(tax || 0);
  const total =
    mode === "sale"
      ? itemsTotal + shippingCost
      : itemsTotal - discountNum + taxNum;
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const selectedCustomer = customers.find((c) => String(c.id) === customerId);
  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId);

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
      toast.error(errorMessage(e, "Error al crear el proveedor"));
    } finally {
      setSupplierQuickSaving(false);
    }
  };

  // ── Cliente rápido (venta) ───────────────────────────────────
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
      setCustomerSearch(created.name);
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
      toast.error(errorMessage(e, "Error al crear el cliente"));
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
      toast.error(errorMessage(e, "Error al actualizar el cliente"));
    } finally {
      setEditSaving(false);
    }
  };

  // ── Imprimir ticket (venta) ──────────────────────────────────
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

  // ── Confirmar / registrar ────────────────────────────────────
  const openConfirm = (status?: "draft" | "received") => {
    if (cart.length === 0) {
      toast.error("Agrega al menos un producto");
      return;
    }
    if (status) setConfirmStatus(status);
    setConfirmOpen(true);
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
    setCart([]);
    setVariantQuery("");
    if (mode === "sale") {
      setCustomerId("");
      setCustomerSearch("");
      setPaymentMethod("cash");
      setCashOnDelivery(false);
      setShippingCost(0);
    } else {
      setSupplierId("");
      setReference("");
      setDiscount("0");
      setTax("0");
      setPaid("0");
    }
  };

  const submitSale = async () => {
    try {
      await createSale({
        customer_id: customerId ? Number(customerId) : null,
        location_id: locationId ? Number(locationId) : null,
        status: cashOnDelivery ? "pending" : "completed",
        payment_method: paymentMethod,
        cash_on_delivery: cashOnDelivery,
        shipping_cost: shippingCost,
        items: cart.map((i) => ({
          product_variant_id: i.product_variant_id,
          product_bundle_id: i.product_bundle_id ?? null,
          description: i.product_variant_id ? undefined : i.label,
          quantity: i.quantity,
          unit_price: i.unit_value,
        })),
      });
      toast.success(
        cashOnDelivery
          ? "Pedido registrado — pendiente de entrega y pago"
          : "Venta completada correctamente",
      );
      resetAfterSubmit();
    } catch (e) {
      toast.error(errorMessage(e, "Error al registrar la venta"));
    }
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
      toast.error(errorMessage(e, "Error al registrar la compra"));
    }
  };

  const isSale = mode === "sale";

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Encabezado + toggle de modo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isSale ? "Punto de Venta" : "Ingreso de mercancía"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSale
              ? "Registra una venta nueva"
              : "Registra una compra a proveedor"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Toggle venta / compra */}
          {!forcedMode && canSell && canPurchase && (
            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => switchMode("sale")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isSale
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingCart className="h-4 w-4" /> Vender
              </button>
              <button
                type="button"
                onClick={() => switchMode("purchase")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  !isSale
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PackagePlus className="h-4 w-4" /> Comprar
              </button>
            </div>
          )}

          {restrictedToBranch ? (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Sucursal</Label>
              <Badge variant="secondary" className="gap-1.5">
                <Truck className="h-3.5 w-3.5" />
                {user?.location_name || "Asignada"}
              </Badge>
            </div>
          ) : (
            locations.length > 1 && (
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="pos-location"
                  className="text-sm text-muted-foreground"
                >
                  {isSale ? "Ubicación" : "Destino"}
                </Label>
                <select
                  id="pos-location"
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
            )
          )}
        </div>
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
            {filteredCategories.map((c) => (
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
                  .filter((c) => {
                    if (p.item_type === "bundle") return c.cart_key === bundleCartKey(p.id);
                    if (p.variants.length) return p.variants.some((v) => v.cart_key === c.cart_key);
                    return c.cart_key === serviceCartKey(p.id);
                  })
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
                      p.item_type === "bundle"
                        ? `${p.variantCount} productos`
                        : p.product_type === "service" && p.variantCount === 0
                        ? "Servicio"
                        : p.variantCount === 1 && !hasNamedVariants
                          ? "Prod. base"
                          : `${p.variantCount} ${p.variantCount === 1 ? "talla" : "tallas"}`
                    }
                    price={money(isSale ? p.base_price : p.cost)}
                    priceSuffix={isSale ? undefined : "costo"}
                    inCartCount={inCartCount}
                    onClick={() => {
                      if (p.item_type === "bundle") {
                        addBundleToCart(p);
                        return;
                      }
                      if (isSale && p.product_type === "service" && !p.variants.length) {
                        addServiceWithoutVariant(p);
                        return;
                      }
                      setSelectedProduct(p);
                    }}
                  />
                );
              })
            ) : (
              <p className="col-span-full px-3 py-12 text-center text-sm text-muted-foreground">
                {isSale
                  ? "Sin resultados con stock disponible."
                  : "Sin resultados."}
              </p>
            )}
          </div>
        </div>

        {/* ── Carrito / Orden ── */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Card className="sticky top-4 rounded-xl">
            <CardContent className="flex max-h-[calc(100vh-7rem)] flex-col gap-4 p-4">
              <div className="flex items-center gap-2 font-semibold">
                {isSale ? (
                  <ShoppingCart className="h-5 w-5" />
                ) : (
                  <PackagePlus className="h-5 w-5" />
                )}
                {isSale ? "Carrito" : "Orden de compra"}
                <Badge variant="secondary" className="ml-auto">
                  {itemCount}
                </Badge>
              </div>

              {/* Selector: cliente (venta) o proveedor (compra) */}
              {isSale ? (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      ref={customerSearchRef}
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        if (customerId) setCustomerId("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const num = customerSearch.trim();
                          if (!num) {
                            setCustomerId("");
                            return;
                          }
                          const found = customers.find(
                            (c) => c.id_number === num,
                          );
                          if (found) {
                            setCustomerId(String(found.id));
                            setCustomerSearch(
                              `${found.name}${found.id_number ? ` (${found.id_number})` : ""}`,
                            );
                            toast.success(`Cliente: ${found.name}`);
                            } else {
                              setCustomerByQuery(num);
                              setCustomerByOpen(true);
                            }
                        }
                      }}
                      placeholder="Cédula / Enter para buscar..."
                      className="h-9 pr-8"
                    />
                    <Search className="pointer-events-none absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    title="Nuevo cliente"
                    onClick={() => setQuickOpen(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                  {customerId && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 self-center text-xs cursor-pointer"
                      onClick={openEditCustomer}
                    >
                      <User className="mr-1 h-3 w-3" />
                      {selectedCustomer?.name || "Seleccionado"}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
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
              )}

              {/* Líneas del carrito */}
              <div className="-mx-1 flex-1 space-y-2 overflow-y-auto px-1">
                {cart.length ? (
                  cart.map((i) => {
                    const wholesaleApplies =
                      isSale &&
                      !!i.wholesale_price &&
                      i.wholesale_price > 0 &&
                      i.quantity >= i.wholesale_min_quantity;
                    return (
                      <div
                        key={i.cart_key}
                        className="flex items-center gap-2 rounded-lg border p-2"
                      >
                        <Thumb url={i.thumb} size="h-10 w-10" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {i.label}
                          </p>
                          {isSale ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                {money(i.unit_value)} c/u
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
                          ) : (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-[11px] text-muted-foreground">
                                Costo:
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={i.unit_value}
                                onChange={(e) =>
                                  setUnitValue(
                                    i.cart_key,
                                    Number(e.target.value) || 0,
                                  )
                                }
                                className="h-6 w-20 px-1.5 text-xs"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center rounded-md border">
                          <button
                            type="button"
                            className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setQuantity(i.cart_key, i.quantity - 1)
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <Input
                            type="number"
                            min={1}
                            max={isSale && !i.is_service ? i.max : undefined}
                            value={i.quantity}
                            onChange={(e) =>
                              setQuantity(
                                i.cart_key,
                                Number(e.target.value) || 1,
                              )
                            }
                            className="h-7 w-12 rounded-none border-0 px-1 text-center text-sm focus-visible:ring-0"
                          />
                          <button
                            type="button"
                            className="px-1.5 py-1 text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setQuantity(i.cart_key, i.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="w-16 text-right text-sm font-medium">
                          {money(i.unit_value * i.quantity)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem(i.cart_key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    {isSale
                      ? "Toca un producto para agregarlo a la venta."
                      : "Toca un producto para agregarlo a la compra."}
                  </p>
                )}
              </div>

              {/* Condiciones: pago (venta) o términos (compra) */}
              {isSale ? (
                <>
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Método de pago
                    </p>
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

                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Costo de envío
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setShippingCost(0)}
                        className={`rounded-md border py-1.5 text-sm font-medium transition-colors ${
                          shippingCost === 0
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        Gratis
                      </button>
                      <button
                        type="button"
                        onClick={() => setShippingCost(3)}
                        className={`rounded-md border py-1.5 text-sm font-medium transition-colors ${
                          shippingCost === 3
                            ? "border-primary bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
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
                          setShippingCost(
                            Math.max(0, Number(e.target.value) || 0),
                          )
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3 border-t pt-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Descuento
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        IVA
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tax}
                        onChange={(e) => setTax(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
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
                </div>
              )}

              {/* Total + acción */}
              <div className="space-y-3 border-t pt-3">
                {isSale && shippingCost > 0 && (
                  <div className="space-y-0.5 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{money(itemsTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Envío</span>
                      <span>{money(shippingCost)}</span>
                    </div>
                  </div>
                )}
                {!isSale && (discountNum > 0 || taxNum > 0) && (
                  <div className="space-y-0.5 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{money(itemsTotal)}</span>
                    </div>
                    {discountNum > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Descuento</span>
                        <span>-{money(discountNum)}</span>
                      </div>
                    )}
                    {taxNum > 0 && (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>IVA</span>
                        <span>{money(taxNum)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>

                {isSale ? (
                  <Button
                    className="h-11 w-full text-base"
                    disabled={cart.length === 0}
                    onClick={() => openConfirm()}
                  >
                    {cashOnDelivery
                      ? "Registrar pedido (contra entrega)"
                      : "Completar Venta"}
                  </Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full gap-1.5"
                      disabled={cart.length === 0}
                      onClick={() => openConfirm("draft")}
                    >
                      <Clock className="h-4 w-4" /> Guardar por recibir
                    </Button>
                    <Button
                      className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={cart.length === 0}
                      onClick={() => openConfirm("received")}
                    >
                      <CheckCircle className="h-4 w-4" /> Recibir
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Selector de variante ── */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.brand && `${selectedProduct.brand} · `}
              {isSale
                ? `Desde ${money(selectedProduct?.base_price ?? 0)} · Selecciona talla/color`
                : `Costo ${money(selectedProduct?.cost ?? 0)} · Selecciona talla/color`}
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
                <p className="mt-1.5 text-center text-xs text-muted-foreground">
                  Prod. base
                </p>
              </div>
            )}

            <div className="flex-1 space-y-2">
              {selectedProduct?.variants.map((v) => {
                const sizeLabel =
                  [v.size, v.color].filter(Boolean).join(" / ") ||
                  (v.is_service ? "Servicio" : "Producto base");
                const inCart = cart.find((c) => c.cart_key === v.cart_key);
                return (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                      inCart ? "border-primary/40 bg-primary/5" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Thumb url={v.thumb} size="h-8 w-8" />
                        <div>
                          <p className="font-medium text-sm">{sizeLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.is_service ? "Servicio" : `${v.stock} en stock`} ·{" "}
                            <span className="font-mono">{v.sku}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    {inCart ? (
                      <div className="flex items-center gap-0.5 rounded-md border bg-background">
                        <button
                          type="button"
                          className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setQuantity(v.cart_key, inCart.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {inCart.quantity}
                        </span>
                        <button
                          type="button"
                          className="px-2 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                          onClick={() => setQuantity(v.cart_key, inCart.quantity + 1)}
                          disabled={isSale && inCart.quantity >= inCart.max}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isSale && !v.is_service && v.stock <= 0}
                        onClick={() =>
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
                            wholesale_min_quantity:
                              selectedProduct.wholesale_min_quantity,
                            cost: selectedProduct.cost,
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

      {/* ── Nuevo proveedor rápido (compra) ── */}
      <Dialog open={supplierQuickOpen} onOpenChange={setSupplierQuickOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo proveedor</DialogTitle>
            <DialogDescription>
              Registra un proveedor y selecciónalo para esta compra.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="qs-name">Nombre *</Label>
              <Input
                id="qs-name"
                placeholder="Razón social o nombre comercial"
                value={supplierQuickForm.name}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qs-id-type">Documento *</Label>
                <select
                  id="qs-id-type"
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
                <Label htmlFor="qs-id-number">Número *</Label>
                <Input
                  id="qs-id-number"
                  placeholder="Identificación"
                  value={supplierQuickForm.id_number}
                  inputMode={
                    supplierQuickForm.id_type === "pasaporte" ? "text" : "numeric"
                  }
                  maxLength={
                    supplierQuickForm.id_type === "ruc"
                      ? 13
                      : supplierQuickForm.id_type === "cedula"
                        ? 10
                        : 20
                  }
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
              <Label htmlFor="qs-phone">Teléfono</Label>
              <Input
                id="qs-phone"
                placeholder="09XXXXXXXX"
                value={supplierQuickForm.phone}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qs-email">Correo electrónico</Label>
              <Input
                id="qs-email"
                type="email"
                placeholder="proveedor@ejemplo.com"
                value={supplierQuickForm.email}
                onChange={(e) =>
                  setSupplierQuickForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qs-city">Ciudad</Label>
              <Input
                id="qs-city"
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

      {/* ── Cliente no encontrado (venta) ── */}
      <AlertDialog
        open={customerByOpen}
        onOpenChange={(o) => {
          if (!o) setCustomerByOpen(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cliente no encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              No se encontró un cliente con cédula{" "}
              <strong>{customerByQuery}</strong>. ¿Deseas registrarlo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setCustomerByOpen(false);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCustomerByOpen(false);
                setQuickForm((f) => ({
                  ...f,
                  id_number: customerByQuery,
                  id_type: "cedula",
                }));
                setQuickOpen(true);
              }}
            >
              Registrar nuevo cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Nuevo cliente rápido (venta) ── */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Registra los datos básicos. Podrás completarlos después desde
              Clientes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="qc-name">Nombre *</Label>
              <Input
                id="qc-name"
                placeholder="Ej. María González"
                value={quickForm.name}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-id-number">Cédula / RUC</Label>
              <Input
                id="qc-id-number"
                placeholder="Número de identificación"
                value={quickForm.id_number}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, id_number: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-phone">Teléfono *</Label>
              <Input
                id="qc-phone"
                placeholder="09XXXXXXXX"
                value={quickForm.phone}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-email">Correo electrónico *</Label>
              <Input
                id="qc-email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={quickForm.email}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-city">Ciudad</Label>
              <Input
                id="qc-city"
                placeholder="Guayaquil"
                value={quickForm.city}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, city: e.target.value }))
                }
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

      {/* ── Editar cliente (venta) ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="ec-name">Nombre *</Label>
              <Input
                id="ec-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Teléfono *</Label>
              <Input
                id="ec-phone"
                placeholder="09XXXXXXXX"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-email">Correo electrónico *</Label>
              <Input
                id="ec-email"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-city">Ciudad</Label>
              <Input
                id="ec-city"
                placeholder="Guayaquil"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, city: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-id-number">Cédula / RUC</Label>
              <Input
                id="ec-id-number"
                placeholder="Número de identificación"
                value={editForm.id_number}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, id_number: e.target.value }))
                }
              />
            </div>
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

      {/* ── Confirmación ── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isSale
                ? "Confirmar venta"
                : confirmStatus === "received"
                  ? "Recibir mercancía"
                  : "Guardar por recibir"}
            </DialogTitle>
            <DialogDescription>
              Revisa el resumen antes de registrar.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {isSale ? "Cliente" : "Proveedor"}
              </span>
              <span className="font-medium">
                {isSale
                  ? selectedCustomer?.name || "Consumidor final"
                  : selectedSupplier?.name || "Sin proveedor"}
              </span>
            </div>
            {!isSale && reference && (
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

            {isSale && shippingCost > 0 && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{money(itemsTotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Envío</span>
                  <span>{money(shippingCost)}</span>
                </div>
              </div>
            )}
            {!isSale && (discountNum > 0 || taxNum > 0) && (
              <div className="space-y-1 text-sm">
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
                  <span className="text-muted-foreground">
                    {isSale ? "Ubicación" : "Destino"}
                  </span>
                  <span className="font-medium">
                    {locations.find((l) => String(l.id) === locationId)?.name}
                  </span>
                </div>
              )}
              {isSale ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Método de pago
                    </span>
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
                      className={`font-medium ${cashOnDelivery ? "text-amber-600" : "text-emerald-600"}`}
                    >
                      {cashOnDelivery ? "Pendiente" : "Completada"}
                    </span>
                  </div>
                </>
              ) : (
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
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {isSale && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handlePrintTicket}
                disabled={cart.length === 0}
              >
                <Printer className="h-4 w-4" /> Imprimir / PDF
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Volver a editar
              </Button>
              <Button
                onClick={isSale ? submitSale : submitPurchase}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Procesando..." : "Confirmar y registrar"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
