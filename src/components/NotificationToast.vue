<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="['notification', `notification--${notification.type}`]"
        @click="removeNotification(notification.id)"
      >
        <div class="notification-content">
          <span class="material-symbols-outlined notification-icon">
            {{ getIcon(notification.type) }}
          </span>
          <span class="notification-message">{{ notification.message }}</span>
          <button 
            class="notification-close"
            @click.stop="removeNotification(notification.id)"
            title="Close"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useNotifications } from '@shared/composables/useNotifications';

const { notifications, removeNotification } = useNotifications();

const getIcon = (type) => {
  switch (type) {
    case 'success': return 'check_circle';
    case 'error': return 'error';
    case 'warning': return 'warning';
    case 'info':
    default: return 'info';
  }
};
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  width: 100%;
}

.notification {
  background: rgba(0, 0, 0, 0.9);
  border-radius: 8px;
  margin-bottom: 10px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 4px solid;
}

.notification:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  filter: brightness(1.1);
}

.notification--success {
  border-left-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.notification--error {
  border-left-color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.notification--warning {
  border-left-color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.notification--info {
  border-left-color: #2196f3;
  background: rgba(33, 150, 243, 0.1);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
}

.notification-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.notification--success .notification-icon {
  color: #4caf50;
}

.notification--error .notification-icon {
  color: #f44336;
}

.notification--warning .notification-icon {
  color: #ff9800;
}

.notification--info .notification-icon {
  color: #2196f3;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.notification-close {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
}

.notification-close .material-symbols-outlined {
  font-size: 18px;
}

/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.notification-move {
  transition: transform 0.3s ease;
}

@media (max-width: 480px) {
  .notification-container {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .notification {
    padding: 12px;
  }
  
  .notification-content {
    gap: 8px;
  }
  
  .notification-message {
    font-size: 13px;
  }
}
</style>
