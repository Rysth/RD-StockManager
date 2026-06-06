import { ImageIcon } from "lucide-react";

export const money = (n: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
    n || 0,
  );

export const isServiceProduct = (product: { product_type?: string | null }) =>
  ["service", "servicio"].includes(
    String(product.product_type ?? "").toLowerCase(),
  );

export function Thumb({ url, size = "h-9 w-9" }: { url?: string; size?: string }) {
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

export function parseVariantLabel(label: string): { name: string; variant: string | null } {
  const sep = " — ";
  const idx = label.indexOf(sep);
  if (idx === -1) return { name: label, variant: null };
  return {
    name: label.slice(0, idx),
    variant: label.slice(idx + sep.length),
  };
}

export interface CatalogItem {
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
