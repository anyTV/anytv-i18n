

import importer from 'anytv-node-importer';
import axios from 'axios';
import async from 'async';
import _  from 'lodash';
import fs from 'fs';
import path from 'path';

const fs_promises = fs.promises;

import logger from './../logger';
import Config from './Config';


export default class i18n {

    constructor () {

        // all translations
        this.translations = {};

        // all available languages
        this.languages = void 0;

        this.loaded = false;

        this.config = new Config();
        this.locales_folder = '';

        this.prefix = 'i18n ::';
        this.debug = logger.debug.bind(logger, this.prefix);
    }

    /**
     * configures the instance
     * @public
     * @param {Object} cfg - your configuration
     * @example
     * i18n.configure({
     *      languages_url: '',
     *      translations_url: '',
     *      locale_dir: ''
     * })
     * @return {i18n} itself
     */
    configure (cfg) {

        this.config.set(cfg);

        if (cfg.debug) {
            Config.SET('debug', cfg.debug);
        }

        if (cfg.logger) {
            logger.use(cfg.logger);
        }

        this.locales_folder = path.normalize(this.config.get('locale_dir'));

        if (!fs.existsSync(this.locales_folder)){
            fs.mkdirSync(this.locales_folder, { recursive: true });
        }

        this.debug('configuration done', cfg);

        return this;
    }

    /**
     * sets the translation project
     * @public
     * @param {string} project
     * @example
     * i18n.use('freedom_dashboard')
     * @return {i18n} itself
     */
    use (project) {
        const service_version = `v${this.config.get('service_version')}`;

        this.languages_url = this.config.get('languages_url')
            .replace(':project', project)
            .replace(':version', service_version);

        this.translations_url = this.config.get('translations_url')
            .replace(':project', project)
            .replace(':version', service_version);

        this.debug('API set', project);

        return this;
    }

    /**
     * loads all the languages and stores it in locale_dir
     * @public
     * @example
     * i18n.load()
     * @return {i18n} itself
     */
    load () {

        return this.get_languages();
    }

    /**
     * gets the translation for the key and replaces the variables
     * @public
     * @params {string}    language
     * @params {string}    key
     * @params {object}    variables
     * @return {string}    translation
     */
    trans (lang, key, variables) {

        if (!this.loaded) {
            throw new Error('Language is not yet loaded. Please call .load() first');
        }


        let default_lang = this.config.get('default');


        if (typeof variables === 'undefined') {

            // support for trans(key, variable)
            if (typeof key === 'object') {
                variables = key;
                key = lang;
                lang = default_lang;
            }

            // support for trans(key)
            else if (typeof key === 'undefined') {
                key = lang;
                lang = default_lang;
            }

            // support for trans(lang, key)
            else {
                variables = {};
            }
        }


        let str =  _.get(this.translations, `${ lang }.${ key }`)
                || _.get(this.translations, `${ default_lang }.${ key }`)
                || key;

        /**
         * Replace variables in the string
         * `Hello :name!` => `Hello Raven!`
         * `:name aloha!` => `Raven aloha!`
         */
        _(variables).forOwn((value, _key) => {
            str = str.replace(new RegExp(`:${_key}`, 'g'), value);
        });

        return str;
    }


    load_files (cb) {

        this.translations = importer.dirloadSync(this.locales_folder);
        this.debug('from files', Object.keys(this.translations));

        this.loaded = true;
        cb();
    }

    async get_languages () {

        this.debug('getting languages');

        const response = await axios.get(this.languages_url);

        const languages = response.data;

        this.languages = languages.data.languages;

        let default_lang = this.config.get('default');

        // if the default language is not on the languages array, add it
        if (default_lang && !~this.languages.indexOf(default_lang)) {
            this.languages.push(default_lang);
        }

        return new Promise(resolve => {
            async.each(
                this.languages,
                this.get_lang_files.bind(this),
                this.load_files.bind(this, resolve)
            );
        });
    }

    async get_lang_files (lang) {
        const MAX_RETRY = this.config.get('download_retry');

        // append a random string, to avoid getting a response from cache
        const random_str = '&rand=' + ~~(Math.random() * 1000);
        const url = this.translations_url.replace(':lang', lang) + random_str;


        const translation_file_path = path.join([this.locales_folder, lang + '.json']);

        for (let retry = 0; retry < MAX_RETRY; retry++) {
            if (process.env.REFRESH_TRANSLATIONS
                || !await this.is_translation_valid(translation_file_path)
            ) {
                await this.download_translations(url, translation_file_path);
            } else {
                break;
            }
        }
    }

    async is_translation_valid (translation_file_path) {
        let translation;

        try {
            translation = JSON.parse(
                await fs_promises.readFile(translation_file_path, 'utf8')
            );
        } catch (error) {
            return false;
        }

        const empty_translation = _.chain(translation)
            .keys()
            .isEmpty()
            .value();

        if (empty_translation) {
            return false;
        }

        const service_version = this.config.get('service_version');
        const translation_version = _.get(
            translation, '__translation_info.version'
        );

        // when undefined, its en.json and most probably latest
        return !translation_version || `v${service_version}` === translation_version;
    }

    async download_translations (url, file_path) {
        const response = await axios({
            method: 'get',
            url,
            responseType: 'stream'
        });

        return await new Promise((resolve, reject) => {
            let file_handle = fs.createWriteStream(file_path, { autoClose: true});

            response.data.pipe(file_handle);

            file_handle.on('error', err => reject(err));
            file_handle.on('finish', () => resolve());
        });

    }
}
