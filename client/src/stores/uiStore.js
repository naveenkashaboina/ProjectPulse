import { create } from 'zustand';

const useUiStore = create((set, get) => ({
  sidebarOpen: false,
  toasts: [],

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),

  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...toast }],
  })),

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id),
  })),
}));

export default useUiStore;
