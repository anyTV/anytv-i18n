import path from 'path';
const locale_dir = path.resolve(path.dirname(require.main.filename), 'translations');

export default {
    languages_url: 'http://translations.tm/:project/languages',
    translations_url: 'http://translations.tm/:project/:lang.json',
    locale_dir,
    project: 'test_project',
    default: 'en'
};
