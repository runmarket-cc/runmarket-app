import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  accessToken: string | null;
  email: string | null;
  isLoggedIn: boolean;

  setAuth: (token: string, email: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  email: null,
  isLoggedIn: false,

  setAuth: async (token, email) => {
    await SecureStore.setItemAsync('accessToken', token);
    await SecureStore.setItemAsync('userEmail', email);
    set({ accessToken: token, email, isLoggedIn: true });
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('userEmail');
    set({ accessToken: null, email: null, isLoggedIn: false });
  },

  loadAuth: async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const email = await SecureStore.getItemAsync('userEmail');
    if (token && email) {
      set({ accessToken: token, email, isLoggedIn: true });
    }
  },
}));
