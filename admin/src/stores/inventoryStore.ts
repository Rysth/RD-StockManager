import { create } from "zustand";
import api from "../utils/api";
import type {
  Category,
  Product,
  LowStockVariant,
  InventoryStats,
  Pagination,
} from "../types/inventory";

interface ProductFilters {
  search?: string;
  category_id?: number | string;
  active?: boolean | string;
}

interface ProductInput {
  name: string;
  brand?: string;
  base_price: number;
  description?: string;
  active?: boolean;
  category_id: number;
  product_variants_attributes?: {
    id?: number;
    size?: string;
    color?: string;
    stock?: number;
    _destroy?: boolean;
  }[];
}

interface CategoryInput {
  name: string;
  description?: string;
  active?: boolean;
}

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  total_pages: 1,
  total_count: 0,
  per_page: 12,
};

// Traduce un error de axios a un mensaje en español
function toMessage(error: any, fallback: string): string {
  if (error.response?.status === 429)
    return "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.";
  if (error.response?.status === 403)
    return "No tienes permisos para realizar esta acción.";
  if (error.response?.data?.errors?.length)
    return error.response.data.errors.join(", ");
  if (error.response?.data?.message) return error.response.data.message;
  if (!error.response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

interface InventoryState {
  products: Product[];
  categories: Category[];
  lowStock: LowStockVariant[];
  stats: InventoryStats | null;
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
  currentFilters: ProductFilters;

  fetchProducts: (page?: number, perPage?: number, filters?: ProductFilters) => Promise<void>;
  createProduct: (data: ProductInput) => Promise<void>;
  updateProduct: (id: number, data: ProductInput) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  fetchLowStock: () => Promise<void>;

  fetchCategories: () => Promise<void>;
  createCategory: (data: CategoryInput) => Promise<void>;
  updateCategory: (id: number, data: CategoryInput) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  fetchStats: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  categories: [],
  lowStock: [],
  stats: null,
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,
  currentFilters: {},

  fetchProducts: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: any = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.active !== undefined && filters.active !== "")
        params.active = filters.active;

      const response = await api.get("/api/v1/products", { params });
      set({
        products: response.data.products,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener los productos"), isLoading: false });
      throw error;
    }
  },

  createProduct: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/products", { product: data });
      const { pagination, currentFilters } = get();
      await get().fetchProducts(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error: any) {
      const msg = toMessage(error, "Error al crear el producto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateProduct: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/products/${id}`, { product: data });
      const { pagination, currentFilters } = get();
      await get().fetchProducts(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error: any) {
      const msg = toMessage(error, "Error al actualizar el producto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/products/${id}`);
      const { pagination, currentFilters, products } = get();
      const page =
        products.length === 1 && pagination.current_page > 1
          ? pagination.current_page - 1
          : pagination.current_page;
      await get().fetchProducts(page, pagination.per_page, currentFilters);
    } catch (error: any) {
      const msg = toMessage(error, "Error al eliminar el producto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchLowStock: async () => {
    set({ error: null });
    try {
      const response = await api.get("/api/v1/products/low_stock");
      set({ lowStock: response.data.variants });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener el stock bajo") });
    }
  },

  fetchCategories: async () => {
    set({ error: null });
    try {
      const response = await api.get("/api/v1/categories", { params: { per_page: 100 } });
      set({ categories: response.data.categories });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener las categorías") });
    }
  },

  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/categories", { category: data });
      await get().fetchCategories();
      set({ isLoading: false });
    } catch (error: any) {
      const msg = toMessage(error, "Error al crear la categoría");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/categories/${id}`, { category: data });
      await get().fetchCategories();
      set({ isLoading: false });
    } catch (error: any) {
      const msg = toMessage(error, "Error al actualizar la categoría");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/categories/${id}`);
      await get().fetchCategories();
      set({ isLoading: false });
    } catch (error: any) {
      const msg = toMessage(error, "Error al eliminar la categoría");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchStats: async () => {
    set({ error: null });
    try {
      const response = await api.get("/api/v1/inventory/stats");
      set({ stats: response.data.stats });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener las estadísticas") });
    }
  },
}));
