// Tipos del dominio de Inventario y Ventas (Tienda)
// Las claves siguen snake_case para coincidir con la API.

export interface Category {
  id: number;
  name: string;
  description?: string | null;
  active: boolean;
  parent_id?: number | null;
  parent_name?: string | null;
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

export interface Location {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_default: boolean;
  active: boolean;
  stock_total?: number;
  created_at: string;
  updated_at: string;
}

export interface VariantStockLevel {
  location_id: number;
  location_name: string;
  quantity: number;
}

export interface ProductVariant {
  id: number;
  size?: string | null;
  color?: string | null;
  stock: number;
  sku: string;
  low_stock?: boolean;
  out_of_stock?: boolean;
  stock_by_location?: VariantStockLevel[];
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
  email?: string | null;
  is_customer?: boolean;
  is_supplier?: boolean;
  credit_limit?: number;
  payment_term_days?: number | null;
  receivable?: number;
  payable?: number;
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
  shipping_cost?: number;
  sold_at: string | null;
  customer_id: number | null;
  customer_name?: string | null;
  location_id?: number | null;
  location_name?: string | null;
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
  location_id?: number | null;
  status?: SaleStatus;
  payment_method?: PaymentMethod;
  cash_on_delivery?: boolean;
  shipping_cost?: number;
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

// ---- Compras / Proveedores ----
export type PurchaseStatus = "draft" | "received" | "cancelled";
export type PaymentStatus = "due" | "partial" | "paid";

export interface PurchaseItem {
  id: number;
  product_variant_id: number;
  sku: string;
  product_name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

export interface Purchase {
  id: number;
  status: PurchaseStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid_amount: number;
  balance_due: number;
  purchase_date: string | null;
  due_date: string | null;
  reference?: string | null;
  notes?: string | null;
  supplier_id: number | null;
  supplier_name?: string | null;
  location_id?: number | null;
  location_name?: string | null;
  created_by?: string | null;
  items_count: number;
  items?: PurchaseItem[];
  created_at: string;
}

export interface PurchaseItemInput {
  product_variant_id: number;
  quantity: number;
  unit_cost: number;
}

export interface CreatePurchaseData {
  customer_id?: number | null;
  location_id?: number | null;
  status?: PurchaseStatus;
  discount?: number;
  tax?: number;
  paid_amount?: number;
  due_date?: string | null;
  reference?: string | null;
  notes?: string | null;
  items: PurchaseItemInput[];
}

// ---- Gastos ----
export interface ExpenseCategory {
  id: number;
  name: string;
  active: boolean;
  is_payroll?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  fullname: string;
}

export interface Expense {
  id: number;
  amount: number;
  expense_date: string | null;
  description?: string | null;
  payment_method: PaymentMethod;
  reference?: string | null;
  expense_category_id: number | null;
  category_name?: string | null;
  is_payroll?: boolean;
  location_id?: number | null;
  location_name?: string | null;
  employee_id?: number | null;
  employee_name?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseInput {
  expense_category_id?: number | null;
  location_id?: number | null;
  amount: number;
  expense_date?: string | null;
  description?: string | null;
  payment_method?: PaymentMethod;
  reference?: string | null;
  employee_id?: number | null;
}

// ---- Informes avanzados ----
export interface PurchaseReport {
  summary: { total_today: number; total_week: number; total_month: number; payable: number };
  by_supplier: { supplier: string; total: number; count: number }[];
  by_month: { month: string; label: string; total: number; count: number }[];
}

export interface TaxReport {
  by_month: {
    month: string;
    label: string;
    sales_total: number;
    tax_collected: number;
    tax_paid: number;
    net_tax: number;
  }[];
}

export interface ContactReportRow {
  id: number;
  name: string;
  is_customer: boolean;
  is_supplier: boolean;
  total_purchased_by: number;
  total_sold_to_us: number;
  receivable: number;
  payable: number;
  balance: number;
  last_transaction: string | null;
}

export interface ExpenseReport {
  summary: { total_today: number; total_week: number; total_month: number };
  by_category: { category: string; total: number }[];
  by_location: { location: string; total: number }[];
  by_month: { month: string; label: string; total: number }[];
}

export interface CashRegisterReport {
  summary: {
    income_today: number;
    expense_today: number;
    net_today: number;
    income_month: number;
    expense_month: number;
  };
  by_day: { date: string; day: string; income: number; expense: number; net: number }[];
}

export interface SalesRepRow {
  user_id: number | null;
  seller: string;
  revenue: number;
  sales_count: number;
  profit: number;
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
