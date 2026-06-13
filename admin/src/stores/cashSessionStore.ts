import { create } from "zustand";
import api from "../utils/api";
import type { CashSession } from "../types/inventory";

type ApiError = {
  response?: {
    status?: number;
    data?: { errors?: string[]; message?: string };
  };
};

function toMessage(error: unknown, fallback: string): string {
  const response = (error as ApiError).response;
  if (response?.data?.errors?.length) return response.data.errors.join(", ");
  if (response?.data?.message) return response.data.message;
  if (!response) return "Sin conexión. Verifica tu conexión a internet.";
  return fallback;
}

interface CashSessionState {
  current: CashSession | null;
  isLoading: boolean;
  isOpening: boolean;
  isClosing: boolean;
  error: string | null;

  fetchCurrent: (locationId: number | string) => Promise<void>;
  openSession: (
    locationId: number | string,
    openingAmount: number,
  ) => Promise<CashSession>;
  closeSession: (
    id: number,
    countedAmount: number,
    notes?: string,
  ) => Promise<CashSession>;
  clearCurrent: () => void;
}

export const useCashSessionStore = create<CashSessionState>((set) => ({
  current: null,
  isLoading: false,
  isOpening: false,
  isClosing: false,
  error: null,

  fetchCurrent: async (locationId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/api/v1/cash_sessions/current", {
        params: { location_id: locationId },
      });
      set({
        current: (response.data.cash_session as CashSession | null) ?? null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: toMessage(error, "Error al obtener la caja"),
        isLoading: false,
      });
    }
  },

  openSession: async (locationId, openingAmount) => {
    set({ isOpening: true, error: null });
    try {
      const response = await api.post("/api/v1/cash_sessions/open", {
        cash_session: {
          location_id: locationId,
          opening_amount: openingAmount,
        },
      });
      const session = response.data.cash_session as CashSession;
      set({ current: session, isOpening: false });
      return session;
    } catch (error) {
      const msg = toMessage(error, "Error al abrir la caja");
      set({ error: msg, isOpening: false });
      throw new Error(msg);
    }
  },

  closeSession: async (id, countedAmount, notes) => {
    set({ isClosing: true, error: null });
    try {
      const response = await api.put(`/api/v1/cash_sessions/${id}/close`, {
        cash_session: { counted_amount: countedAmount, notes },
      });
      const session = response.data.cash_session as CashSession;
      set({ current: null, isClosing: false });
      return session;
    } catch (error) {
      const msg = toMessage(error, "Error al cerrar la caja");
      set({ error: msg, isClosing: false });
      throw new Error(msg);
    }
  },

  clearCurrent: () => set({ current: null }),
}));
