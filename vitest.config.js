import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    test: { environment: 'jsdom' },
    resolve: {
        // shared/ is a source-only package. Views here import things the
        // consuming apps provide but shared itself does not install or alias,
        // so those specifiers are pointed at test stubs. Order matters: the
        // more specific finds must come first.
        alias: [
            // Installed by the consuming apps, not by shared's devDependencies.
            { find: 'vue-multiselect/dist/vue-multiselect.min.css', replacement: path.resolve(__dirname, './src/test/stubs/vue-multiselect.css') },
            { find: /^vue-multiselect$/, replacement: path.resolve(__dirname, './src/test/stubs/vue-multiselect.js') },
            // Gaming-system stores that live in the consuming app, not in shared/.
            { find: /^@\/stores\/(classes|races)$/, replacement: path.resolve(__dirname, './src/test/stubs/host-app-stores.js') },
            { find: '@shared', replacement: path.resolve(__dirname, './src') },
        ],
    },
});
