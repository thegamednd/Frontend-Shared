import { defineStore } from 'pinia';
import { useRealmStore } from '@shared/stores/realm';
import apiClient from '@shared/utils/api';

export const useSessionStore = defineStore('session', {
    state: () => ({
        sessions: {},
        myInvitations: [],
        loaded: false,
        loading: false,
    }),
    getters: {
        arSessions(state) {
            return Object.values(state.sessions);
        },
        activeRealmSessions() {
            const realmStore = useRealmStore();
            if (!realmStore.activeRealm) return [];
            return this.arSessions.filter(
                session => session.RealmID === realmStore.activeRealm.RealmID
            );
        },
        upcomingSessions() {
            const now = Date.now();
            return this.activeRealmSessions
                .filter(session =>
                    session.Status !== 'cancelled' &&
                    session.StartDateTime * 1000 >= now
                )
                .sort((a, b) => a.StartDateTime - b.StartDateTime);
        },
        pastSessions() {
            const now = Date.now();
            return this.activeRealmSessions
                .filter(session => session.StartDateTime * 1000 < now)
                .sort((a, b) => b.StartDateTime - a.StartDateTime);
        },
        nextInvitedSession(state) {
            const upcomingInvitations = state.myInvitations
                .filter(invitation => {
                    if (invitation.Status === 'declined') return false;
                    if (!invitation.Session) return false;
                    if (invitation.Session.Status === 'cancelled') return false;
                    return true;
                })
                .sort((a, b) => a.Session.StartDateTime - b.Session.StartDateTime);
            return upcomingInvitations.length > 0 ? upcomingInvitations[0] : null;
        },
    },
    actions: {
        async loadRealmSessions(realmId) {
            const realmStore = useRealmStore();
            const targetRealmId = realmId || realmStore.activeRealm?.RealmID;

            if (!targetRealmId) {
                console.warn('No realm ID provided to load sessions');
                return;
            }

            this.loading = true;
            try {
                const response = await apiClient.get(`/scheduling/realm/${targetRealmId}`);

                if (response.data && response.data.sessions && Array.isArray(response.data.sessions)) {
                    response.data.sessions.forEach(session => {
                        this.sessions[session.SessionID] = session;
                    });
                }

                this.loaded = true;
            } catch (error) {
                console.error('Error loading realm sessions:', error);
                throw error;
            } finally {
                this.loading = false;
            }
        },

        async loadSession(sessionId) {
            try {
                const response = await apiClient.get(`/scheduling/session/${sessionId}`);

                if (response.data) {
                    this.sessions[sessionId] = response.data;
                }

                return response.data;
            } catch (error) {
                console.error('Error loading session:', error);
                throw error;
            }
        },

        async createSession(sessionData) {
            const realmStore = useRealmStore();

            if (!realmStore.activeRealm) {
                throw new Error('No active realm');
            }

            try {
                const startDateTime = Math.floor(new Date(sessionData.scheduledTime).getTime() / 1000);

                const payload = {
                    RealmID: realmStore.activeRealm.RealmID,
                    Title: sessionData.title,
                    Description: sessionData.description || '',
                    StartDateTime: startDateTime,
                    Duration: sessionData.duration || 240,
                };

                if (sessionData.invitedPlayers && sessionData.invitedPlayers.length > 0) {
                    payload.UserSubs = sessionData.invitedPlayers;
                }

                const response = await apiClient.post('/scheduling/session', payload);

                if (response.data) {
                    this.sessions[response.data.SessionID] = response.data;
                }

                return response.data;
            } catch (error) {
                console.error('Error creating session:', error);
                throw error;
            }
        },

        async updateSession(sessionId, updates) {
            try {
                const response = await apiClient.put(`/scheduling/session/${sessionId}`, updates);

                if (response.data) {
                    this.sessions[sessionId] = response.data;
                }

                return response.data;
            } catch (error) {
                console.error('Error updating session:', error);
                throw error;
            }
        },

        async deleteSession(sessionId) {
            try {
                await apiClient.delete(`/scheduling/session/${sessionId}`);
                delete this.sessions[sessionId];
            } catch (error) {
                console.error('Error deleting session:', error);
                throw error;
            }
        },

        async sendInvitations(sessionId, invitationData) {
            try {
                const response = await apiClient.post(
                    `/scheduling/session/${sessionId}/invitations`,
                    invitationData
                );
                await this.loadSession(sessionId);
                return response.data;
            } catch (error) {
                console.error('Error sending invitations:', error);
                throw error;
            }
        },

        async updateRSVP(sessionId, status) {
            try {
                const response = await apiClient.put(`/scheduling/session/${sessionId}/rsvp`, {
                    Status: status
                });
                await this.loadSession(sessionId);
                return response.data;
            } catch (error) {
                console.error('Error updating RSVP:', error);
                throw error;
            }
        },

        async reviewRSVP(sessionId, userSub, status) {
            try {
                const response = await apiClient.put(
                    `/scheduling/session/${sessionId}/rsvp/${userSub}/review`,
                    { Status: status }
                );
                await this.loadSession(sessionId);
                return response.data;
            } catch (error) {
                console.error('Error reviewing RSVP:', error);
                throw error;
            }
        },

        async lockSession(sessionId) {
            try {
                const response = await apiClient.post(`/scheduling/session/${sessionId}/lock`);
                if (response.data) {
                    this.sessions[sessionId] = response.data;
                }
                return response.data;
            } catch (error) {
                console.error('Error locking session:', error);
                throw error;
            }
        },

        async unlockSession(sessionId) {
            try {
                const response = await apiClient.post(`/scheduling/session/${sessionId}/unlock`);
                if (response.data) {
                    this.sessions[sessionId] = response.data;
                }
                return response.data;
            } catch (error) {
                console.error('Error unlocking session:', error);
                throw error;
            }
        },

        async loadMyInvitations() {
            try {
                const response = await apiClient.get('/scheduling/my-invitations');

                if (response.data && response.data.invitations && Array.isArray(response.data.invitations)) {
                    this.myInvitations = response.data.invitations;

                    response.data.invitations.forEach(invitation => {
                        if (invitation.Session) {
                            this.sessions[invitation.Session.SessionID] = invitation.Session;
                        }
                    });
                }
            } catch (error) {
                console.error('Error loading my invitations:', error);
                throw error;
            }
        },

        clearSessions() {
            this.sessions = {};
            this.myInvitations = [];
            this.loaded = false;
        },
    },
});
