import { create } from "zustand";
import api from "../utils/api";
import type {
  Sale,
  SaleStatus,
  CreateSaleData,
  SalesReport,
  Pagination,
} from "../types/inventory";

interface SaleFilters {
  search?: string;
  status?: SaleStatus | "";
}

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  total_pages: 1,
  total_count: 0,
  per_page: 12,
};

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

interface SaleState {
  sales: Sale[];
  pagination: Pagination;
  report: SalesReport | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  currentFilters: SaleFilters;

  fetchSales: (page?: number, perPage?: number, filters?: SaleFilters) => Promise<void>;
  createSale: (data: CreateSaleData) => Promise<Sale>;
  updateSaleStatus: (id: number, status: SaleStatus) => Promise<void>;
  deleteSale: (id: number) => Promise<void>;
  fetchReport: () => Promise<void>;
}

export const useSaleStore = create<SaleState>((set, get) => ({
  sales: [],
  pagination: DEFAULT_PAGINATION,
  report: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  currentFilters: {},

  fetchSales: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: any = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      const response = await api.get("/api/v1/sales", { params });
      set({
        sales: response.data.sales,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener las ventas"), isLoading: false });
      throw error;
    }
  },

  createSale: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post("/api/v1/sales", {
        sale: { customer_id: data.customer_id ?? null, status: data.status ?? "completed" },
        items: data.items,
      });
      set({ isSubmitting: false });
      // Refrescar primera página
      await get().fetchSales(1, get().pagination.per_page, get().currentFilters);
      return response.data.sale as Sale;
    } catch (error: any) {
      const msg = toMessage(error, "Error al registrar la venta");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  updateSaleStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/sales/${id}`, { sale: { status } });
      const { pagination, currentFilters } = get();
      await get().fetchSales(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error: any) {
      const msg = toMessage(error, "Error al actualizar la venta");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteSale: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/sales/${id}`);
      const { pagination, currentFilters, sales } = get();
      const page =
        sales.length === 1 && pagination.current_page > 1
          ? pagination.current_page - 1
          : pagination.current_page;
      await get().fetchSales(page, pagination.per_page, currentFilters);
    } catch (error: any) {
      const msg = toMessage(error, "Error al eliminar la venta");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchReport: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/api/v1/sales/report");
      set({
        report: {
          summary: response.data.summary,
          sales_by_day: response.data.sales_by_day,
          top_products: response.data.top_products,
          revenue_by_month: response.data.revenue_by_month,
        },
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener el reporte"), isLoading: false });
    }
  },
}));
