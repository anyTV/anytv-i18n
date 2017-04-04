'use strict';

import importer from 'anytv-node-importer';
import request from 'sync-request';
import _  from 'lodash';
import fs from 'fs';

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
        this.languages_url = this.config.get('languages_url').replace(':project', project);
        this.translations_url = this.config.get('translations_url').replace(':project', project);
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

        this._get_languages();
        this._load_cache();

        this.loaded = true;

        return this;
    }

    /**
     * gets the translation for the key and replaces the variables
     * @public
     * @params {string}    language
     * @params {string}    key
     * @params {object}    variables
     * @return {string}    translation
     */
    trans (lang, key, variables = {}) {

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
            if (typeof key === 'undefined') {
                key = lang;
                lang = default_lang;
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


    _load_cache () {
        this.translations = importer.dirloadSync(this.config.get('locale_dir'));
        this.debug('from cache', Object.keys(this.translations));
        return this;
    }

    _get_languages () {

        this.debug('getting languages');

        const res = request('GET',  this.languages_url);
        const languages = JSON.parse(res.getBody('utf8'));

        this.languages = languages.data.languages;


        let default_lang = this.config.get('default');

        // if the default language is not on the languages array, add it
        if (default_lang && !~this.languages.indexOf(default_lang)) {
            this.languages.push(default_lang);
        }

        this.languages.map(this.get_lang_files.bind(this));
    }

    get_lang_files (lang) {

        const res = request('GET',  this.translations_url.replace(':lang', lang));

        fs.writeFileSync(
            this.config.get('locale_dir') + lang + '.json',
            res.getBody('utf8')
        );

        this.debug('Done copying', lang);
    }
}
