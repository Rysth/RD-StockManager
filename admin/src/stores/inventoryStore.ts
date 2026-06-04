import { create } from "zustand";
import api from "../utils/api";
import type {
  Brand,
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
  product_type?: "good" | "service";
}

interface ProductInput {
  name: string;
  product_type?: "good" | "service";
  brand_id?: number | null;
  base_price: number;
  cost?: number;
  wholesale_price?: number | null;
  wholesale_min_quantity?: number;
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
  parent_id?: number | null;
}

interface BrandInput {
  name: string;
  description?: string;
  active?: boolean;
}

export interface ImportResult {
  rows: number;
  products_created: number;
  variants_created: number;
  errors: string[];
}

type ApiError = {
  response?: {
    status?: number;
    data?: {
      errors?: string[];
      message?: string;
    };
  };
};

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  total_pages: 1,
  total_count: 0,
  per_page: 12,
};

// Traduce un error de axios a un mensaje en español
function toMessage(error: unknown, fallback: string): string {
  const response = (error as ApiError).response;

  if (response?.status === 429)
    return "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.";
  if (response?.status === 403)
    return "No tienes permisos para realizar esta acción.";
  if (response?.data?.errors?.length) return response.data.errors.join(", ");
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

interface InventoryState {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  lowStock: LowStockVariant[];
  stats: InventoryStats | null;
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
  currentFilters: ProductFilters;

  fetchProducts: (page?: number, perPage?: number, filters?: ProductFilters) => Promise<void>;
  createProduct: (data: ProductInput) => Promise<Product>;
  updateProduct: (id: number, data: ProductInput) => Promise<Product>;
  deleteProduct: (id: number) => Promise<void>;
  fetchLowStock: () => Promise<void>;
  uploadProductImages: (id: number, files: File[]) => Promise<void>;
  deleteProductImage: (id: number, imageId: number) => Promise<void>;
  uploadVariantImages: (variantId: number, files: File[]) => Promise<void>;
  deleteVariantImage: (variantId: number, imageId: number) => Promise<void>;
  importProducts: (file: File) => Promise<ImportResult>;
  downloadImportTemplate: () => Promise<void>;
  exportProducts: (locationId?: number) => Promise<void>;

  fetchCategories: () => Promise<void>;
  createCategory: (data: CategoryInput) => Promise<void>;
  updateCategory: (id: number, data: CategoryInput) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;

  fetchBrands: () => Promise<void>;
  createBrand: (data: BrandInput) => Promise<void>;
  updateBrand: (id: number, data: BrandInput) => Promise<void>;
  deleteBrand: (id: number) => Promise<void>;

  fetchStats: () => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  lowStock: [],
  stats: null,
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,
  currentFilters: {},

  fetchProducts: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: Record<string, string | number | boolean> = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.category_id) params.category_id = filters.category_id;
      if (filters.product_type) params.product_type = filters.product_type;
      if (filters.active !== undefined && filters.active !== "")
        params.active = filters.active;

      const response = await api.get("/api/v1/products", { params });
      set({
        products: response.data.products,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener los productos"), isLoading: false });
      throw error;
    }
  },

  createProduct: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/api/v1/products", { product: data });
      const { pagination, currentFilters } = get();
      await get().fetchProducts(pagination.current_page, pagination.per_page, currentFilters);
      return response.data.product as Product;
    } catch (error) {
      const msg = toMessage(error, "Error al crear el producto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateProduct: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/api/v1/products/${id}`, { product: data });
      const { pagination, currentFilters } = get();
      await get().fetchProducts(pagination.current_page, pagination.per_page, currentFilters);
      return response.data.product as Product;
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar el producto");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  uploadProductImages: async (id, files) => {
    if (!files.length) return;
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images[]", f));
      await api.post(`/api/v1/products/${id}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      throw new Error(toMessage(error, "Error al subir las imágenes"));
    }
  },

  deleteProductImage: async (id, imageId) => {
    try {
      await api.delete(`/api/v1/products/${id}/images/${imageId}`);
    } catch (error) {
      throw new Error(toMessage(error, "Error al eliminar la imagen"));
    }
  },

  uploadVariantImages: async (variantId, files) => {
    if (!files.length) return;
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images[]", f));
      await api.post(`/api/v1/product_variants/${variantId}/images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      throw new Error(toMessage(error, "Error al subir las imágenes de la variante"));
    }
  },

  deleteVariantImage: async (variantId, imageId) => {
    try {
      await api.delete(`/api/v1/product_variants/${variantId}/images/${imageId}`);
    } catch (error) {
      throw new Error(toMessage(error, "Error al eliminar la imagen"));
    }
  },

  importProducts: async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post("/api/v1/products/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { pagination, currentFilters } = get();
      await get().fetchProducts(1, pagination.per_page, currentFilters);
      return response.data as ImportResult;
    } catch (error) {
      throw new Error(toMessage(error, "Error al importar los productos"));
    }
  },

  downloadImportTemplate: async () => {
    try {
      const response = await api.get("/api/v1/products/import_template", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "plantilla_productos.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(toMessage(error, "Error al descargar la plantilla"));
    }
  },

  exportProducts: async (locationId) => {
    try {
      const response = await api.get("/api/v1/products/export", {
        params: locationId ? { location_id: locationId } : {},
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", locationId ? `inventario_${locationId}.xlsx` : "inventario_general.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(toMessage(error, "Error al exportar el inventario"));
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
    } catch (error) {
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
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el stock bajo") });
    }
  },

  fetchCategories: async () => {
    set({ error: null });
    try {
      const response = await api.get("/api/v1/categories", { params: { per_page: 100 } });
      set({ categories: response.data.categories });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las categorías") });
    }
  },

  createCategory: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/categories", { category: data });
      await get().fetchCategories();
      set({ isLoading: false });
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      const msg = toMessage(error, "Error al archivar la categoría");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchBrands: async () => {
    set({ error: null });
    try {
      const response = await api.get("/api/v1/brands", { params: { per_page: 100 } });
      set({ brands: response.data.brands });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las marcas") });
    }
  },

  createBrand: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/brands", { brand: data });
      await get().fetchBrands();
      set({ isLoading: false });
    } catch (error) {
      const msg = toMessage(error, "Error al crear la marca");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateBrand: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/brands/${id}`, { brand: data });
      await get().fetchBrands();
      set({ isLoading: false });
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar la marca");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteBrand: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/brands/${id}`);
      await get().fetchBrands();
      set({ isLoading: false });
    } catch (error) {
      const msg = toMessage(error, "Error al archivar la marca");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchStats: async () => {
    set({ error: null });
    try {
      const response = await api.get("/api/v1/inventory/stats");
      set({ stats: response.data.stats });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las estadísticas") });
    }
  },
}));
