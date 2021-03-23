

import importer from 'anytv-node-importer';
import request from 'request';
import async from 'async';
import _  from 'lodash';
import fs from 'fs';

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

        return new Promise((resolve, reject) => {
            this._get_languages(err => {

                if (err) {
                    return reject(err);
                }

                resolve();
            });
        });
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


    _load_files (next) {

        this.translations = importer.dirloadSync(this.config.get('locale_dir'));
        this.debug('from files', Object.keys(this.translations));

        this.loaded = true;

        // call callback
        next();

        return this;
    }

    _get_languages (next) {

        this.debug('getting languages');

        request(this.languages_url, {json:true}, (err, response, body) => {

            if (err) {
                return next(err);
            }

            if (response.statusCode !== 200) {
                return next(response);
            }

            const languages = body;

            this.languages = languages.data.languages;


            let default_lang = this.config.get('default');

            // if the default language is not on the languages array, add it
            if (default_lang && !~this.languages.indexOf(default_lang)) {
                this.languages.push(default_lang);
            }

            async.each(
                this.languages,
                this.get_lang_files.bind(this),
                this._load_files.bind(this, next)
            );
        });
    }

    get_lang_files (lang, cb) {
        const MAX_RETRY = this.config.get('download_retry');

        // append a random string, to avoid getting a response from cache
        const random_str = '&rand=' + ~~(Math.random() * 1000);
        const url = this.translations_url.replace(':lang', lang) + random_str;

        const translation_file_path = this.config.get('locale_dir') + lang + '.json';

        let promise_chain = Promise.resolve();
        if (process.env.REFRESH_TRANSLATIONS) {
            // force re-download translations
            promise_chain = promise_chain
                .then(() => this.download_translations(url, translation_file_path));
        }

        promise_chain
            .then(() => {

                let retry_count = 0;
                async.doWhilst(
                    async () => {
                        try {
                            await this.check(translation_file_path);
                            retry_count = MAX_RETRY;
                        } catch (error) {
                            await this.download_translations(url, translation_file_path);
                            retry_count++;
                        }

                        return retry_count;
                    },
                    cb_res => cb_res < MAX_RETRY,
                    err => cb(err ? err : null)
                );
            });
    }

    async check (translation_file_path) {
        /**
         * Load file using readFile and JSON.parse. Don't use require as it
         * caches loaded JSON
         */
        const translation = JSON.parse(
            await fs_promises.readFile(translation_file_path, 'utf8')
        );

        const empty_translation = _.chain(translation)
            .keys()
            .isEmpty()
            .value();

        if (empty_translation) {
            throw new Error('Empty translation file');
        }

        const service_version = this.config.get('service_version');
        const translation_version = _.get(
            translation, '__translation_info.version'
        );

        // when undefined, its en.json and most probably latest
        if (
            translation_version && `v${service_version}` !== translation_version
        ) {
            const message = `Version mismatch: v${service_version} !== ${translation_version}`;
            throw new Error(message);
        }
    }

    async download_translations (url, path) {
        const write_stream = fs.createWriteStream(path);

        return new Promise((resolve, reject) => {
            request(url)
                .pipe(write_stream)
                .on('finish', err => err ? reject(err): resolve());
        });
    }
}
