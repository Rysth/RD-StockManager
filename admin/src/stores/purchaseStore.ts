import { create } from "zustand";
import api from "../utils/api";
import type {
  Purchase,
  PurchaseStatus,
  PaymentStatus,
  CreatePurchaseData,
  Pagination,
} from "../types/inventory";

interface PurchaseFilters {
  search?: string;
  status?: PurchaseStatus | "";
  payment_status?: PaymentStatus | "";
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

interface PurchaseState {
  purchases: Purchase[];
  pagination: Pagination;
  selectedPurchase: Purchase | null;
  duePurchases: Purchase[];
  isLoading: boolean;
  isLoadingDetail: boolean;
  isSubmitting: boolean;
  error: string | null;
  currentFilters: PurchaseFilters;

  fetchPurchases: (page?: number, perPage?: number, filters?: PurchaseFilters) => Promise<void>;
  fetchPurchase: (id: number) => Promise<void>;
  clearSelectedPurchase: () => void;
  createPurchase: (data: CreatePurchaseData) => Promise<Purchase>;
  updatePurchaseStatus: (id: number, status: PurchaseStatus) => Promise<void>;
  updatePurchasePayment: (id: number, paidAmount: number) => Promise<Purchase>;
  deletePurchase: (id: number) => Promise<void>;
  fetchDue: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  purchases: [],
  pagination: DEFAULT_PAGINATION,
  selectedPurchase: null,
  duePurchases: [],
  isLoading: false,
  isLoadingDetail: false,
  isSubmitting: false,
  error: null,
  currentFilters: {},

  fetchPurchases: async (page = 1, perPage = 12, filters = {}) => {
    set({ isLoading: true, error: null, currentFilters: filters });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.payment_status) params.payment_status = filters.payment_status;
      const response = await api.get("/api/v1/purchases", { params });
      set({
        purchases: response.data.purchases,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las compras"), isLoading: false });
      throw error;
    }
  },

  fetchPurchase: async (id) => {
    set({ isLoadingDetail: true, error: null, selectedPurchase: null });
    try {
      const response = await api.get(`/api/v1/purchases/${id}`);
      set({ selectedPurchase: response.data.purchase as Purchase, isLoadingDetail: false });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener la compra"), isLoadingDetail: false });
    }
  },

  clearSelectedPurchase: () => set({ selectedPurchase: null }),

  createPurchase: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.post("/api/v1/purchases", {
        purchase: {
          customer_id: data.customer_id ?? null,
          location_id: data.location_id ?? null,
          status: data.status ?? "received",
          discount: data.discount ?? 0,
          tax: data.tax ?? 0,
          paid_amount: data.paid_amount ?? 0,
          due_date: data.due_date ?? null,
          reference: data.reference ?? null,
          notes: data.notes ?? null,
        },
        items: data.items,
      });
      set({ isSubmitting: false });
      await get().fetchPurchases(1, get().pagination.per_page, get().currentFilters);
      return response.data.purchase as Purchase;
    } catch (error) {
      const msg = toMessage(error, "Error al registrar la compra");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  updatePurchaseStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/purchases/${id}`, { purchase: { status } });
      const { pagination, currentFilters } = get();
      await get().fetchPurchases(pagination.current_page, pagination.per_page, currentFilters);
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar la compra");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updatePurchasePayment: async (id, paidAmount) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await api.put(`/api/v1/purchases/${id}`, {
        purchase: { paid_amount: paidAmount },
      });
      const { pagination, currentFilters } = get();
      await get().fetchPurchases(pagination.current_page, pagination.per_page, currentFilters);
      set({ isSubmitting: false, selectedPurchase: response.data.purchase as Purchase });
      return response.data.purchase as Purchase;
    } catch (error) {
      const msg = toMessage(error, "Error al registrar el pago");
      set({ error: msg, isSubmitting: false });
      throw new Error(msg);
    }
  },

  deletePurchase: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/purchases/${id}`);
      const { pagination, currentFilters, purchases } = get();
      const page =
        purchases.length === 1 && pagination.current_page > 1
          ? pagination.current_page - 1
          : pagination.current_page;
      await get().fetchPurchases(page, pagination.per_page, currentFilters);
    } catch (error) {
      const msg = toMessage(error, "Error al cancelar la compra");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  fetchDue: async () => {
    try {
      const response = await api.get("/api/v1/purchases/due");
      set({ duePurchases: response.data.purchases });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener compras por vencer") });
    }
  },
}));
