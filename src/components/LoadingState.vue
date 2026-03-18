<template>
  <div :class="['loading-container', { overlay: overlay, inline: inline }]">
    <div class="loading-content">
      <div v-if="type === 'spinner'" class="spinner-container">
        <div class="spinner"></div>
      </div>
      
      <div v-else-if="type === 'dots'" class="dots-container">
        <div class="dot" v-for="i in 3" :key="i"></div>
      </div>
      
      <div v-else-if="type === 'waves'" class="waves-container">
        <div v-for="index in 5" :key="index" class="wave"></div>
      </div>
      
      <div v-else-if="type === 'skeleton'" class="skeleton-container">
        <div class="skeleton-line" v-for="i in lines" :key="i" :style="{ width: getLineWidth(i) }"></div>
      </div>
      
      <div v-if="message" class="loading-message">
        {{ message }}
      </div>
      
      <div v-if="showProgress && progress !== null" class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ Math.round(progress) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  type: {
    type: String,
    default: 'spinner',
    validator: (value) => ['spinner', 'dots', 'waves', 'skeleton'].includes(value)
  },
  overlay: {
    type: Boolean,
    default: false
  },
  inline: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  showProgress: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: null,
    validator: (value) => value === null || (value >= 0 && value <= 100)
  },
  lines: {
    type: Number,
    default: 3
  }
});

const getLineWidth = (lineIndex) => {
  const widths = ['100%', '75%', '50%'];
  return widths[lineIndex % widths.length];
};
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.loading-container.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(22, 29, 38, 0.8);
  z-index: 9998;
  backdrop-filter: blur(2px);
}

.loading-container.inline {
  padding: 1rem;
  position: relative;
}

.loading-content {
  text-align: center;
  color: var(--font-color);
}

/* Spinner */
.spinner-container {
  margin-bottom: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--fieldBg);
  border-top: 4px solid var(--secondary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dots */
.dots-container {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.dot {
  width: 12px;
  height: 12px;
  background: var(--secondary-color);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Waves */
.waves-container {
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-bottom: 1rem;
}

.wave {
  width: 4px;
  height: 40px;
  background: var(--secondary-color);
  animation: wave 1.2s ease-in-out infinite;
}

.wave:nth-child(1) { animation-delay: 0s; }
.wave:nth-child(2) { animation-delay: 0.1s; }
.wave:nth-child(3) { animation-delay: 0.2s; }
.wave:nth-child(4) { animation-delay: 0.3s; }
.wave:nth-child(5) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

/* Skeleton */
.skeleton-container {
  width: 100%;
  max-width: 300px;
}

.skeleton-line {
  height: 1rem;
  background: linear-gradient(90deg, var(--fieldBg) 25%, rgba(255, 255, 255, 0.1) 50%, var(--fieldBg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Message and Progress */
.loading-message {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: var(--font-color);
}

.progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 200px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--fieldBg);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--secondary-color);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--font-color);
}
</style>
