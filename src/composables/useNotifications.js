import { ref } from 'vue';

// Global notification state
const notifications = ref([]);
let notificationId = 0;

export function useNotifications() {
  
  const addNotification = (message, type = 'info', duration = 5000) => {
    const id = ++notificationId;
    const notification = {
      id,
      message,
      type, // 'info', 'success', 'warning', 'error'
      timestamp: Date.now()
    };
    
    notifications.value.push(notification);
    
    // Auto-remove after duration (except for error notifications)
    if (type !== 'error' && duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
    
    return id;
  };
  
  const removeNotification = (id) => {
    const index = notifications.value.findIndex(n => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };
  
  const clearNotifications = () => {
    notifications.value = [];
  };
  
  // Convenience methods
  const notifySuccess = (message, duration) => addNotification(message, 'success', duration);
  const notifyError = (message, duration = 0) => addNotification(message, 'error', duration); // Errors don't auto-dismiss
  const notifyWarning = (message, duration) => addNotification(message, 'warning', duration);
  const notifyInfo = (message, duration) => addNotification(message, 'info', duration);
  
  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  };
}
