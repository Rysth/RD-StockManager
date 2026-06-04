import { create } from "zustand";
import api from "../utils/api";
import type { ProductBundle, ProductBundleInput } from "../types/inventory";

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

interface ProductBundleState {
  bundles: ProductBundle[];
  isLoading: boolean;
  isSubmitting: boolean;
  fetchBundles: (locationId?: number | string) => Promise<void>;
  createBundle: (data: ProductBundleInput) => Promise<ProductBundle>;
  deleteBundle: (id: number) => Promise<void>;
}

export const useProductBundleStore = create<ProductBundleState>((set, get) => ({
  bundles: [],
  isLoading: false,
  isSubmitting: false,

  fetchBundles: async (locationId) => {
    set({ isLoading: true });
    try {
      const params: Record<string, string | number> = {};
      if (locationId) params.location_id = locationId;
      const response = await api.get("/api/v1/product_bundles", { params });
      set({ bundles: response.data.bundles, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw new Error(toMessage(error, "Error al obtener los combos"));
    }
  },

  createBundle: async (data) => {
    set({ isSubmitting: true });
    try {
      const response = await api.post("/api/v1/product_bundles", {
        product_bundle: data,
      });
      await get().fetchBundles();
      set({ isSubmitting: false });
      return response.data.bundle as ProductBundle;
    } catch (error) {
      set({ isSubmitting: false });
      throw new Error(toMessage(error, "Error al crear el combo"));
    }
  },

  deleteBundle: async (id) => {
    await api.delete(`/api/v1/product_bundles/${id}`);
    set((state) => ({ bundles: state.bundles.filter((b) => b.id !== id) }));
  },
}));
