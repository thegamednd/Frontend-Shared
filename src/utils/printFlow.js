/**
 * Column-and-page flow for fixed-height printed sheets.
 *
 * Printed pages are a fixed 8.5x11in box with hidden overflow, so the browser
 * cannot break content for us. Given a stream of units with measured heights,
 * this fills column by column and page by page, keeps section headings with
 * their first item, and repeats a heading as a continuation when a section
 * straddles a column break.
 *
 * A unit is `{ key, kind, section, height }`, where `kind === 'heading'` marks
 * a section heading and `section` ties items back to the heading above them.
 */

/**
 * @param {Array<object>} units - ordered units carrying a measured `height`
 * @param {object} options
 * @param {number} options.columnHeight - usable height of one column, in px
 * @param {number} [options.columnsPerPage] - defaults to 2
 * @param {{pageIndex: number, height: number}} [options.reserve] - space to
 *   keep free below the columns of one page, for a full-width block
 * @returns {Array<{columns: Array<{units: Array<object>, height: number}>}>}
 */
export function paginateFlow(units, { columnHeight, columnsPerPage = 2, reserve = null }) {
    const pages = [];
    const headingBySection = new Map();
    let page = null;
    let columnIndex = 0;
    let column = null;
    let continuations = 0;
    let capacity = columnHeight;

    function capacityFor(pageIndex) {
        if (reserve && reserve.pageIndex === pageIndex) {
            return columnHeight - reserve.height;
        }
        return columnHeight;
    }

    function startPage() {
        page = {
            columns: Array.from({ length: columnsPerPage }, () => ({
                units: [],
                height: 0,
            })),
        };
        pages.push(page);
        columnIndex = 0;
        column = page.columns[0];
        capacity = capacityFor(pages.length - 1);
    }

    function startColumn() {
        if (page && columnIndex + 1 < columnsPerPage) {
            columnIndex += 1;
            column = page.columns[columnIndex];
        } else {
            startPage();
        }
    }

    function place(unit) {
        column.units.push(unit);
        column.height += unit.height;
    }

    let index = 0;
    let stayWithHeading = false;
    while (index < units.length) {
        const unit = units[index];
        if (!column) startPage();

        // A heading needs room for whatever follows it, or it strands itself
        // at the foot of a column.
        const next = units[index + 1];
        const needed =
            unit.kind === 'heading' && next ? unit.height + next.height : unit.height;

        if (!stayWithHeading && column.units.length > 0 && needed > capacity - column.height) {
            startColumn();
            continue;
        }

        // A heading opening an empty column has nowhere better to send what
        // follows, so that unit stays with it however tall it is.
        stayWithHeading = unit.kind === 'heading' && column.units.length === 0;

        // Opening a column mid-section: restate the heading so the reader
        // knows what the list belongs to.
        if (
            column.units.length === 0 &&
            unit.kind !== 'heading' &&
            headingBySection.has(unit.section)
        ) {
            const heading = headingBySection.get(unit.section);
            continuations += 1;
            place({
                ...heading,
                key: `${heading.key}--cont${continuations}`,
                continued: true,
            });
        }

        if (unit.kind === 'heading' && unit.section) {
            headingBySection.set(unit.section, unit);
        }

        place(unit);
        index += 1;
    }

    return pages;
}

/**
 * Height left below the taller column of the final page, for deciding whether
 * a full-width trailing block still fits there.
 */
export function remainingHeightOnLastPage(pages, columnHeight) {
    if (!pages.length) return columnHeight;
    const last = pages[pages.length - 1];
    const tallest = Math.max(...last.columns.map(c => c.height));
    return columnHeight - tallest;
}
