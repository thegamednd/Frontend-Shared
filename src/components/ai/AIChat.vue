<template>
  <div class="chat-container">
    <!-- Sidebar Overlay -->
    <div
      v-if="sidebarOpen"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    ></div>

    <!-- Conversation History Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <h3>Previous Chats</h3>
        <button @click="sidebarOpen = false" class="close-btn">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="sidebar-content">
        <div v-if="aiStore.isLoadingHistory" class="loading-history">
          Loading...
        </div>
        <div v-else-if="aiStore.conversations.length === 0" class="no-history">
          No previous conversations
        </div>
        <div
          v-else
          v-for="conv in aiStore.conversations"
          :key="conv.conversationId"
          class="history-item"
          :class="{ active: conv.conversationId === aiStore.activeConversationId }"
          @click="handleLoadConversation(conv.conversationId)"
        >
          <div class="history-preview">{{ conv.preview }}</div>
          <div class="history-date">{{ formatDate(conv.updatedAt) }}</div>
        </div>
      </div>
    </aside>

    <!-- Header -->
    <header class="chat-header">
      <div class="header-left">
        <button @click="toggleSidebar" class="hamburger-btn">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h2>{{ aiName }}</h2>
        <span class="questions-badge">
          <span class="material-symbols-outlined">quiz</span>
          {{ aiStore.credits }}
        </span>
      </div>
      <div class="header-actions">
        <button @click="handleNewConversation" class="action-btn">
          <span class="material-symbols-outlined">refresh</span>
          <span class="btn-text">New Chat</span>
        </button>
        <button @click="$emit('show-purchase')" class="action-btn primary">
          <span class="material-symbols-outlined">add_circle</span>
          <span class="btn-text">Buy</span>
        </button>
      </div>
    </header>

    <!-- Messages Area -->
    <div class="messages-area" ref="messagesContainer">
      <div class="messages-wrapper">
        <div
          v-for="(entry, index) in conversation"
          :key="index"
          class="message-group"
        >
          <!-- User Message -->
          <div v-if="entry.question" class="message user-message">
            <div class="message-bubble">
              <p>{{ entry.question }}</p>
            </div>
            <span class="message-label">You</span>
          </div>

          <!-- AI Message -->
          <div class="message ai-message">
            <div class="message-avatar">
              <span class="material-symbols-outlined">auto_awesome</span>
            </div>
            <div class="message-content">
              <span class="message-label">{{ aiName }}</span>
              <div class="message-bubble">
                <div v-html="entry.answer"></div>

                <!-- Inline "Proposal created" card (DM-only, AI tool use) -->
                <div
                  v-if="entry.proposal"
                  class="proposal-inline-card"
                  :class="`proposal-action-${entry.proposal.action || 'edit'}`"
                >
                  <div class="proposal-card-icon">
                    <span class="material-symbols-outlined">{{ proposalIcon(entry.proposal.action) }}</span>
                  </div>
                  <div class="proposal-card-body">
                    <span class="proposal-card-eyebrow">Proposal created</span>
                    <p class="proposal-card-text">
                      {{ proposalLabel(entry.proposal.action) }} drafted — review it before applying.
                    </p>
                    <button
                      class="proposal-card-btn"
                      type="button"
                      @click="openProposal(entry.proposal.proposalId)"
                    >
                      <span class="material-symbols-outlined">open_in_new</span>
                      Review proposal
                    </button>
                  </div>
                </div>

                <div v-if="entry.requiresConfirmation" class="confirmation-actions">
                  <button @click="confirmBroadQuery(index)" class="confirm-btn">Yes, proceed</button>
                  <button @click="cancelBroadQuery(index)" class="cancel-btn">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Thinking / Streaming Indicator -->
        <div v-if="aiStore.isLoading || streamingText" class="message ai-message" :class="{ thinking: aiStore.isLoading && !streamingText }">
          <div class="message-avatar">
            <span class="material-symbols-outlined">auto_awesome</span>
          </div>
          <div class="message-content">
            <span class="message-label">{{ aiName }}</span>
            <div class="message-bubble">
              <div v-if="streamingText" v-html="streamingText"></div>
              <div v-else class="thinking-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div v-if="toolIndicator" class="tool-indicator">
                <span class="material-symbols-outlined">search</span>
                {{ toolIndicator }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="aiStore.error" class="error-banner">
      <span class="material-symbols-outlined">error</span>
      {{ aiStore.error }}
    </div>

    <!-- Input Area -->
    <div class="input-area">
      <div class="input-wrapper">
        <textarea
          v-model="question"
          :disabled="aiStore.credits <= 0 || aiStore.isLoading"
          :placeholder="aiStore.credits <= 0 ? 'No questions remaining...' : `Ask ${aiName} something...`"
          @keydown.enter.exact.prevent="submitQuestion"
          @keydown.shift.enter="addNewline"
          @input="autoResize"
          rows="1"
          ref="inputField"
        ></textarea>
        <button
          @click="submitQuestion"
          :disabled="aiStore.credits <= 0 || aiStore.isLoading || !question.trim()"
          class="send-btn"
        >
          <span class="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAIStore } from '@shared/stores/ai';
import { useRealmStore } from '@shared/stores/realm';
import { useAIStream } from '@shared/composables/useAIStream';

const aiStore = useAIStore();
const realmStore = useRealmStore();
const { connectionId, isConnected, isStreaming, connect, disconnect, onToken, onToolUse, onComplete, onError, startStreaming } = useAIStream();

const question = ref('');
const conversation = ref([]);
const messagesContainer = ref(null);
const inputField = ref(null);
const sidebarOpen = ref(false);
const streamingText = ref('');
const toolIndicator = ref('');
let fallbackTimer = null;

defineEmits(['show-purchase']);

const aiName = computed(() => {
  return realmStore.activeRealm?.AIConfig?.Name || 'Lorekeeper';
});

function initWelcomeMessage() {
  if (aiStore.credits <= 0) {
    conversation.value = [{ answer: `You have no questions remaining to ask ${aiName.value}!` }];
  } else {
    conversation.value = [{ answer: 'Welcome, what shall we discuss today?' }];
  }
}

onMounted(() => {
  initWelcomeMessage();
  scrollToBottom();
  connect();

  // Register streaming callbacks
  onToken((text) => {
    streamingText.value += text.replace(/\n/g, '<br />');
    scrollToBottom();
  });

  onToolUse((toolName, details) => {
    if (toolName === 'propose_rule_change') {
      // Show a more specific indicator while the model finishes the turn,
      // then attach an inline card to the most recent AI message so the DM
      // can deep-link into the review drawer.
      toolIndicator.value = 'Drafting a rule proposal...';
      const proposalId = details?.proposalId
        || details?.toolResult?.proposalId
        || details?.input?.proposalId
        || null;
      const action = details?.action
        || details?.toolResult?.action
        || details?.input?.action
        || null;
      if (proposalId && conversation.value.length > 0) {
        const lastEntry = conversation.value[conversation.value.length - 1];
        lastEntry.proposal = { proposalId, action };
      }
    } else {
      toolIndicator.value = 'Consulting the archives...';
    }
  });

  onComplete((message) => {
    clearFallbackTimer();
    const answer = message.answer?.replace(/\n/g, '<br />') || streamingText.value;
    if (conversation.value.length > 0) {
      const lastEntry = conversation.value[conversation.value.length - 1];
      if (lastEntry.question && !lastEntry.answer) {
        lastEntry.answer = answer;
      }
    }
    if (message.creditsRemaining !== undefined) {
      aiStore.credits = message.creditsRemaining;
    }
    streamingText.value = '';
    toolIndicator.value = '';
    aiStore.isLoading = false;
    scrollToBottom();
  });

  onError((errorMsg) => {
    clearFallbackTimer();
    if (conversation.value.length > 0) {
      const lastEntry = conversation.value[conversation.value.length - 1];
      if (lastEntry.question && !lastEntry.answer) {
        lastEntry.answer = errorMsg || "Hmmmm... my thoughts are clouded. Try again shortly.";
      }
    }
    streamingText.value = '';
    toolIndicator.value = '';
    aiStore.isLoading = false;
    scrollToBottom();
  });
});

onUnmounted(() => {
  clearFallbackTimer();
  disconnect();
});

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
  if (sidebarOpen.value) {
    aiStore.loadHistory();
  }
}

async function handleLoadConversation(conversationId) {
  sidebarOpen.value = false;
  await aiStore.loadConversation(conversationId);

  if (aiStore.activeConversation && aiStore.activeConversation.length > 0) {
    conversation.value = aiStore.activeConversation;
  } else {
    initWelcomeMessage();
  }
  scrollToBottom();
}

function handleNewConversation() {
  aiStore.startNewConversation();
  initWelcomeMessage();
  scrollToBottom();
}

function clearFallbackTimer() {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
}

function startFallbackTimer(conversationId) {
  clearFallbackTimer();
  fallbackTimer = setTimeout(async () => {
    if (isStreaming.value || (aiStore.isLoading && streamingText.value === '')) {
      await aiStore.loadConversation(conversationId);
      if (aiStore.activeConversation && aiStore.activeConversation.length > 0) {
        conversation.value = aiStore.activeConversation;
      }
      streamingText.value = '';
      toolIndicator.value = '';
      aiStore.isLoading = false;
      scrollToBottom();
    }
  }, 120000);
}

async function submitQuestion() {
  if (aiStore.isLoading || aiStore.credits <= 0) return;

  const currentQuestion = question.value.trim();
  if (!currentQuestion) return;

  question.value = '';
  if (inputField.value) {
    inputField.value.style.height = 'auto';
  }

  // Add user message immediately
  conversation.value.push({ question: currentQuestion, answer: '' });
  scrollToBottom();

  const data = await aiStore.sendMessage(currentQuestion, false, connectionId.value);

  if (!data) {
    conversation.value[conversation.value.length - 1].answer =
      "Hmmmm... my thoughts are clouded. Try again shortly.";
    scrollToBottom();
    return;
  }

  // Handle broad query confirmation
  if (data.requiresConfirmation) {
    const msg = `This search will be more thorough and will use ${data.estimatedCredits} question credits instead of 1. Shall I proceed?`;
    conversation.value[conversation.value.length - 1].answer = msg;
    conversation.value[conversation.value.length - 1].requiresConfirmation = true;
    conversation.value[conversation.value.length - 1].pendingQuestion = currentQuestion;
    scrollToBottom();
    return;
  }

  // Streaming path: backend accepted, answer will arrive via WebSocket
  if (data.status === 'streaming') {
    startStreaming();
    streamingText.value = '';
    toolIndicator.value = '';
    startFallbackTimer(data.conversationId);
    return;
  }

  const formattedAnswer = data.answer?.replace(/\n/g, '<br />') || '';
  conversation.value[conversation.value.length - 1].answer = formattedAnswer;
  scrollToBottom();
}

async function confirmBroadQuery(index) {
  const entry = conversation.value[index];
  const pendingQuestion = entry.pendingQuestion;
  entry.requiresConfirmation = false;
  entry.answer = '';

  const data = await aiStore.sendMessage(pendingQuestion, true, connectionId.value);

  if (!data) {
    conversation.value[index].answer =
      "Hmmmm... my thoughts are clouded. Try again shortly.";
    scrollToBottom();
    return;
  }

  // Streaming path: backend accepted, answer will arrive via WebSocket
  if (data.status === 'streaming') {
    startStreaming();
    streamingText.value = '';
    toolIndicator.value = '';
    startFallbackTimer(data.conversationId);
    return;
  }

  const formattedAnswer = data.answer?.replace(/\n/g, '<br />') || '';
  conversation.value[index].answer = formattedAnswer;
  scrollToBottom();
}

function cancelBroadQuery(index) {
  const entry = conversation.value[index];
  entry.requiresConfirmation = false;
  entry.answer = "Very well, I shall hold off on that inquiry.";
  delete entry.pendingQuestion;
}

function addNewline(event) {
  const textarea = event.target;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  question.value = question.value.substring(0, start) + '\n' + question.value.substring(end);
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    autoResize({ target: textarea });
  });
}

function autoResize(event) {
  const textarea = event.target;
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

// ── Proposal inline card helpers ──
function proposalLabel(action) {
  return {
    edit: 'A rule edit',
    create: 'A new rule',
    hide: 'A rule hide',
    reorder: 'A reordering'
  }[action] || 'A rule change';
}

function proposalIcon(action) {
  return {
    edit: 'edit_note',
    create: 'note_add',
    hide: 'visibility_off',
    reorder: 'swap_vert'
  }[action] || 'auto_awesome';
}

function openProposal(proposalId) {
  if (!proposalId) return;
  // The host view (RealmForge-Vue ModuleView) exposes a deep-link hook.
  // Falls back to a no-op when no host is registered (e.g. in TheGame-Vue,
  // the user can navigate to Study → Rules to find their drafts).
  if (typeof window !== 'undefined' && typeof window.__rfOpenProposalDrawer === 'function') {
    window.__rfOpenProposalDrawer(proposalId);
  }
}

watch(() => aiStore.credits, (newCredits) => {
  if (newCredits <= 0 && conversation.value.length === 1 && !conversation.value[0].question) {
    conversation.value[0] = { answer: `You have no questions remaining to ask ${aiName.value}!` };
  } else if (newCredits > 0 && conversation.value[0]?.answer?.includes('no questions remaining')) {
    conversation.value[0] = { answer: 'Welcome, what shall we discuss today?' };
  }
});

watch(conversation, () => {
  scrollToBottom();
}, { deep: true });
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid #334;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

/* Sidebar Overlay */
.sidebar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--theme-bg-primary) 50%, transparent);
  z-index: 10;
}

/* Sidebar */
.sidebar {
  position: absolute;
  top: 0;
  left: -280px;
  width: 280px;
  height: 100%;
  background: linear-gradient(180deg, #1a2240 0%, #111828 100%);
  border-right: 2px solid var(--theme-accent);
  z-index: 20;
  transition: left 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar.open {
  left: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #1e2a4a 0%, #162038 100%);
  border-bottom: 1px solid var(--theme-accent);
}

.sidebar-header h3 {
  margin: 0;
  font-family: 'Pirata One', cursive;
  font-size: 1.1em;
  color: var(--theme-accent);
}

.close-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #fff;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.loading-history,
.no-history {
  color: #888;
  text-align: center;
  padding: 20px;
  font-size: 0.9em;
}

.history-item {
  padding: 10px 12px;
  margin-bottom: 6px;
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  border: 1px solid #334;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
  border-color: #556;
}

.history-item.active {
  background: color-mix(in srgb, var(--theme-accent) 12%, transparent);
  border-color: var(--theme-accent);
}

.history-preview {
  color: #e0e0e0;
  font-size: 0.9em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.history-date {
  color: #888;
  font-size: 0.75em;
}

/* Header */
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(180deg, #1e2a4a 0%, #162038 100%);
  border-bottom: 1px solid var(--theme-accent);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hamburger-btn {
  background: transparent;
  border: none;
  color: var(--theme-accent);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

.hamburger-btn:hover {
  color: #ffe0a0;
}

.hamburger-btn .material-symbols-outlined {
  font-size: 24px;
}

.chat-header h2 {
  margin: 0;
  font-family: 'Pirata One', cursive;
  font-size: 1.4em;
  color: var(--theme-accent);
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}

.questions-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: color-mix(in srgb, var(--theme-accent) 12%, transparent);
  border: 1px solid var(--theme-accent);
  border-radius: 20px;
  color: var(--theme-accent);
  font-size: 0.85em;
}

.questions-badge .material-symbols-outlined {
  font-size: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  border: 1px solid #445;
  border-radius: 4px;
  color: #ccc;
  font-family: 'Pirata One', cursive;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: color-mix(in srgb, var(--theme-bg-surface) 90%, transparent);
  border-color: #667;
  color: #fff;
}

.action-btn.primary {
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border-color: var(--theme-accent);
  color: var(--theme-accent);
}

.action-btn.primary:hover {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.action-btn .material-symbols-outlined {
  font-size: 18px;
}

/* Messages Area */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  scroll-behavior: smooth;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.message-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Message Styles */
.message {
  display: flex;
  max-width: 85%;
}

.user-message {
  flex-direction: column;
  align-items: flex-end;
  align-self: flex-end;
}

.user-message .message-bubble {
  background: linear-gradient(135deg, #1e2a4a 0%, #162038 100%);
  border: 1px solid #445;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 14px;
  color: #e0e0e0;
}

.user-message .message-label {
  font-size: 0.75em;
  color: #888;
  margin-top: 4px;
  margin-right: 8px;
}

.ai-message {
  align-self: flex-start;
  gap: 10px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #cc9a50 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-avatar .material-symbols-outlined {
  color: var(--theme-bg-primary);
  font-size: 20px;
}

.message-content {
  display: flex;
  flex-direction: column;
}

.ai-message .message-label {
  font-size: 0.75em;
  color: var(--theme-accent);
  margin-bottom: 4px;
  margin-left: 4px;
  font-family: 'Pirata One', cursive;
}

.ai-message .message-bubble {
  background: linear-gradient(135deg, #1a2240 0%, #131a30 100%);
  border: 1px solid var(--theme-accent);
  border-left: 3px solid var(--theme-accent);
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  color: var(--theme-text-primary);
  line-height: 1.5;
}

.ai-message .message-bubble :deep(a) {
  color: #4fc3f7;
  text-decoration: underline;
}

.ai-message .message-bubble :deep(a:hover) {
  color: #81d4fa;
}

/* Confirmation Actions */
.confirmation-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.confirm-btn {
  padding: 6px 16px;
  background: color-mix(in srgb, var(--theme-accent) 15%, transparent);
  border: 1px solid var(--theme-accent);
  border-radius: 4px;
  color: var(--theme-accent);
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.confirm-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 30%, transparent);
}

.cancel-btn {
  padding: 6px 16px;
  background: color-mix(in srgb, var(--theme-bg-surface) 50%, transparent);
  border: 1px solid #445;
  border-radius: 4px;
  color: #ccc;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: color-mix(in srgb, var(--theme-bg-surface) 70%, transparent);
  color: #fff;
}

/* Inline Proposal Card */
.proposal-inline-card {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(60, 35, 25, 0.55) 0%, rgba(26, 15, 10, 0.7) 100%);
  border: 1px solid var(--theme-accent);
  border-left: 3px solid var(--theme-accent);
  border-radius: 8px;
  align-items: flex-start;
  animation: proposal-card-in 0.32s cubic-bezier(0.2, 0.7, 0.2, 1);
}

@keyframes proposal-card-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.proposal-card-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #cc9a50 100%);
  border-radius: 50%;
  flex-shrink: 0;
}

.proposal-card-icon .material-symbols-outlined {
  font-size: 18px;
  color: var(--theme-bg-primary);
}

.proposal-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.proposal-card-eyebrow {
  font-family: 'Pirata One', cursive;
  font-size: 0.75em;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: var(--theme-accent);
}

.proposal-card-text {
  margin: 0;
  font-size: 0.92em;
  color: var(--theme-text-primary);
  line-height: 1.4;
}

.proposal-card-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--theme-accent) 18%, transparent);
  border: 1px solid var(--theme-accent);
  border-radius: 6px;
  color: var(--theme-accent);
  font-family: 'Pirata One', cursive;
  font-size: 0.85em;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.18s;
}

.proposal-card-btn:hover {
  background: color-mix(in srgb, var(--theme-accent) 32%, transparent);
  transform: translateY(-1px);
}

.proposal-card-btn .material-symbols-outlined {
  font-size: 16px;
}

.proposal-action-create { border-left-color: #6cd07a; }
.proposal-action-create .proposal-card-icon { background: linear-gradient(135deg, #6cd07a 0%, #2e7a3a 100%); }

.proposal-action-hide { border-left-color: #d99a9a; }
.proposal-action-hide .proposal-card-icon { background: linear-gradient(135deg, #d99a9a 0%, #5a2e2e 100%); }

.proposal-action-reorder { border-left-color: #92b9e6; }
.proposal-action-reorder .proposal-card-icon { background: linear-gradient(135deg, #92b9e6 0%, #2e5a8a 100%); }

/* Tool Indicator */
.tool-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #888;
  font-size: 0.8em;
  font-style: italic;
}

.tool-indicator .material-symbols-outlined {
  font-size: 14px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Thinking Animation */
.thinking .message-bubble {
  padding: 14px 20px;
}

.thinking-dots {
  display: flex;
  gap: 6px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  background: var(--theme-accent);
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite;
}

.thinking-dots span:nth-child(1) { animation-delay: 0s; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-8px); opacity: 1; }
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(180, 60, 60, 0.3);
  border-top: 1px solid #b44;
  color: #f88;
  font-size: 0.9em;
}

/* Input Area */
.input-area {
  padding: 12px 16px;
  background: linear-gradient(180deg, #162038 0%, #1e2a4a 100%);
  border-top: 1px solid var(--theme-accent);
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #111828;
  border: 1px solid #334;
  border-radius: 8px;
  padding: 8px 12px;
}

.input-wrapper textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--theme-text-primary);
  font-size: 1em;
  line-height: 1.4;
  resize: none;
  min-height: 24px;
  max-height: 5em;
  padding: 4px 0;
  font-family: inherit;
}

.input-wrapper textarea::placeholder {
  color: #666;
}

.input-wrapper textarea:focus {
  outline: none;
}

.input-wrapper textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--theme-accent) 0%, #cc9a50 100%);
  border: none;
  border-radius: 50%;
  color: var(--theme-bg-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--theme-accent) 40%, transparent);
}

.send-btn:disabled {
  background: #444;
  cursor: not-allowed;
  opacity: 0.5;
}

.send-btn .material-symbols-outlined {
  font-size: 20px;
}

/* Scrollbar */
.messages-area::-webkit-scrollbar {
  width: 8px;
}

.messages-area::-webkit-scrollbar-track {
  background: #111828;
}

.messages-area::-webkit-scrollbar-thumb {
  background: #334;
  border-radius: 4px;
}

.messages-area::-webkit-scrollbar-thumb:hover {
  background: #556;
}

/* Sidebar Scrollbar */
.sidebar-content::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #111828;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #334;
  border-radius: 3px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #556;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .btn-text {
    display: none;
  }

  .chat-header {
    padding: 8px 12px;
  }

  .header-left {
    gap: 8px;
  }

  .action-btn {
    padding: 8px;
    min-width: 40px;
    min-height: 40px;
    justify-content: center;
  }

  .header-actions {
    gap: 6px;
  }

  .messages-area {
    padding: 10px;
  }

  .messages-wrapper {
    gap: 12px;
  }

  .message {
    max-width: 95%;
  }

  .message-group {
    gap: 10px;
  }

  .user-message .message-bubble {
    padding: 8px 12px;
  }

  .ai-message .message-bubble {
    padding: 10px 12px;
  }

  .message-avatar {
    display: none;
  }

  .ai-message {
    display: block;
  }

  .input-area {
    padding: 10px 12px;
  }

  .input-wrapper {
    padding: 6px 10px;
  }

  .questions-badge {
    padding: 4px 8px;
    font-size: 0.8em;
  }

  .sidebar {
    width: 260px;
    left: -260px;
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: 6px 10px;
  }

  .messages-area {
    padding: 8px;
  }

  .message {
    max-width: 98%;
  }

  .ai-message .message-bubble {
    padding: 8px 10px;
    font-size: 0.95em;
  }

  .user-message .message-bubble {
    padding: 6px 10px;
    font-size: 0.95em;
  }

  .input-area {
    padding: 8px 10px;
  }

  .send-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
