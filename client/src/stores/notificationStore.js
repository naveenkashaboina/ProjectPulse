import { create } from 'zustand';
import api from '../utils/api';

const useNotificationStore = create((set, get) => ({
  items: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    try {
      const response = await api.get('/notifications?limit=20');
      set({
        items: response.data.data,
        unreadCount: response.data.meta?.unreadCount || 0,
        isLoading: false,
      });
    } catch {
      /* ignore */
    }
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      const { items, unreadCount } = get();
      const updated = items.map((n) =>
        n._id === id && !n.read ? { ...n, read: true } : n
      );
      const wasUnread = items.find((n) => n._id === id && !n.read);
      set({
        items: updated,
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch {
      /* ignore */
    }
  },

  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      const { items } = get();
      set({
        items: items.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      });
    } catch {
      /* ignore */
    }
  },
}));

export default useNotificationStore;
