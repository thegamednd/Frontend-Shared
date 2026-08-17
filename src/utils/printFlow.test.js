import { describe, it, expect } from 'vitest';
import { paginateFlow, remainingHeightOnLastPage } from './printFlow.js';

function heading(key, section, height) {
    return { key, kind: 'heading', section, height };
}

function item(key, section, height) {
    return { key, kind: 'item', section, height };
}

describe('paginateFlow', () => {
    it('returns a single page when everything fits in the first column', () => {
        const pages = paginateFlow([heading('h', 'a', 10), item('i1', 'a', 30)], {
            columnHeight: 100,
        });

        expect(pages).toHaveLength(1);
        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['h', 'i1']);
        expect(pages[0].columns[1].units).toEqual([]);
    });

    it('fills the first column before starting the second', () => {
        const pages = paginateFlow(
            [
                heading('h', 'a', 10),
                item('i1', 'a', 40),
                item('i2', 'a', 40),
                item('i3', 'a', 40),
            ],
            { columnHeight: 100 }
        );

        expect(pages).toHaveLength(1);
        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['h', 'i1', 'i2']);
        expect(
            pages[0].columns[1].units.filter(u => !u.continued).map(u => u.key)
        ).toEqual(['i3']);
    });

    it('starts a new page once both columns are full', () => {
        const pages = paginateFlow(
            [item('i1', null, 60), item('i2', null, 60), item('i3', null, 60)],
            { columnHeight: 100 }
        );

        expect(pages).toHaveLength(2);
        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['i1']);
        expect(pages[0].columns[1].units.map(u => u.key)).toEqual(['i2']);
        expect(pages[1].columns[0].units.map(u => u.key)).toEqual(['i3']);
    });

    it('moves a heading to the next column rather than orphaning it', () => {
        const pages = paginateFlow(
            [
                heading('ha', 'a', 10),
                item('a1', 'a', 60),
                heading('hb', 'b', 10),
                item('b1', 'b', 40),
            ],
            { columnHeight: 100 }
        );

        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['ha', 'a1']);
        expect(pages[0].columns[0].height).toBe(70);
        expect(pages[0].columns[1].units.map(u => u.key)).toEqual(['hb', 'b1']);
    });

    it('repeats the heading as a continuation when a section splits', () => {
        const pages = paginateFlow(
            [
                heading('ha', 'a', 10),
                item('a1', 'a', 45),
                item('a2', 'a', 45),
                item('a3', 'a', 45),
            ],
            { columnHeight: 100 }
        );

        const second = pages[0].columns[1].units;
        expect(second[0]).toMatchObject({
            kind: 'heading',
            section: 'a',
            continued: true,
        });
        expect(second[0].key).not.toBe('ha');
        expect(second[1].key).toBe('a3');
        expect(pages[0].columns[1].height).toBe(55);
    });

    it('does not mark a fresh section heading as a continuation', () => {
        const pages = paginateFlow(
            [
                heading('ha', 'a', 10),
                item('a1', 'a', 85),
                heading('hb', 'b', 10),
                item('b1', 'b', 40),
            ],
            { columnHeight: 100 }
        );

        expect(pages[0].columns[1].units[0].key).toBe('hb');
        expect(pages[0].columns[1].units[0].continued).toBeFalsy();
    });

    it('gives a unit taller than a column its own column', () => {
        const pages = paginateFlow(
            [item('small', null, 50), item('huge', null, 150), item('after', null, 20)],
            { columnHeight: 100 }
        );

        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['small']);
        expect(pages[0].columns[1].units.map(u => u.key)).toEqual(['huge']);
        expect(pages[1].columns[0].units.map(u => u.key)).toEqual(['after']);
    });

    it('keeps a heading with an item too tall to fit any column', () => {
        const pages = paginateFlow(
            [
                heading('ha', 'a', 10),
                item('a1', 'a', 60),
                heading('hb', 'b', 10),
                item('b1', 'b', 150),
            ],
            { columnHeight: 100 }
        );

        expect(pages[0].columns[1].units.map(u => u.key)).toEqual(['hb', 'b1']);
    });

    it('reports the used height of each column', () => {
        const pages = paginateFlow([item('i1', null, 30), item('i2', null, 25)], {
            columnHeight: 100,
        });

        expect(pages[0].columns[0].height).toBe(55);
        expect(pages[0].columns[1].height).toBe(0);
    });

    it('returns no pages for an empty flow', () => {
        expect(paginateFlow([], { columnHeight: 100 })).toEqual([]);
    });

    it('starts a new page per column when the page has a single column', () => {
        const pages = paginateFlow(
            [item('i1', null, 60), item('i2', null, 60)],
            { columnHeight: 100, columnsPerPage: 1 }
        );

        expect(pages).toHaveLength(2);
        expect(pages[0].columns).toHaveLength(1);
        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['i1']);
        expect(pages[1].columns[0].units.map(u => u.key)).toEqual(['i2']);
    });

    it('shortens the columns of the page holding a reserved block', () => {
        const units = [
            item('i1', null, 30),
            item('i2', null, 30),
            item('i3', null, 30),
            item('i4', null, 30),
            item('i5', null, 30),
        ];

        const pages = paginateFlow(units, {
            columnHeight: 100,
            reserve: { pageIndex: 0, height: 50 },
        });

        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['i1']);
        expect(pages[0].columns[1].units.map(u => u.key)).toEqual(['i2']);
        expect(pages[1].columns[0].units.map(u => u.key)).toEqual(['i3', 'i4', 'i5']);
    });

    it('leaves other pages at full height when one page reserves space', () => {
        const units = [
            item('i1', null, 60),
            item('i2', null, 60),
            item('i3', null, 60),
            item('i4', null, 30),
        ];

        const pages = paginateFlow(units, {
            columnHeight: 100,
            reserve: { pageIndex: 1, height: 50 },
        });

        expect(pages[0].columns[0].units.map(u => u.key)).toEqual(['i1']);
        expect(pages[1].columns[0].units.map(u => u.key)).toEqual(['i3']);
        expect(pages[1].columns[1].units.map(u => u.key)).toEqual(['i4']);
    });
});

describe('remainingHeightOnLastPage', () => {
    it('measures against the taller column of the last page', () => {
        const pages = paginateFlow([item('i1', null, 70), item('i2', null, 40)], {
            columnHeight: 100,
        });

        expect(remainingHeightOnLastPage(pages, 100)).toBe(30);
    });

    it('returns the full column height when there are no pages', () => {
        expect(remainingHeightOnLastPage([], 100)).toBe(100);
    });
});
