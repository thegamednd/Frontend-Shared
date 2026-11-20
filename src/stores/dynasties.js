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

const POLL_MS = 2000;
// Letters take longer; a committed run waiting only on its letters is polled less often.
const LETTERS_POLL_MS = 10000;
// A committed run's letters are given up on this long after the save.
const LETTERS_WAIT_MS = 10 * 60 * 1000;
// Module level so it never lands in reactive state.
let pollTimer = null;
// Bumped on every pollRun and stopPolling, so a tick from an older loop does nothing.
let pollGen = 0;

export const useDynastiesStore = defineStore('dynasties', {
    state: () => ({
        houses: [],
        status: null,
        house: null,
        person: null,
        loading: false,
        error: null,
        advance: { state: null, run: null, polling: false, error: null },
        letters: { players: null, error: null },
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
        // ============ Yearly advance ============
        async fetchAdvance() {
            return this._run(async () => {
                const res = await apiClient.get('/dynasties/advance');
                this.advance.state = res.data.data;
                if (res.data.data?.latestRun) this.advance.run = res.data.data.latestRun;
                return res.data.data;
            }, { loading: true });
        },
        async setCurrentTo(year) {
            return this._run(async () => {
                const res = await apiClient.put('/dynasties/advance/year', { year });
                await this._refreshQuietly(() => this.fetchAdvance());
                return res.data.data;
            });
        },
        async startAdvance() {
            return this._run(async () => {
                const res = await apiClient.post('/dynasties/advance/runs');
                this.advance.run = res.data.data;
                return res.data.data;
            });
        },
        // Fetches the run now and again every 2 seconds while it is running or
        // committing, or every 10 seconds while it is committed with its letters
        // still queued (for up to 10 minutes from committedAt). Stops on any other
        // status, on an error, or stopPolling().
        async pollRun(id) {
            this.stopPolling();
            const gen = pollGen;
            this.advance.polling = true;
            this.advance.error = null;
            const tick = async () => {
                try {
                    const res = await apiClient.get(`/dynasties/advance/runs/${enc(id)}`);
                    if (gen !== pollGen) return;
                    this.advance.run = res.data.data;
                } catch (err) {
                    if (gen !== pollGen) return;
                    this.advance.error = toError(err);
                    this.stopPolling();
                    return;
                }
                const status = this.advance.run?.status;
                const r = this.advance.run;
                const lettersPending =
                    status === 'committed' &&
                    r?.result?.letters === 'queued' &&
                    Date.now() - Date.parse(r.result.committedAt || '') < LETTERS_WAIT_MS;
                if (status === 'running' || status === 'committing') {
                    pollTimer = setTimeout(tick, POLL_MS);
                } else if (lettersPending) {
                    pollTimer = setTimeout(tick, LETTERS_POLL_MS);
                } else {
                    this.stopPolling();
                }
            };
            await tick();
            return this.advance.run;
        },
        stopPolling() {
            pollGen++;
            if (pollTimer) clearTimeout(pollTimer);
            pollTimer = null;
            this.advance.polling = false;
        },
        async fetchLetters() {
            this.letters.error = null;
            try {
                const res = await apiClient.get('/dynasties/letters');
                this.letters.players = res.data.data.players || [];
            } catch (err) {
                this.letters.error = toError(err);
                throw err;
            }
        },
        // Optimistic: flips the switch at once and puts it back if the save fails.
        async setLetters(userId, on) {
            const row = this.letters.players?.find((p) => p.userId === userId);
            const before = row?.on;
            this.letters.error = null;
            if (row) row.on = on;
            try {
                await apiClient.put(`/dynasties/letters/${enc(userId)}`, { on });
            } catch (err) {
                if (row) row.on = before;
                this.letters.error = toError(err);
                throw err;
            }
        },
        async editRun(id, edits) {
            return this._run(async () => {
                const res = await apiClient.patch(`/dynasties/advance/runs/${enc(id)}`, { edits });
                this.advance.run = res.data.data;
                return res.data.data;
            });
        },
        async addPlayerEvent(id, body) {
            return this._run(async () => {
                const res = await apiClient.post(`/dynasties/advance/runs/${enc(id)}/events`, body);
                this.advance.run = res.data.data;
                return res.data.data;
            });
        },
        async removePlayerEvent(id, ref) {
            return this._run(async () => {
                const res = await apiClient.delete(`/dynasties/advance/runs/${enc(id)}/events/${enc(ref)}`);
                this.advance.run = res.data.data;
                return res.data.data;
            });
        },
        async commitRun(id) {
            return this._run(async () => {
                const res = await apiClient.post(`/dynasties/advance/runs/${enc(id)}/commit`);
                this.advance.run = res.data.data;
                return res.data.data;
            });
        },
        async discardRun(id) {
            return this._run(async () => {
                this.stopPolling();
                await apiClient.delete(`/dynasties/advance/runs/${enc(id)}`);
                this.advance.run = null;
            });
        },
        async previewDrop(houseId) {
            return this._run(async () => {
                const res = await apiClient.get(`/dynasties/houses/${enc(houseId)}/drop-generation`);
                return res.data.data;
            });
        },
        async dropGeneration(houseId) {
            return this._run(async () => {
                const res = await apiClient.post(`/dynasties/houses/${enc(houseId)}/drop-generation`);
                await this._refreshCurrent();
                await this._refreshQuietly(() => this.fetchHouses());
                return res.data.data;
            });
        },
        async fetchHistoryYears(houseId) {
            return this._run(async () => {
                const res = await apiClient.get(`/dynasties/houses/${enc(houseId)}/history`);
                return res.data.data.years;
            });
        },
        async fetchHistory(houseId, year) {
            return this._run(async () => {
                const res = await apiClient.get(`/dynasties/houses/${enc(houseId)}/history/${enc(year)}`);
                return res.data.data;
            });
        },
    },
});
