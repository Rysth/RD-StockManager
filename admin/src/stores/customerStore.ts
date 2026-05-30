import { create } from "zustand";
import api from "../utils/api";
import type { Customer, Pagination } from "../types/inventory";

interface CustomerInput {
  name: string;
  phone?: string;
  city?: string;
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

interface CustomerState {
  customers: Customer[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
  currentSearch: string;

  fetchCustomers: (page?: number, perPage?: number, search?: string) => Promise<void>;
  createCustomer: (data: CustomerInput) => Promise<void>;
  updateCustomer: (id: number, data: CustomerInput) => Promise<void>;
  deleteCustomer: (id: number) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,
  currentSearch: "",

  fetchCustomers: async (page = 1, perPage = 12, search = "") => {
    set({ isLoading: true, error: null, currentSearch: search });
    try {
      const params: any = { page, per_page: perPage };
      if (search) params.search = search;
      const response = await api.get("/api/v1/customers", { params });
      set({
        customers: response.data.customers,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: toMessage(error, "Error al obtener los clientes"), isLoading: false });
      throw error;
    }
  },

  createCustomer: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/api/v1/customers", { customer: data });
      const { pagination, currentSearch } = get();
      await get().fetchCustomers(pagination.current_page, pagination.per_page, currentSearch);
    } catch (error: any) {
      const msg = toMessage(error, "Error al crear el cliente");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateCustomer: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/customers/${id}`, { customer: data });
      const { pagination, currentSearch } = get();
      await get().fetchCustomers(pagination.current_page, pagination.per_page, currentSearch);
    } catch (error: any) {
      const msg = toMessage(error, "Error al actualizar el cliente");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteCustomer: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/customers/${id}`);
      const { pagination, currentSearch, customers } = get();
      const page =
        customers.length === 1 && pagination.current_page > 1
          ? pagination.current_page - 1
          : pagination.current_page;
      await get().fetchCustomers(page, pagination.per_page, currentSearch);
    } catch (error: any) {
      const msg = toMessage(error, "Error al eliminar el cliente");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
}));
