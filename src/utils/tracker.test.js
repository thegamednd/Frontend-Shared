import { describe, it, expect, vi } from 'vitest';
import { trackerVideoUrl, trackerImageUrl, numeralStyle, validateLabel, DEFAULT_TRACKER } from './tracker.js';

vi.stubEnv('VITE_MEDIA_CDN_URL', 'https://media.test');

describe('tracker media urls', () => {
    it('falls back to defaults when no custom file is set', () => {
        expect(trackerVideoUrl('r1', undefined)).toBe('https://media.test/tracker/default/pendant.mp4');
        expect(trackerImageUrl('r1', {})).toBe('https://media.test/tracker/default/pendant.jpg');
    });
    it('uses the realm file when present', () => {
        expect(trackerVideoUrl('r1', { VideoFile: 'a.mp4' })).toBe('https://media.test/tracker/realms/r1/a.mp4');
        expect(trackerImageUrl('r1', { ImageFile: 'b.jpg' })).toBe('https://media.test/tracker/realms/r1/b.jpg');
    });
});

describe('numeralStyle', () => {
    it('is engraved silver at zero', () => {
        expect(numeralStyle(0)['--numeral-color']).toBe('#9aa1a8');
        expect(numeralStyle(0)['--numeral-glow-1']).toBe('transparent');
    });
    it('ramps from red at 1 to gold at 20 and clamps above', () => {
        expect(numeralStyle(1)['--numeral-color']).toBe('hsl(7.7, 88.4%, 56.8%)');
        expect(numeralStyle(20)['--numeral-color']).toBe('hsl(40, 96%, 72%)');
        expect(numeralStyle(99)['--numeral-color']).toBe(numeralStyle(20)['--numeral-color']);
    });
});

describe('validateLabel', () => {
    it('trims and accepts 1..40 chars', () => {
        expect(validateLabel('  Mana ')).toEqual({ ok: true, value: 'Mana' });
        expect(validateLabel('x'.repeat(40)).ok).toBe(true);
    });
    it('rejects empty and over-long', () => {
        expect(validateLabel('   ').ok).toBe(false);
        expect(validateLabel('x'.repeat(41)).ok).toBe(false);
    });
});

describe('DEFAULT_TRACKER', () => {
    it('matches the backend defaults', () => {
        expect(DEFAULT_TRACKER).toEqual({ Enabled: false, Label: 'Pendant Charges', Count: 0 });
    });
});
