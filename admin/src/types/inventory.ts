// Tipos del dominio de Inventario y Ventas (Tienda)
// Las claves siguen snake_case para coincidir con la API.

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  products_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  products_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  url: string;
}

export interface ProductVariant {
  id: number;
  size?: string | null;
  color?: string | null;
  stock: number;
  sku: string;
  low_stock?: boolean;
  out_of_stock?: boolean;
  images?: ProductImage[];
}

export interface Product {
  id: number;
  name: string;
  brand_id?: number | null;
  brand?: string | null;
  base_price: number;
  cost: number;
  wholesale_price?: number | null;
  wholesale_min_quantity: number;
  description?: string | null;
  active: boolean;
  category_id: number;
  category?: string | null;
  total_stock: number;
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface LowStockVariant {
  id: number;
  sku: string;
  size?: string | null;
  color?: string | null;
  stock: number;
  product_id: number;
  product_name: string;
  brand?: string | null;
  category?: string | null;
}

export type IdType = "cedula" | "pasaporte" | "ruc" | "";

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  city?: string | null;
  id_type?: IdType | null;
  id_number?: string | null;
  country?: string | null;
  address?: string | null;
  active?: boolean;
  sales_count?: number;
  created_at: string;
  updated_at: string;
}

export type SaleStatus = "pending" | "completed" | "cancelled";
export type PaymentMethod = "cash" | "transfer";

export interface SaleItem {
  id: number;
  product_variant_id: number;
  sku: string;
  product_name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  subtotal: number;
  profit?: number;
}

export interface Sale {
  id: number;
  status: SaleStatus;
  total: number;
  sold_at: string | null;
  customer_id: number | null;
  customer_name?: string | null;
  seller?: string | null;
  payment_method?: PaymentMethod;
  cash_on_delivery?: boolean;
  items_count: number;
  items?: SaleItem[];
  profit?: number;
  created_at: string;
}

// Payload para crear una venta
export interface SaleItemInput {
  product_variant_id: number;
  quantity: number;
  unit_price: number;
}

export interface CreateSaleData {
  customer_id?: number | null;
  status?: SaleStatus;
  payment_method?: PaymentMethod;
  cash_on_delivery?: boolean;
  items: SaleItemInput[];
}

export interface SalesReport {
  summary: {
    revenue_today: number;
    revenue_week: number;
    revenue_month: number;
    sales_today: number;
    profit_today: number;
    profit_week: number;
    profit_month: number;
  };
  total_profit: number;
  sales_by_day: { date: string; day: string; revenue: number }[];
  top_products: { name: string; brand?: string | null; units_sold: number; revenue: number }[];
  revenue_by_month: { month: string; label: string; revenue: number; profit: number; count: number }[];
}

export interface InventoryStats {
  total_products: number;
  active_products: number;
  total_variants: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_customers: number;
  total_categories: number;
  revenue_today: number;
  sales_today: number;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_count: number;
  per_page: number;
}
