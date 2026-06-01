import { create } from "zustand";
import api from "../utils/api";
import type { InvoiceListItem, Pagination } from "../types/inventory";

interface InvoiceFilters {
  search?: string;
  estado?: string;
  ambiente?: string;
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
  if (response?.status === 403) return "No tienes permisos para realizar esta acción.";
  if (response?.data?.errors?.length) return response.data.errors.join(", ");
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

function filenameFromDisposition(disposition: string | undefined, fallback: string) {
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

interface InvoiceState {
  invoices: InvoiceListItem[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
  currentFilters: InvoiceFilters;

  fetchInvoices: (page?: number, perPage?: number, filters?: InvoiceFilters) => Promise<void>;
  downloadXml: (id: number) => Promise<void>;
  downloadRide: (id: number) => Promise<void>;
}

export const useInvoiceStore = create<InvoiceState>((set) => ({
  invoices: [],
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,
  currentFilters: {},

  fetchInvoices: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.estado) params.estado = filters.estado;
      if (filters.ambiente) params.ambiente = filters.ambiente;
      const response = await api.get("/api/v1/invoices", { params });
      set({
        invoices: response.data.invoices,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las facturas"), isLoading: false });
      throw error;
    }
  },

  downloadXml: async (id) => {
    try {
      const response = await api.get(`/api/v1/invoices/${id}/xml`, { responseType: "blob" });
      downloadBlob(
        response.data,
        filenameFromDisposition(response.headers["content-disposition"], `factura-${id}.xml`),
      );
    } catch (error) {
      throw new Error(toMessage(error, "Error al descargar el XML autorizado"));
    }
  },

  downloadRide: async (id) => {
    try {
      const response = await api.get(`/api/v1/invoices/${id}/ride`, { responseType: "blob" });
      downloadBlob(
        response.data,
        filenameFromDisposition(response.headers["content-disposition"], `factura-${id}.pdf`),
      );
    } catch (error) {
      throw new Error(toMessage(error, "Error al descargar el RIDE"));
    }
  },
}));
