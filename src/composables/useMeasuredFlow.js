import { onMounted, nextTick, ref, watch } from 'vue';

/**
 * Measures a printed page's flow units against the page box.
 *
 * The component renders every unit once into an off-screen stage laid out at
 * the real column width. This reads each unit's height from that stage, along
 * with how much column height the page has left once its title is accounted
 * for, and hands those to `paginateFlow` to deal into columns and pages.
 *
 * @param {object} options
 * @param {import('vue').Ref<Array>} options.units - the flow units
 * @param {import('vue').Ref<HTMLElement|null>} options.stageRef - the stage,
 *   styled as a page so it carries the real page box and padding
 * @param {import('vue').Ref<HTMLElement|null>} options.gridRef - the element
 *   the columns start at, for measuring what the title above it costs
 * @param {import('vue').Ref<HTMLElement|null>} options.columnRef - the element
 *   whose children are the units, in order
 * @param {import('vue').Ref<object|null>} [options.extraRef] - a full-width
 *   block below the columns (Notes), measured alongside them
 * @returns {{measured, unitHeights, columnHeight, extraHeight, remeasure}}
 */
export function useMeasuredFlow({ units, stageRef, gridRef, columnRef, extraRef = null }) {
    // Sub-pixel slack so a column that measured as an exact fit does not spill
    // over in the real page by a fraction of a point.
    const FIT_TOLERANCE = 2;

    const measured = ref(false);
    const unitHeights = ref([]);
    const columnHeight = ref(0);
    const extraHeight = ref(0);

    async function remeasure() {
        measured.value = false;
        await nextTick();

        // Font metrics decide where the breaks land, so wait for the webfonts.
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            try {
                await document.fonts.ready;
            } catch {
                /* fall through and measure with whatever is loaded */
            }
            await nextTick();
        }

        const stage = stageRef.value;
        const column = columnRef.value;
        if (!stage || !column || !gridRef.value) return;

        const heights = Array.from(column.children).map(
            el => el.getBoundingClientRect().height
        );
        if (heights.length !== units.value.length) return;

        const style = getComputedStyle(stage);
        const paddingTop = parseFloat(style.paddingTop);
        const contentHeight = stage.clientHeight - paddingTop - parseFloat(style.paddingBottom);
        // Everything above the columns (the page title and its trailing rule)
        // eats into what a column can hold.
        const headerHeight =
            gridRef.value.getBoundingClientRect().top -
            (stage.getBoundingClientRect().top + paddingTop);
        const available = contentHeight - headerHeight - FIT_TOLERANCE;
        if (!(available > 0)) return;

        const extra = extraRef?.value;
        const extraEl = extra?.$el ?? extra;
        extraHeight.value = extraEl?.getBoundingClientRect().height ?? 0;
        columnHeight.value = available;
        unitHeights.value = heights;
        measured.value = true;
    }

    onMounted(remeasure);
    watch(units, remeasure);

    return { measured, unitHeights, columnHeight, extraHeight, remeasure };
}
