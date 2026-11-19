import { defineStore } from 'pinia';
import apiClient from '@shared/utils/api';

const toError = (err) => {
    const e = err?.response?.data?.error || {};
    const extra = e.extra || {};
    return {
        code: e.code || 'UNKNOWN',
        message: e.message || err?.message || 'Request failed',
        upgrade: extra.upgrade ?? e.upgrade,
        limit: extra.limit ?? e.limit,
    };
};

const enc = encodeURIComponent;

export const useDynastiesStore = defineStore('dynasties', {
    state: () => ({
        houses: [],
        status: null,
        house: null,
        person: null,
        loading: false,
        error: null,
    }),
    getters: {
        limitReached: (state) => (houseId) => {
            const h = state.houses.find((x) => x.id === houseId);
            const cap = state.status?.limits?.hardCap;
            return {
                full: !!h && cap != null && h.livingCount >= cap,
                frozen: !!h?.frozen,
            };
        },
    },
    actions: {
        // Runs a call, recording the server's refusal on failure and rethrowing.
        async _run(fn, { loading = false } = {}) {
            this.error = null;
            if (loading) this.loading = true;
            try {
                return await fn();
            } catch (err) {
                this.error = toError(err);
                throw err;
            } finally {
                if (loading) this.loading = false;
            }
        },
        // Refetch after a successful write. The write already happened, so a
        // failed refetch is logged and never reported as a failed save (a retry
        // would create a duplicate).
        async _refreshQuietly(fn) {
            try {
                await fn();
            } catch (err) {
                this.error = null;
                console.warn('Dynasties: refresh after save failed', err);
            }
        },
        // Refetch whichever view is open: person, else house.
        async _refreshCurrent() {
            await this._refreshQuietly(async () => {
                if (this.person?.person?.id) await this.fetchPerson(this.person.person.id);
                else if (this.house?.house?.id) await this.fetchHouse(this.house.house.id);
            });
        },
        async fetchHouses() {
            return this._run(async () => {
                const res = await apiClient.get('/dynasties/houses');
                const data = res.data.data;
                this.houses = data.houses;
                this.status = data.status;
                return data;
            }, { loading: true });
        },
        async fetchHouse(id) {
            return this._run(async () => {
                const res = await apiClient.get(`/dynasties/houses/${enc(id)}`);
                this.house = res.data.data;
                return this.house;
            }, { loading: true });
        },
        async fetchPerson(id) {
            return this._run(async () => {
                const res = await apiClient.get(`/dynasties/people/${enc(id)}`);
                this.person = res.data.data;
                return this.person;
            }, { loading: true });
        },
        async search(q) {
            return this._run(async () => {
                const res = await apiClient.get('/dynasties/search', { params: { q } });
                return res.data.data;
            });
        },
        async peopleNames(ids) {
            if (!ids?.length) return [];
            return this._run(async () => {
                const res = await apiClient.get('/dynasties/people-names', {
                    params: { ids: ids.join(',') },
                });
                return res.data.data;
            });
        },
        async saveHouse(house) {
            return this._run(async () => {
                const res = house.id
                    ? await apiClient.put(`/dynasties/houses/${enc(house.id)}`, house)
                    : await apiClient.post('/dynasties/houses', house);
                await this._refreshQuietly(async () => {
                    await this.fetchHouses();
                    if (this.house?.house?.id) await this.fetchHouse(this.house.house.id);
                });
                return res.data.data;
            });
        },
        async deleteHouse(id) {
            return this._run(async () => {
                await apiClient.delete(`/dynasties/houses/${enc(id)}`);
                if (this.house?.house?.id === id) this.house = null;
                await this._refreshQuietly(() => this.fetchHouses());
            });
        },
        async setActiveHouses(ids) {
            return this._run(async () => {
                const res = await apiClient.put('/dynasties/activation', { activeIds: ids });
                const data = res.data.data;
                this.houses = data.houses;
                this.status = data.status;
                return data;
            });
        },
        async savePerson(person) {
            return this._run(async () => {
                const res = person.id
                    ? await apiClient.put(`/dynasties/people/${enc(person.id)}`, person)
                    : await apiClient.post('/dynasties/people', person);
                await this._refreshCurrent();
                return res.data.data;
            });
        },
        async deletePerson(id) {
            return this._run(async () => {
                await apiClient.delete(`/dynasties/people/${enc(id)}`);
                if (this.person?.person?.id === id) this.person = null;
                await this._refreshCurrent();
            });
        },
        // Administrators and Deities only: show a hidden person to everyone.
        async revealPerson(id) {
            return this._run(async () => {
                const res = await apiClient.post(`/dynasties/people/${enc(id)}/reveal`);
                await this._refreshCurrent();
                return res.data.data;
            });
        },
        async saveMarriage(m) {
            return this._run(async () => {
                const res = m.id
                    ? await apiClient.put(`/dynasties/marriages/${enc(m.id)}`, m)
                    : await apiClient.post('/dynasties/marriages', m);
                await this._refreshCurrent();
                return res.data.data;
            });
        },
        async deleteMarriage(id) {
            return this._run(async () => {
                await apiClient.delete(`/dynasties/marriages/${enc(id)}`);
                await this._refreshCurrent();
            });
        },
    },
});
