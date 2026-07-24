import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    test: { environment: 'jsdom' },
    resolve: {
        alias: { '@shared': path.resolve(__dirname, './src') },
    },
});
