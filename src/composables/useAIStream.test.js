import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: vi.fn(async () => ({ tokens: {} })) }));

let sockets;
class FakeSocket {
    constructor() { this.send = vi.fn(); this.close = vi.fn(); sockets.push(this); }
}

async function setup() {
    vi.resetModules();
    vi.stubEnv('VITE_WEBSOCKET_URL', 'wss://example.test');
    const { useAIStream } = await import('./useAIStream');
    const stream = useAIStream();
    await stream.connect();
    const emit = (msg) => sockets[0].onmessage({ data: JSON.stringify(msg) });
    return { stream, emit };
}

beforeEach(() => { sockets = []; vi.stubGlobal('WebSocket', FakeSocket); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('useAIStream gossip', () => {
    it('ai_gossip calls onGossip with text and conversationId', async () => {
        const { stream, emit } = await setup();
        const fn = vi.fn();
        stream.onGossip(fn);
        emit({ type: 'ai_gossip', conversationId: 'c1', text: 'They say the Vanes are feuding.' });
        expect(fn).toHaveBeenCalledWith({ text: 'They say the Vanes are feuding.', conversationId: 'c1' });
    });

    it('does not touch isStreaming and does nothing without a callback', async () => {
        const { stream, emit } = await setup();
        stream.startStreaming();
        expect(() => emit({ type: 'ai_gossip', conversationId: 'c1', text: 'x' })).not.toThrow();
        expect(stream.isStreaming.value).toBe(true);
    });
});
