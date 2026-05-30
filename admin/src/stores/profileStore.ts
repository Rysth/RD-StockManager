import { create } from "zustand";
import api from "../utils/api";
import type { User } from "../types/auth";

interface UpdateProfileData {
  email?: string;
  username?: string;
  fullname?: string;
  identification?: string;
  phone_number?: string;
}

interface UpdatePasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface ProfileState {
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: UpdateProfileData) => Promise<User>;
  updatePassword: (data: UpdatePasswordData) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  isLoading: false,
  error: null,

  updateProfile: async (data: UpdateProfileData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put("/api/v1/profile/update_info", {
        profile: data,
      });

      if (response.status === 200) {
        set({ isLoading: false });
        return response.data.user;
      }

      throw new Error("Error al actualizar el perfil");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "Error al actualizar el perfil";

      if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(", ");
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  updatePassword: async (data: UpdatePasswordData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put("/api/v1/profile/update_password", {
        profile: data,
      });

      if (response.status === 200) {
        set({ isLoading: false });
        return;
      }

      throw new Error("Error al actualizar la contraseña");
    } catch (error: any) {
      console.error("Error updating password:", error);
      let errorMessage = "Error al actualizar la contraseña";

      if (error.response?.status === 422) {
        const serverMsg = error.response?.data?.error;
        const field = error.response?.data?.field;
        if (field === "current_password") {
          errorMessage = serverMsg || "La contraseña actual no es correcta";
        } else if (serverMsg) {
          errorMessage = serverMsg;
        }
      }

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = error.response.data.errors.join(", ");
      }

      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },
}));
