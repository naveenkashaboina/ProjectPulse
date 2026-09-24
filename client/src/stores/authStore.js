import { create } from 'zustand';
import api from '../utils/api';

const useAuthStore = create((set) => ({
  user: null,
  organizations: [],
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      localStorage.setItem('accessToken', response.data.data.accessToken);
      const { user, organizations } = response.data.data;
      set({
        isLoading: false,
        isAuthenticated: true,
        user,
        organizations: organizations || [],
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Login failed';
      set({ isLoading: false, error: message });
      return { success: false };
    }
  },

  signup: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/signup', userData);
      localStorage.setItem('accessToken', response.data.data.accessToken);
      const { user, organization } = response.data.data;
      set({
        isLoading: false,
        isAuthenticated: true,
        user,
        organizations: organization ? [organization] : [],
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Signup failed';
      set({ isLoading: false, error: message });
      return { success: false };
    }
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/auth/me');
      const { user, organizations } = response.data.data;
      set({
        isLoading: false,
        isAuthenticated: true,
        user,
        organizations: organizations || [],
      });
    } catch {
      localStorage.removeItem('accessToken');
      set({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('accessToken');
    set({
      isAuthenticated: false,
      user: null,
      organizations: [],
    });
  },

  // For the case where there's no token — mark loading as done
  setNotAuthenticated: () => set({
    isLoading: false,
    isAuthenticated: false,
    user: null,
  }),
}));

export default useAuthStore;
