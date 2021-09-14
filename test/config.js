var locale_dir = __dirname + '_locales';

export default {
    languages_url: 'http://translations.tm/:project/languages',
    translations_url: 'http://translations.tm/:project/:lang.json',
    locale_dir,
    project: 'test_project',
    default: 'en'
};
