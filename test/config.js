import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const locale_dir = resolve(__dirname, 'translations');

export default {
    languages_url: 'http://translations.tm/:project/languages',
    translations_url: 'http://translations.tm/:project/:lang.json',
    locale_dir,
    project: 'test_project',
    default: 'en'
};
