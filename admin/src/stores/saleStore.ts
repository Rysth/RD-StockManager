import { create } from "zustand";
import api from "../utils/api";
import type {
  Sale,
  SaleStatus,
  CreateSaleData,
  SaleItemInput,
  Invoice,
  SalesReport,
  Pagination,
} from "../types/inventory";

interface SaleFilters {
  search?: string;
  status?: SaleStatus | "";
  location_id?: number | "";
  user_id?: number | "";
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
      errors?: Array<string | { mensaje?: string; message?: string }>;
      message?: string;
      invoice?: Invoice;
    };
  };
};

function applyInvoiceState(state: SaleState, id: number, invoice: Invoice) {
  return {
    sales: state.sales.map((sale) =>
      sale.id === id ? { ...sale, invoice } : sale,
    ),
    selectedSale:
      state.selectedSale?.id === id
        ? { ...state.selectedSale, invoice }
        : state.selectedSale,
  };
}

function toMessage(error: unknown, fallback: string): string {
  const response = (error as ApiError).response;

  if (response?.status === 429)
    return "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.";
  if (response?.status === 403)
    return "No tienes permisos para realizar esta acción.";
  if (response?.data?.errors?.length) {
    return response.data.errors
      .map((err) =>
        typeof err === "string"
          ? err
          : err?.mensaje || err?.message || String(err),
      )
      .join(", ");
  }
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
) {
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

  fetchSales: (
    page?: number,
    perPage?: number,
    filters?: SaleFilters,
  ) => Promise<void>;
  fetchSale: (id: number) => Promise<void>;
  clearSelectedSale: () => void;
  createSale: (data: CreateSaleData) => Promise<Sale>;
  updateSaleStatus: (id: number, status: SaleStatus) => Promise<void>;
  updateSale: (id: number, data: Partial<CreateSaleData>) => Promise<Sale>;
  syncSaleItems: (id: number, items: SaleItemInput[]) => Promise<Sale>;
  deleteSale: (id: number) => Promise<void>;
  issueInvoice: (id: number) => Promise<Invoice>;
  sendInvoiceEmail: (id: number, email?: string) => Promise<void>;
  downloadInvoiceXml: (id: number) => Promise<void>;
  downloadInvoiceRide: (id: number) => Promise<void>;
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
      const params: Record<string, string | number> = {
        page,
        per_page: perPage,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.location_id) params.location_id = filters.location_id;
      if (filters.user_id) params.user_id = filters.user_id;
      const response = await api.get("/api/v1/sales", { params });
      set({
        sales: response.data.sales,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: toMessage(error, "Error al obtener las ventas"),
        isLoading: false,
      });
      throw error;
    }
  },

  fetchSale: async (id) => {
    set({ isLoadingDetail: true, error: null, selectedSale: null });
    try {
      const response = await api.get(`/api/v1/sales/${id}`);
      set({ selectedSale: response.data.sale as Sale, isLoadingDetail: false });
    } catch (error) {
      set({
        error: toMessage(error, "Error al obtener la venta"),
        isLoadingDetail: false,
      });
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
      await get().fetchSales(
        1,
        get().pagination.per_page,
        get().currentFilters,
      );
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
      await get().fetchSales(
        pagination.current_page,
        pagination.per_page,
        currentFilters,
      );
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar la venta");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateSale: async (id, data) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.put(`/api/v1/sales/${id}`, {
        sale: {
          customer_id: data.customer_id ?? null,
          location_id: data.location_id ?? null,
          payment_method: data.payment_method,
          cash_on_delivery: data.cash_on_delivery,
          shipping_cost: data.shipping_cost,
        },
      });
      const sale = response.data.sale as Sale;
      set((state) => ({
        selectedSale: state.selectedSale?.id === id ? sale : state.selectedSale,
        sales: state.sales.map((s) => (s.id === id ? sale : s)),
        isSubmitting: false,
      }));
      return sale;
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar la venta");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  syncSaleItems: async (id, items) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.put(`/api/v1/sales/${id}/sync_items`, {
        items,
      });
      const sale = response.data.sale as Sale;
      set((state) => ({
        selectedSale: state.selectedSale?.id === id ? sale : state.selectedSale,
        sales: state.sales.map((s) => (s.id === id ? sale : s)),
        isSubmitting: false,
      }));
      return sale;
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar los items");
      set({ error: msg, isSubmitting: false });
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

  issueInvoice: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post(`/api/v1/sales/${id}/invoice`);
      const invoice = response.data.invoice as Invoice;
      set((state) => ({
        ...applyInvoiceState(state, id, invoice),
        isSubmitting: false,
      }));
      return invoice;
    } catch (error) {
      const invoice = (error as ApiError).response?.data?.invoice;
      if (invoice) {
        set((state) => ({
          ...applyInvoiceState(state, id, invoice),
          isSubmitting: false,
        }));
        return invoice;
      }
      const msg = toMessage(error, "Error al emitir la factura electrónica");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  sendInvoiceEmail: async (id, email) => {
    try {
      const data = email ? { email } : {};
      await api.post(`/api/v1/sales/${id}/send_invoice_email`, data);
    } catch (error) {
      throw new Error(
        toMessage(error, "Error al enviar el correo de la factura"),
      );
    }
  },

  downloadInvoiceXml: async (id) => {
    try {
      const response = await api.get(`/api/v1/sales/${id}/invoice_xml`, {
        responseType: "blob",
      });
      const saleCode = get().selectedSale?.code ?? `VTA-${id}`;
      downloadBlob(
        response.data,
        filenameFromDisposition(
          response.headers["content-disposition"],
          `Factura_${saleCode}.xml`,
        ),
      );
    } catch (error) {
      throw new Error(toMessage(error, "Error al descargar el XML autorizado"));
    }
  },

  downloadInvoiceRide: async (id) => {
    try {
      const response = await api.get(`/api/v1/sales/${id}/invoice_ride`, {
        responseType: "blob",
      });
      const saleCode = get().selectedSale?.code ?? `VTA-${id}`;
      downloadBlob(
        response.data,
        filenameFromDisposition(
          response.headers["content-disposition"],
          `RIDE_${saleCode}.pdf`,
        ),
      );
    } catch (error) {
      throw new Error(toMessage(error, "Error al descargar el RIDE"));
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
      set({
        error: toMessage(error, "Error al obtener el reporte"),
        isLoading: false,
      });
    }
  },
}));
