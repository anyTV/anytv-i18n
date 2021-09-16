import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const locale_dir = resolve(__dirname, 'translations');

export default {
    default: 'en',
    locale_dir,
    download_retry: 3,
    service_version: 'latest',
};
