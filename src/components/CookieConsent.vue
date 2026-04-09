<template>
  <Transition name="consent-slide">
    <div v-if="visible" class="cookie-consent">
      <p class="consent-text">
        We use cookies for authentication and
        <a href="https://realmforge.io/privacy" target="_blank" rel="noopener" class="consent-link">analytics</a>.
      </p>
      <div class="consent-actions">
        <button @click="accept" class="consent-btn consent-accept">Accept</button>
        <button @click="decline" class="consent-btn consent-decline">Decline</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getConsent, acceptAnalytics, declineAnalytics } from '@shared/composables/useGoogleAnalytics'

const visible = ref(false)

onMounted(() => {
  if (!getConsent()) {
    visible.value = true
  }
})

function accept() {
  acceptAnalytics()
  visible.value = false
}

function decline() {
  declineAnalytics()
  visible.value = false
}
</script>

<style scoped>
.cookie-consent {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(180deg, rgba(20, 14, 8, 0.95) 0%, rgba(30, 20, 12, 0.98) 100%);
  border-top: 1px solid rgba(201, 168, 118, 0.3);
  backdrop-filter: blur(8px);
}

.consent-text {
  margin: 0;
  font-family: 'Crimson Text', Georgia, serif;
  font-size: 0.85rem;
  color: rgba(225, 218, 200, 0.8);
}

.consent-link {
  color: rgba(201, 168, 118, 0.9);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.consent-link:hover {
  color: rgb(201, 168, 118);
}

.consent-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.consent-btn {
  padding: 0.35rem 1rem;
  border-radius: 4px;
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.consent-accept {
  background: linear-gradient(135deg, #9d7c47 0%, #c9a876 50%, #9d7c47 100%);
  color: #1a0f08;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.consent-accept:hover {
  box-shadow: 0 2px 8px rgba(201, 168, 118, 0.25);
}

.consent-decline {
  background: transparent;
  color: rgba(225, 218, 200, 0.5);
  border: 1px solid rgba(225, 218, 200, 0.15);
}

.consent-decline:hover {
  color: rgba(225, 218, 200, 0.8);
  border-color: rgba(225, 218, 200, 0.3);
}

/* Slide transition */
.consent-slide-enter-active {
  transition: transform 0.4s ease-out, opacity 0.4s ease-out;
}

.consent-slide-leave-active {
  transition: transform 0.3s ease-in, opacity 0.3s ease-in;
}

.consent-slide-enter-from,
.consent-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (max-width: 480px) {
  .cookie-consent {
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    text-align: center;
  }
}
</style>
