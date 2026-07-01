import apiClient from '@shared/utils/api';

/**
 * CKEditor upload adapter that sends a selected image to the Reports API as
 * base64 JSON. The backend resizes + converts it to JPEG, stores it in the
 * media bucket under reports/, and returns the CDN URL which CKEditor then
 * embeds in the report content.
 */
class ReportsUploadAdapter {
    constructor(loader) {
        this.loader = loader;
    }

    async upload() {
        const file = await this.loader.file;
        const imageData = await this._fileToBase64(file);

        const response = await apiClient.post('/reports/images', { imageData });

        return {
            default: response.data.url,
        };
    }

    abort() {
        // No-op: uploads are small and fast, so there is nothing to cancel.
    }

    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

/**
 * CKEditor plugin factory that wires the reports upload adapter into the
 * editor's FileRepository. Pass the returned function via `config.extraPlugins`.
 */
export function ReportsUploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) =>
        new ReportsUploadAdapter(loader);
}
