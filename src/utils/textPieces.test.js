import { describe, it, expect } from 'vitest';
import { toTextPieces, joinTextPieces } from './textPieces.js';

describe('toTextPieces', () => {
    it('gives one piece per word', () => {
        expect(toTextPieces('a short tale')).toEqual(['a ', 'short ', 'tale']);
    });

    it('keeps paragraph breaks with the word they follow', () => {
        expect(toTextPieces('one\n\ntwo')).toEqual(['one\n\n', 'two']);
    });

    it('returns nothing for empty text', () => {
        expect(toTextPieces('')).toEqual([]);
        expect(toTextPieces(null)).toEqual([]);
        expect(toTextPieces('   ')).toEqual([]);
    });

    it('rebuilds the original text when every piece is joined', () => {
        const text = 'Born in the low fens.\n\nRaised by  wolves, mostly.';
        expect(toTextPieces(text).join('')).toBe(text);
    });
});

describe('joinTextPieces', () => {
    const pieces = toTextPieces('one two three four');

    it('rebuilds a run of words', () => {
        expect(joinTextPieces(pieces, 0, 2)).toBe('one two');
    });

    it('starts a continued run on its own first word', () => {
        expect(joinTextPieces(pieces, 2, 2)).toBe('three four');
    });

    it('never trails whitespace onto the end of a page', () => {
        expect(joinTextPieces(toTextPieces('one\n\ntwo'), 0, 1)).toBe('one');
    });

    it('returns nothing for a run past the end', () => {
        expect(joinTextPieces(pieces, 9, 2)).toBe('');
    });
});
