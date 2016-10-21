'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var importer = _interopDefault(require('anytv-node-importer'));
var cudl = _interopDefault(require('cuddle'));
var _ = _interopDefault(require('lodash'));
var co = _interopDefault(require('co'));
var fs = _interopDefault(require('fs'));

var CONFIG = {
    default: 'en',
    locale_dir: __dirname + '/_locales/'
};

class Config {

    constructor (props) {
        this.use_global = true;
        this.prop = {};

        if (props) {
            this.set(props);
        }
    }

    get (key) {

        let val = this.prop[key];

        if (!(key in this.prop) && this.use_global) {
            val = this.constructor.GET(key);
        }

        return val;
    }

    set (key, value) {

        if (typeof key === 'object' && typeof value === 'undefined') {
            return this._set_prop(key);
        }

        this.prop[key] = value;
        return this;
    }

    ignore_global () {
        this.use_global = false;
        return this;
    }


    _set_prop (prop) {

        for (let key in prop) {
            this.prop[key] = prop[key];
        }

        return this;
    }


    static get PROP () {

        if (!this.prop) {
            this.prop = {};
        }

        return this.prop;
    }

    static GET (key) {

        let val = this.PROP[key];

        if (!(key in this.PROP)) {
            val = CONFIG[key];
        }

        return val;
    }

    static SET (key, value) {

        if (typeof key === 'object' && typeof value === 'undefined') {
            return this._SET_PROP(key);
        }

        this.PROP[key] = value;
        return this;
    }


    static _SET_PROP (prop) {

        for (let key in prop) {
            this.PROP[key] = prop[key];
        }

        return this;
    }
}

const _exports = {};


(function () {

    const levels = [
        'silly',
        'debug',
        'verbose',
        'info',
        'warn',
        'error'
    ];


    function start () {

        levels.forEach(level =>
            _exports[level] = log.bind(null, level)
        );

        _exports.use = _logger =>
            levels.forEach(level =>
                _exports[level] = _logger[level]
            );
    }


    function log (level) {

        const idx = levels.indexOf(level);

        if (!~idx) {
            level = 'info';
        }

        const msg = [
            new Date().toUTCString(),
            level + ':\t',
            Array.prototype.map
                .call(arguments, n =>
                    typeof n === 'string'
                        ? n
                        : JSON.stringify(n)
                )
                .slice(1)
                .join(' ')
        ].join(' ');


        if (Config.GET('debug')) {
            console.log(msg);
        }
    }

    start();

}());

class i18n {

    constructor () {

        // all translations
        this.translations = {};

        // all available languages
        this.languages = void 0;

        // current language
        this.lang = void 0;

        this.config = new Config();

        this.prefix = 'i18n ::';
        this.debug = _exports.debug.bind(_exports, this.prefix);
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
            _exports.use(cfg.logger);
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

        this._load_cache();
        co(this._get_languages())
            .catch(err => console.error(err));

        return this;
    }

    /**
     * sets the language to use in translate function
     * @public
     * @param {string} lang
     * @example
     * i18n.set('zh_TW')
     * @return {i18n} itself
     */
    set (lang = 'en') {
        this.lang = lang;
        return this;
    }

    /**
     * gets the translation for the key and replaces the variables
     * @public
     * @params {string}    key
     * @params {object}    variables
     * @return {string}    translation
     */
    trans (key, variables = {}) {

        let default_lang = this.config.get('default');
        let str = '';

        if (this.translations[this.lang]
         && this.translations[this.lang][key]) {
            str = this.translations[this.lang][key];
        }
        else {
            str = this.translations[default_lang][key] || '';
        }

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

    * _get_languages () {

        this.debug('getting languages');

        const languages = yield cudl.get
            .to(this.languages_url)
            .promise();

        this.languages = languages.data.languages;


        let default_lang = this.config.get('default');

        // if the default language is not on the languages array, add it
        if (default_lang && !~this.languages.indexOf(default_lang)) {
            this.languages.push(default_lang);
        }

        this.languages.map(this.get_lang_files.bind(this));
    }

    get_lang_files (lang) {
        cudl.get
            .to(this.translations_url.replace(':lang', lang))
            .args(lang)
            .send({
                ext: 'json',
                lang
            })
            .then(this.copy_file.bind(this));
    }

    copy_file (err, result, request, args) {
        const lang = args[0];

        fs.writeFile(
            this.config.get('locale_dir') + lang + '.json',
            JSON.stringify(result, null, '\t'),
            () => {}
        );

        this.debug('Done copying', lang);
    }
}

var index = new i18n();

module.exports = index;
