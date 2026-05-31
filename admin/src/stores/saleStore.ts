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

type ApiError = {
  response?: {
    status?: number;
    data?: {
      errors?: string[];
      message?: string;
    };
  };
};

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

interface SaleState {
  sales: Sale[];
  pagination: Pagination;
  report: SalesReport | null;
  selectedSale: Sale | null;
  isLoading: boolean;
  isLoadingDetail: boolean;
  isSubmitting: boolean;
  error: string | null;
  currentFilters: SaleFilters;

  fetchSales: (page?: number, perPage?: number, filters?: SaleFilters) => Promise<void>;
  fetchSale: (id: number) => Promise<void>;
  clearSelectedSale: () => void;
  createSale: (data: CreateSaleData) => Promise<Sale>;
  updateSaleStatus: (id: number, status: SaleStatus) => Promise<void>;
  deleteSale: (id: number) => Promise<void>;
  fetchReport: () => Promise<void>;
}

export const useSaleStore = create<SaleState>((set, get) => ({
  sales: [],
  pagination: DEFAULT_PAGINATION,
  report: null,
  selectedSale: null,
  isLoading: false,
  isLoadingDetail: false,
  isSubmitting: false,
  error: null,
  currentFilters: {},

  fetchSales: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      const response = await api.get("/api/v1/sales", { params });
      set({
        sales: response.data.sales,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las ventas"), isLoading: false });
      throw error;
    }
  },

  fetchSale: async (id) => {
    set({ isLoadingDetail: true, error: null, selectedSale: null });
    try {
      const response = await api.get(`/api/v1/sales/${id}`);
      set({ selectedSale: response.data.sale as Sale, isLoadingDetail: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener la venta"), isLoadingDetail: false });
    }
  },

  clearSelectedSale: () => set({ selectedSale: null }),

  createSale: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post("/api/v1/sales", {
        sale: {
          customer_id: data.customer_id ?? null,
          location_id: data.location_id ?? null,
          status: data.status ?? "completed",
          payment_method: data.payment_method ?? "cash",
          cash_on_delivery: data.cash_on_delivery ?? false,
          shipping_cost: data.shipping_cost ?? 0,
        },
        items: data.items,
      });
      set({ isSubmitting: false });
      // Refrescar primera página
      await get().fetchSales(1, get().pagination.per_page, get().currentFilters);
      return response.data.sale as Sale;
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
          total_profit: response.data.total_profit,
          sales_by_day: response.data.sales_by_day,
          top_products: response.data.top_products,
          revenue_by_month: response.data.revenue_by_month,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener el reporte"), isLoading: false });
    }
  },
}));
