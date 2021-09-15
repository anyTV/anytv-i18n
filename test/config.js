import path from 'path';
const locale_dir = path.resolve(path.join('node_modules', 'anytv-i18n', 'translations'));

export default {
    languages_url: 'http://translations.tm/:project/languages',
    translations_url: 'http://translations.tm/:project/:lang.json',
    locale_dir,
    project: 'test_project',
    default: 'en'
};
