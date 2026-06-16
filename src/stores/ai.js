import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';
import { useRealmStore } from '@shared/stores/realm';

const AI_API_URL = import.meta.env.VITE_AI_API_BASE_URL;

export const useAIStore = defineStore('ai', {
    state: () => ({
        conversations: [],
        activeConversation: null,
        activeConversationId: null,
        credits: 0,
        realmCredits: 0,
        userCredits: 0,
        modelTier: 'standard',
        isLoading: false,
        isLoadingHistory: false,
        error: null,
    }),

    getters: {
        realmId() {
            const realmStore = useRealmStore();
            return realmStore.activeRealm?.RealmID;
        },
    },

    actions: {
        _getBaseUrl() {
            return AI_API_URL || import.meta.env.VITE_API_BASE_URL;
        },

        async sendMessage(question, confirmed = false, connectionId = null) {
            if (!this.realmId) {
                this.error = 'No active realm selected';
                return null;
            }

            this.isLoading = true;
            this.error = null;

            try {
                const response = await apiClient.post(`${this._getBaseUrl()}/ai/consult`, {
                    question,
                    realmId: this.realmId,
                    modelTier: this.modelTier,
                    ...(this.activeConversationId && { conversationId: this.activeConversationId }),
                    ...(confirmed && { confirmed: true }),
                    ...(connectionId && { connectionId }),
                });

                const data = response.data;

                // Update conversation ID
                if (data.conversationId) {
                    this.activeConversationId = data.conversationId;
                }

                // Update credits from server response
                if (data.creditsRemaining !== undefined) {
                    this.credits = data.creditsRemaining;
                }

                // Streaming path: backend accepted async, answer will arrive via WebSocket
                if (data.status === 'streaming') {
                    return data;
                }

                return data;
            } catch (err) {
                console.error('Failed to send message:', err);
                this.error = err.response?.data?.error || err.message || 'Failed to send message';
                return null;
            } finally {
                this.isLoading = false;
            }
        },

        async loadHistory() {
            if (!this.realmId) return;

            this.isLoadingHistory = true;
            try {
                const response = await apiClient.get(
                    `${this._getBaseUrl()}/ai/consult/history`,
                    { params: { realmId: this.realmId } }
                );
                this.conversations = response.data.conversations || [];
            } catch (err) {
                console.error('Failed to load history:', err);
                this.conversations = [];
            } finally {
                this.isLoadingHistory = false;
            }
        },

        async loadConversation(conversationId) {
            if (!this.realmId) return;

            this.isLoading = true;
            this.error = null;
            try {
                const response = await apiClient.get(
                    `${this._getBaseUrl()}/ai/consult/${conversationId}`,
                    { params: { realmId: this.realmId } }
                );

                const conv = response.data.conversation;
                this.activeConversationId = conversationId;

                // Transform messages into question/answer pairs
                const messages = conv.messages || [];
                const pairs = [];
                for (let i = 0; i < messages.length; i += 2) {
                    const userMsg = messages[i];
                    const assistantMsg = messages[i + 1];
                    if (userMsg?.role === 'user') {
                        pairs.push({
                            question: userMsg.content,
                            answer: assistantMsg?.content?.replace(/\n/g, '<br />') || '',
                        });
                    }
                }
                this.activeConversation = pairs;
            } catch (err) {
                console.error('Failed to load conversation:', err);
                this.error = 'Failed to load conversation';
            } finally {
                this.isLoading = false;
            }
        },

        async getCredits() {
            if (!this.realmId) return;

            try {
                const response = await apiClient.get(`${this._getBaseUrl()}/ai/credits`, {
                    params: { realmId: this.realmId },
                });
                this.credits = response.data.credits || 0;
                this.realmCredits = response.data.realmCredits || 0;
                this.userCredits = response.data.userCredits || 0;
            } catch (err) {
                console.error('Failed to fetch credits:', err);
            }
        },

        async verifyPayment(orderId, questionsAmount) {
            try {
                const response = await apiClient.post(`${this._getBaseUrl()}/ai/verify-payment`, {
                    orderId,
                    questionsAmount,
                    realmId: this.realmId,
                });
                if (response.data.success && response.data.newTotal !== undefined) {
                    this.userCredits = response.data.newTotal;
                    this.credits = this.realmCredits + this.userCredits;
                }
                return response.data;
            } catch (err) {
                console.error('Failed to verify payment:', err);
                return { success: false, error: err.message };
            }
        },

        async sendDeepDecision(conversationId, decision) {
            try {
                await apiClient.post(`${this._getBaseUrl()}/ai/consult/deep-decision`, {
                    conversationId,
                    decision,
                });
                return true;
            } catch (err) {
                console.error('Failed to send deep-search decision:', err);
                this.error = 'Failed to send your choice. Please try again.';
                return false;
            }
        },

        startNewConversation() {
            this.activeConversationId = null;
            this.activeConversation = null;
            this.error = null;
        },
    },
});
