import { create } from "zustand";
import api from "../utils/api";
import type { Pagination } from "../types/inventory";

export type QuotationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";

export interface QuotationItem {
  id?: number;
  product_variant_id?: number | null;
  sku?: string | null;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  total?: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  status: QuotationStatus;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  // Campos opcionales que la plantilla de impresión sabe mostrar si existen.
  customer_company?: string | null;
  project_name?: string | null;
  location_id?: number | null;
  seller?: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  valid_until?: string | null;
  notes?: string | null;
  sale_id?: number | null;
  sale_code?: string | null;
  converted?: boolean;
  items_count?: number;
  quotation_items?: QuotationItem[];
  created_at: string;
}

export interface QuotationItemInput {
  product_variant_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface QuotationInput {
  customer_id?: number | null;
  location_id?: number | null;
  status?: QuotationStatus;
  tax_rate?: number;
  valid_until?: string | null;
  notes?: string | null;
  items: QuotationItemInput[];
}

interface QuotationFilters {
  search?: string;
  status?: QuotationStatus | "";
  customer_id?: number | "";
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
    data?: { errors?: string[]; message?: string };
  };
};

function toMessage(error: unknown, fallback: string): string {
  const response = (error as ApiError).response;
  if (response?.status === 429)
    return "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.";
  if (response?.status === 403) return "No tienes permisos para realizar esta acción.";
  if (response?.data?.errors?.length) return response.data.errors.join(", ");
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

interface QuotationState {
  quotations: Quotation[];
  pagination: Pagination;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  currentFilters: QuotationFilters;

  fetchQuotations: (page?: number, perPage?: number, filters?: QuotationFilters) => Promise<void>;
  getQuotation: (id: number) => Promise<Quotation>;
  createQuotation: (data: QuotationInput) => Promise<Quotation>;
  updateQuotation: (id: number, data: Partial<QuotationInput>) => Promise<Quotation>;
  updateStatus: (id: number, status: QuotationStatus) => Promise<void>;
  deleteQuotation: (id: number) => Promise<void>;
  convertQuotation: (id: number) => Promise<{ quotation: Quotation; sale_id: number; sale_code: string; message?: string }>;
}

export const useQuotationStore = create<QuotationState>((set, get) => ({
  quotations: [],
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  isSubmitting: false,
  error: null,
  currentFilters: {},

  fetchQuotations: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.customer_id) params.customer_id = filters.customer_id;
      const response = await api.get("/api/v1/quotations", { params });
      set({
        quotations: response.data.quotations,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las cotizaciones"), isLoading: false });
      throw error;
    }
  },

  getQuotation: async (id) => {
    try {
      const response = await api.get(`/api/v1/quotations/${id}`);
      return response.data.quotation as Quotation;
    } catch (error) {
      throw new Error(toMessage(error, "Error al obtener la cotización"));
    }
  },

  createQuotation: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const { items, ...quotation } = data;
      const response = await api.post("/api/v1/quotations", { quotation, items });
      set({ isSubmitting: false });
      await get().fetchQuotations(1, get().pagination.per_page, get().currentFilters);
      return response.data.quotation as Quotation;
    } catch (error) {
      const msg = toMessage(error, "Error al crear la cotización");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  updateQuotation: async (id, data) => {
    set({ isSubmitting: true, error: null });
    try {
      const { items, ...quotation } = data;
      const payload: Record<string, unknown> = { quotation };
      if (items) payload.items = items;
      const response = await api.put(`/api/v1/quotations/${id}`, payload);
      set({ isSubmitting: false });
      const { pagination, currentFilters } = get();
      await get().fetchQuotations(pagination.current_page, pagination.per_page, currentFilters);
      return response.data.quotation as Quotation;
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar la cotización");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  updateStatus: async (id, status) => {
    try {
      await api.put(`/api/v1/quotations/${id}`, { quotation: { status } });
      const { pagination, currentFilters } = get();
      await get().fetchQuotations(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error) {
      throw new Error(toMessage(error, "Error al actualizar el estado"));
    }
  },

  deleteQuotation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/quotations/${id}`);
      const { pagination, currentFilters, quotations } = get();
      const page =
        quotations.length === 1 && pagination.current_page > 1
          ? pagination.current_page - 1
          : pagination.current_page;
      await get().fetchQuotations(page, pagination.per_page, currentFilters);
    } catch (error) {
      const msg = toMessage(error, "Error al eliminar la cotización");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  convertQuotation: async (id) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post(`/api/v1/quotations/${id}/convert`);
      set({ isSubmitting: false });
      const { pagination, currentFilters } = get();
      await get().fetchQuotations(pagination.current_page, pagination.per_page, currentFilters);
      return {
        quotation: response.data.quotation as Quotation,
        sale_id: response.data.sale_id as number,
        sale_code: response.data.sale_code as string,
        message: response.data.message as string | undefined,
      };
    } catch (error) {
      const msg = toMessage(error, "Error al convertir la cotización en venta");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },
}));
