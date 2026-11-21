import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';

vi.mock('@shared/utils/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));
vi.mock('@shared/stores/realm', () => ({
    useRealmStore: () => ({ activeRealm: { RealmID: 'r1' } }),
}));
vi.mock('@shared/stores/account', () => ({
    useAccountStore: () => ({ account: {}, preferredLLM: 'standard', getAccount: vi.fn(), setPreferredLLM: vi.fn() }),
}));

// dompurify is installed by the consuming apps, not by shared.
vi.mock('@shared/utils/sanitizeAIHtml', () => ({ sanitizeAIHtml: (h) => h }));

let cbs;
let isStreaming;
vi.mock('@shared/composables/useAIStream', () => ({
    useAIStream: () => ({
        connectionId: ref('conn'), isConnected: ref(true), isStreaming,
        connect: vi.fn(), disconnect: vi.fn(), startStreaming: vi.fn(),
        onToken: (f) => { cbs.token = f; },
        onToolUse: (f) => { cbs.toolUse = f; },
        onComplete: (f) => { cbs.complete = f; },
        onError: (f) => { cbs.error = f; },
        onNeedMoreCredits: (f) => { cbs.needMore = f; },
        onDeepProgress: (f) => { cbs.deep = f; },
        onGossip: (f) => { cbs.gossip = f; },
    }),
}));

import AIChat from '../AIChat.vue';
import { useAIStore } from '@shared/stores/ai';
import apiClient from '@shared/utils/api';

let store;
async function setup() {
    store = useAIStore();
    store.credits = 5;
    store.activeConversationId = 'c1';
    store.getCredits = vi.fn();
    const w = mount(AIChat);
    await flushPromises();
    return w;
}
const aiBubbles = (w) => w.findAll('.ai-message .message-bubble');

beforeEach(() => {
    setActivePinia(createPinia());
    cbs = {};
    isStreaming = ref(false);
    vi.clearAllMocks();
});

describe('AIChat gossip', () => {
    it('gossip shown as a Lorekeeper bubble after the answer', async () => {
        const w = await setup();
        w.vm.conversation.push({ question: 'Who rules?', answer: '' });
        cbs.complete({ answer: 'Queen Mira.' });
        cbs.gossip({ conversationId: 'c1', text: 'They say <b>Mira</b> hides a secret.' });
        await flushPromises();
        const bubbles = aiBubbles(w);
        const last = bubbles[bubbles.length - 1];
        expect(last.text()).toBe('They say <b>Mira</b> hides a secret.');
        expect(last.find('b').exists()).toBe(false);
        expect(bubbles[bubbles.length - 2].text()).toContain('Queen Mira.');
    });

    it('ignored when another conversation is open', async () => {
        const w = await setup();
        const before = aiBubbles(w).length;
        cbs.gossip({ conversationId: 'other', text: 'Stray gossip.' });
        await flushPromises();
        expect(aiBubbles(w).length).toBe(before);
    });

    it('ignored when a new stream started', async () => {
        const w = await setup();
        const before = aiBubbles(w).length;
        isStreaming.value = true;
        cbs.gossip({ conversationId: 'c1', text: 'Too late.' });
        await flushPromises();
        expect(aiBubbles(w).length).toBe(before);
        isStreaming.value = false;
        store.isLoading = true;
        cbs.gossip({ conversationId: 'c1', text: 'Still too late.' });
        await flushPromises();
        expect(w.vm.conversation.length).toBe(1);
    });
});

describe('AI store history', () => {
    it('history with two assistant messages renders two bubbles', async () => {
        const w = await setup();
        apiClient.get.mockResolvedValue({ data: { conversation: { messages: [
            { role: 'user', content: 'Who rules?' },
            { role: 'assistant', content: 'Queen Mira.' },
            { role: 'assistant', content: 'Folk whisper about her heir.' },
            { role: 'user', content: 'And then?' },
            { role: 'assistant', content: 'Peace.' },
        ] } } });
        w.vm.handleLoadConversation('c1');
        await flushPromises();
        const texts = aiBubbles(w).map((b) => b.text());
        expect(texts).toEqual(['Queen Mira.', 'Folk whisper about her heir.', 'Peace.']);
    });
});
