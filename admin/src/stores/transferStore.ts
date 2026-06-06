import { create } from "zustand";
import api from "../utils/api";
import type { StockTransfer, TransferStatus, CreateTransferData, Pagination } from "../types/inventory";

interface TransferFilters {
  status?: TransferStatus | "";
  from_location_id?: number | "";
  to_location_id?: number | "";
}

const DEFAULT_PAGINATION: Pagination = {
  current_page: 1,
  total_pages: 1,
  total_count: 0,
  per_page: 15,
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

interface TransferState {
  transfers: StockTransfer[];
  selectedTransfer: StockTransfer | null;
  pagination: Pagination;
  isLoading: boolean;
  isSubmitting: boolean;

  fetchTransfers: (page?: number, perPage?: number, filters?: TransferFilters) => Promise<void>;
  fetchTransfer: (id: number) => Promise<void>;
  clearSelectedTransfer: () => void;
  createTransfer: (data: CreateTransferData) => Promise<StockTransfer>;
  receiveTransfer: (id: number) => Promise<void>;
  cancelTransfer: (id: number) => Promise<void>;
  deleteTransfer: (id: number) => Promise<void>;
}

export const useTransferStore = create<TransferState>((set, get) => ({
  transfers: [],
  selectedTransfer: null,
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  isSubmitting: false,

  fetchTransfers: async (page = 1, perPage = 15, filters = {}) => {
    set({ isLoading: true });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filters.status) params.status = filters.status;
      if (filters.from_location_id) params.from_location_id = filters.from_location_id;
      if (filters.to_location_id) params.to_location_id = filters.to_location_id;

      const response = await api.get("/api/v1/stock_transfers", { params });
      set({ transfers: response.data.transfers, pagination: response.data.pagination, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw new Error(toMessage(error, "Error al obtener las transferencias"));
    }
  },

  fetchTransfer: async (id) => {
    try {
      const response = await api.get(`/api/v1/stock_transfers/${id}`);
      set({ selectedTransfer: response.data.transfer });
    } catch (error) {
      throw new Error(toMessage(error, "Error al obtener la transferencia"));
    }
  },

  clearSelectedTransfer: () => set({ selectedTransfer: null }),

  createTransfer: async (data) => {
    set({ isSubmitting: true });
    try {
      const response = await api.post("/api/v1/stock_transfers", {
        transfer: {
          from_location_id: data.from_location_id,
          to_location_id: data.to_location_id,
          notes: data.notes,
        },
        items: data.items,
      });
      set({ isSubmitting: false });
      await get().fetchTransfers();
      return response.data.transfer as StockTransfer;
    } catch (error) {
      set({ isSubmitting: false });
      throw new Error(toMessage(error, "Error al crear la transferencia"));
    }
  },

  receiveTransfer: async (id) => {
    set({ isSubmitting: true });
    try {
      const response = await api.put(`/api/v1/stock_transfers/${id}/receive`);
      const updated = response.data.transfer as StockTransfer;
      set((state) => ({
        isSubmitting: false,
        transfers: state.transfers.map((t) => (t.id === id ? updated : t)),
        selectedTransfer: state.selectedTransfer?.id === id ? updated : state.selectedTransfer,
      }));
    } catch (error) {
      set({ isSubmitting: false });
      throw new Error(toMessage(error, "Error al confirmar la transferencia"));
    }
  },

  cancelTransfer: async (id) => {
    set({ isSubmitting: true });
    try {
      const response = await api.put(`/api/v1/stock_transfers/${id}/cancel`);
      const updated = response.data.transfer as StockTransfer;
      set((state) => ({
        isSubmitting: false,
        transfers: state.transfers.map((t) => (t.id === id ? updated : t)),
        selectedTransfer: state.selectedTransfer?.id === id ? updated : state.selectedTransfer,
      }));
    } catch (error) {
      set({ isSubmitting: false });
      throw new Error(toMessage(error, "Error al cancelar la transferencia"));
    }
  },

  deleteTransfer: async (id) => {
    await api.delete(`/api/v1/stock_transfers/${id}`);
    set((state) => ({ transfers: state.transfers.filter((t) => t.id !== id) }));
  },
}));
