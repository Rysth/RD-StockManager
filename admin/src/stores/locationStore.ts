import { create } from "zustand";
import api from "../utils/api";
import type { Location, Pagination } from "../types/inventory";

interface LocationInput {
  name: string;
  address?: string;
  phone?: string;
  is_default?: boolean;
  active?: boolean;
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
  per_page: 50,
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

interface LocationState {
  locations: Location[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;

  fetchLocations: (page?: number, perPage?: number, search?: string) => Promise<void>;
  createLocation: (data: LocationInput) => Promise<Location>;
  updateLocation: (id: number, data: LocationInput) => Promise<void>;
  deleteLocation: (id: number) => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  locations: [],
  pagination: DEFAULT_PAGINATION,
  isLoading: false,
  error: null,

  fetchLocations: async (page = 1, perPage = 50, search = "") => {
    set({ isLoading: true, error: null });
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (search) params.search = search;
      const response = await api.get("/api/v1/locations", { params });
      set({
        locations: response.data.locations,
        pagination: response.data.pagination,
        isLoading: false,
      });
    } catch (error) {
      set({ error: toMessage(error, "Error al obtener las ubicaciones"), isLoading: false });
      throw error;
    }
  },

  createLocation: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/api/v1/locations", { location: data });
      await get().fetchLocations(get().pagination.current_page, get().pagination.per_page);
      return response.data.location as Location;
    } catch (error) {
      const msg = toMessage(error, "Error al crear la ubicación");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  updateLocation: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/api/v1/locations/${id}`, { location: data });
      await get().fetchLocations(get().pagination.current_page, get().pagination.per_page);
    } catch (error) {
      const msg = toMessage(error, "Error al actualizar la ubicación");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  deleteLocation: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/api/v1/locations/${id}`);
      await get().fetchLocations(get().pagination.current_page, get().pagination.per_page);
    } catch (error) {
      const msg = toMessage(error, "Error al archivar la ubicación");
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },
}));
