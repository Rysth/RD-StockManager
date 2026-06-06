import { useState } from "react";
import toast from "react-hot-toast";
import type { Product, ProductVariant } from "../types/inventory";

/**
 * Busca una variante por SKU exacto (trim, case-insensitive) entre los
 * productos. Útil para lectores de código de barras / tecleo rápido en el POS.
 */
export function findVariantBySku(
  products: Product[],
  sku: string,
): { product: Product; variant: ProductVariant } | null {
  const q = sku.trim().toLowerCase();
  if (!q) return null;
  for (const product of products) {
    const variant = product.variants.find(
      (v) => (v.sku ?? "").toLowerCase() === q,
    );
    if (variant) return { product, variant };
  }
  return null;
}

/** Clases de color para un badge de stock (verde / ámbar / rojo). */
export function stockTone(stock: number): string {
  if (stock <= 0) return "bg-red-100 text-red-800";
  if (stock <= 5) return "bg-amber-100 text-amber-800";
  return "bg-green-100 text-green-800";
}

export interface CartItem {
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
  max: number;
  unit_value: number;
  value_edited: boolean;
  discount: number;
  applies_iva: boolean;
}

export interface VariantOption {
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

export interface CatalogBundle {
  id: number;
  name: string;
  base_price: number;
  cost: number;
  available_stock: number;
  thumb?: string;
}

export const variantCartKey = (id: number) => `variant:${id}`;
export const serviceCartKey = (id: number) => `service:${id}`;
export const bundleCartKey = (id: number) => `bundle:${id}`;

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

export function stockAt(variant: ProductVariant, locationId: string): number {
  if (locationId && variant.stock_by_location?.length) {
    const found = variant.stock_by_location.find(
      (sl) => String(sl.location_id) === locationId,
    );
    return found ? found.quantity : 0;
  }
  return variant.stock;
}

export function usePosCart(mode: "sale" | "purchase" | "transfer") {
  const [cart, setCart] = useState<CartItem[]>([]);

  function withQuantity(item: CartItem, quantity: number): CartItem {
    const cap = mode === "purchase" ? Number.MAX_SAFE_INTEGER : item.max;
    const q = Math.max(1, Math.min(quantity, cap));
    const next = { ...item, quantity: q };
    if (mode === "sale" && !item.value_edited)
      next.unit_value = suggestedPrice(next);
    return next;
  }

  const addToCart = (v: VariantOption) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.cart_key === v.cart_key);
      if (existing) {
        if (
          (mode === "sale" || mode === "transfer") &&
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
      if ((mode === "sale" || mode === "transfer") && !v.is_service && v.stock <= 0) {
        toast.error("Sin stock disponible");
        return prev;
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
        discount: 0,
        applies_iva: mode !== "sale",
      };
      return [...prev, withQuantity(base, 1)];
    });
  };

  const addBundleToCart = (bundle: CatalogBundle) => {
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
          discount: 0,
          applies_iva: mode !== "sale",
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
        i.cart_key === key
          ? { ...i, unit_value: value, value_edited: true }
          : i,
      ),
    );

  const resetUnitValue = (key: string) =>
    setCart((prev) =>
      prev.map((i) =>
        i.cart_key === key
          ? { ...i, unit_value: suggestedPrice(i), value_edited: false }
          : i,
      ),
    );

  const setItemDiscount = (key: string, value: number) =>
    setCart((prev) =>
      prev.map((i) =>
        i.cart_key === key
          ? { ...i, discount: Math.max(0, Math.min(value, i.unit_value)) }
          : i,
      ),
    );

  const toggleItemIva = (key: string) =>
    setCart((prev) =>
      prev.map((i) =>
        i.cart_key === key ? { ...i, applies_iva: !i.applies_iva } : i,
      ),
    );

  const removeItem = (key: string) =>
    setCart((prev) => prev.filter((i) => i.cart_key !== key));

  const clearCart = () => setCart([]);

  const itemsTotal = cart.reduce(
    (sum, i) => sum + (i.unit_value - i.discount) * i.quantity,
    0,
  );
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return {
    cart,
    setCart,
    addToCart,
    addBundleToCart,
    addServiceWithoutVariant,
    setQuantity,
    setUnitValue,
    resetUnitValue,
    setItemDiscount,
    toggleItemIva,
    removeItem,
    clearCart,
    itemsTotal,
    itemCount,
  };
}
