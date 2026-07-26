// Test stub for vue-multiselect.
//
// shared/ is a source-only package: the consuming apps install vue-multiselect,
// shared's own devDependencies do not. Vite's import analysis fails to resolve
// the bare specifier before vi.mock can intercept it, so vitest.config.js
// aliases the package (and its stylesheet) to these stubs instead.
export default {
    name: 'VueMultiselect',
    props: ['modelValue', 'options', 'multiple', 'label', 'trackBy', 'placeholder'],
    emits: ['update:modelValue'],
    // Scoped slots are deliberately not rendered: their slot props come from
    // the real component's internals, which this stub does not reproduce.
    template: '<div class="stub-multiselect"></div>',
};
