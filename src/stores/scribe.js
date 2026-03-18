import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';
import axios from 'axios';
import { useRealmStore } from '@shared/stores/realm';
import { splitAudioIfNeeded } from '@shared/utils/audioSplitter';

const SESSIONS_BASE_URL = import.meta.env.VITE_SESSIONS_API_BASE_URL || import.meta.env.VITE_API_BASE_URL;

export const useScribeStore = defineStore('scribe', {
    state: () => ({
        currentSession: null,
        sessions: [],
        loaded: false,
        error: null,
        uploading: false,
        processing: false,
        uploadProgress: 0,
        isSplitting: false,
        walletBalance: null,
    }),

    getters: {
        currentStatus: (state) => state.currentSession?.status || null,
        isProcessing: (state) => {
            const s = state.currentSession?.status;
            return s === 'processing' || s === 'transcribing' || s === 'generating';
        },
    },

    actions: {
        _getRealmId() {
            const realmStore = useRealmStore();
            return realmStore.activeRealm?.RealmID;
        },

        async startSession(userName) {
            try {
                this.error = null;
                const realmId = this._getRealmId();
                const response = await apiClient.post(`${SESSIONS_BASE_URL}/sessions/session`, { userName, realmId });
                this.currentSession = response.data;
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async uploadChunk(sessionId, chunkIndex, blob) {
            try {
                this.uploading = true;
                const realmId = this._getRealmId();

                // Get pre-signed URL
                const urlResponse = await apiClient.post(
                    `${SESSIONS_BASE_URL}/sessions/session/${sessionId}/upload-url`,
                    { chunkIndex, contentType: blob.type || 'audio/webm', realmId }
                );

                const { uploadUrl } = urlResponse.data;

                // Upload directly to S3
                await axios.put(uploadUrl, blob, {
                    headers: {
                        'Content-Type': blob.type || 'audio/webm',
                    },
                });

                return true;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            } finally {
                this.uploading = false;
            }
        },

        async uploadRecording(userName, file) {
            try {
                this.error = null;
                this.uploadProgress = 0;
                this.isSplitting = false;

                // Create session
                const session = await this.startSession(userName);
                const sessionId = session.sessionId;

                // Split if needed (handles duration detection internally)
                this.isSplitting = true;
                const segments = await splitAudioIfNeeded(file, (progress) => {
                    this.uploadProgress = Math.round(progress / 2);
                });
                this.isSplitting = false;
                const preSplitChunks = segments.length > 1;
                this.uploadProgress = preSplitChunks ? 50 : 0;

                // Upload each segment as a separate chunk
                const uploadProgressBase = preSplitChunks ? 50 : 0;
                const uploadProgressRange = preSplitChunks ? 50 : 100;

                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const contentType = segment.type || file.type;
                    const realmId = this._getRealmId();

                    const urlResponse = await apiClient.post(
                        `${SESSIONS_BASE_URL}/sessions/session/${sessionId}/upload-url`,
                        { chunkIndex: i, contentType, realmId }
                    );

                    const { uploadUrl } = urlResponse.data;

                    await axios.put(uploadUrl, segment, {
                        headers: {
                            'Content-Type': contentType,
                        },
                        onUploadProgress: (progressEvent) => {
                            if (progressEvent.total) {
                                const segmentFraction = (i + progressEvent.loaded / progressEvent.total) / segments.length;
                                this.uploadProgress = Math.round(
                                    uploadProgressBase + segmentFraction * uploadProgressRange
                                );
                            }
                        },
                    });
                }

                this.uploadProgress = 100;

                // Detect audio duration before ending session
                let audioDurationSeconds;
                try {
                    audioDurationSeconds = await new Promise((resolve, reject) => {
                        const audio = new Audio();
                        audio.preload = 'metadata';
                        audio.onloadedmetadata = () => {
                            if (audio.duration && isFinite(audio.duration)) {
                                resolve(Math.round(audio.duration));
                            } else {
                                resolve(undefined);
                            }
                            URL.revokeObjectURL(audio.src);
                        };
                        audio.onerror = () => {
                            URL.revokeObjectURL(audio.src);
                            resolve(undefined);
                        };
                        audio.src = URL.createObjectURL(file);
                        // Timeout after 5s
                        setTimeout(() => { URL.revokeObjectURL(audio.src); resolve(undefined); }, 5000);
                    });
                } catch {
                    // Graceful fallback — server will estimate from chunk count
                }

                // End session — audio sits in S3 as 'uploaded' until user triggers processing
                const endBody = {
                    ...(preSplitChunks && { preSplitChunks: true }),
                    ...(audioDurationSeconds && { audioDurationSeconds }),
                };
                await this.endSession(sessionId, Object.keys(endBody).length ? endBody : undefined);

                // Refresh session so UI shows the uploaded state
                await this.getSession(sessionId);

                return session;
            } catch (err) {
                this.isSplitting = false;
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async endSession(sessionId, body) {
            try {
                this.processing = true;
                const realmId = this._getRealmId();
                const payload = { ...body, realmId };
                const response = await apiClient.put(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}/end`, payload);
                if (this.currentSession) {
                    this.currentSession.status = 'uploaded';
                }
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async processSession(sessionId) {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.post(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}/process`, { realmId });
                if (this.currentSession) {
                    this.currentSession.status = 'processing';
                }
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async getSession(sessionId) {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.get(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}`, {
                    params: { realmId },
                });
                this.currentSession = response.data;
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async listSessions() {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.get(`${SESSIONS_BASE_URL}/sessions`, {
                    params: { realmId },
                });
                this.sessions = response.data;
                this.loaded = true;
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async saveDraft(sessionId, data) {
            try {
                const realmId = this._getRealmId();
                await apiClient.put(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}/save`, { ...data, realmId });
                if (this.currentSession) {
                    this.currentSession.draftReport = data.report;
                    if (data.characters || data.dom !== undefined) {
                        this.currentSession.inferredMeta = {
                            ...this.currentSession.inferredMeta,
                            ...data,
                        };
                    }
                }
                return { success: true };
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async publishReport(sessionId, reportData) {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.post(
                    `${SESSIONS_BASE_URL}/sessions/session/${sessionId}/publish`,
                    { ...reportData, realmId }
                );
                if (this.currentSession) {
                    this.currentSession.status = 'published';
                    this.currentSession.publishedReportId = response.data.reportId;
                }
                this.processing = false;
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async revertToReview(sessionId) {
            try {
                const realmId = this._getRealmId();
                await apiClient.put(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}/revert`, { realmId });
                if (this.currentSession) {
                    this.currentSession.status = 'review';
                }
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async getWallet() {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.get(`${SESSIONS_BASE_URL}/sessions/wallet`, {
                    params: { realmId },
                });
                this.walletBalance = response.data.balance;
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async verifyScribePayment(orderId, amount) {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.post(`${SESSIONS_BASE_URL}/sessions/wallet/add-funds`, {
                    orderId, amount, realmId,
                });
                if (response.data.balance !== undefined) {
                    this.walletBalance = response.data.balance;
                }
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async deleteSession(sessionId) {
            try {
                const realmId = this._getRealmId();
                await apiClient.delete(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}`, {
                    params: { realmId },
                });
                if (this.currentSession?.sessionId === sessionId) {
                    this.currentSession = null;
                }
                this.sessions = this.sessions.filter(s => s.sessionId !== sessionId);
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async getDownloadUrls(sessionId) {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.get(`${SESSIONS_BASE_URL}/sessions/session/${sessionId}/download-urls`, {
                    params: { realmId },
                });
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        async adminSetWalletBalance(balance) {
            try {
                const realmId = this._getRealmId();
                const response = await apiClient.post(`${SESSIONS_BASE_URL}/sessions/wallet/admin-set`, {
                    balance, realmId,
                });
                if (response.data.balance !== undefined) {
                    this.walletBalance = response.data.balance;
                }
                return response.data;
            } catch (err) {
                this.error = err.response?.data?.message || err.message;
                throw err;
            }
        },

        clearCurrentSession() {
            this.currentSession = null;
            this.processing = false;
            this.uploadProgress = 0;
            this.error = null;
        },
    },
});
