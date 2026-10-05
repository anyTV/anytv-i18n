import config from './config';
import I18n from '../src/classes/i18n';
import { looks_like_api_error } from '../src/translation_file';
import nock from 'nock';
import fs from 'fs';
import os from 'os';
import path from 'path';

import 'should';

describe('i18n safe translation writes', () => {

    const host = 'http://translations.tm';

    let locale_dir;


    function make_i18n () {

        return new I18n()
            .configure(Object.assign({}, config, { locale_dir }))
            .use(config.project);
    }

    function write_json (lang, content) {

        fs.writeFileSync(path.join(locale_dir, lang + '.json'), JSON.stringify(content));
    }

    function read_json (lang) {

        return JSON.parse(fs.readFileSync(path.join(locale_dir, lang + '.json'), 'utf8'));
    }

    function temp_files () {

        return fs.readdirSync(locale_dir).filter(file => file.includes('.tmp-'));
    }

    function mock_languages (languages) {

        nock(host)
            .get('/test_project/languages')
            .reply(200, { data: { languages } });
    }

    // every language except `en` is downloaded until valid, up to 3 times
    function mock_lang (lang, status, body, times = 3) {

        nock(host)
            .get(new RegExp(`/test_project/${lang}.json`))
            .times(times)
            .reply(status, body);
    }


    beforeEach(() => {
        nock.cleanAll();
        nock.disableNetConnect();
        locale_dir = fs.mkdtempSync(path.join(os.tmpdir(), 'anytv-i18n-'));
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });


    it('keeps the previous file when the server returns an empty 200 body', async () => {

        // outdated, so it gets re-downloaded
        write_json('fil', {
            hello: 'lumang :name',
            __translation_info: { version: 'v0.0.1' }
        });

        mock_languages(['en', 'fil']);
        mock_lang('en', 200, { hello: 'hi :name' });
        mock_lang('fil', 200, '');

        const i18n = make_i18n();

        await i18n.load();

        read_json('fil').hello.should.be.exactly('lumang :name');
        i18n.trans('fil', 'hello', { name: 'jen' }).should.be.exactly('lumang jen');
        temp_files().should.be.empty();
    });


    it('does not create a file and falls back to the default language on an empty body', async () => {

        mock_languages(['en', 'de']);
        mock_lang('en', 200, { hello: 'hi :name' });
        mock_lang('de', 200, '');

        const i18n = make_i18n();

        await i18n.load();

        fs.existsSync(path.join(locale_dir, 'de.json')).should.be.false();
        i18n.trans('de', 'hello', { name: 'jen' }).should.be.exactly('hi jen');
    });


    it('rejects a GitHub-style JSON error body sent with HTTP 200', async () => {

        write_json('en', { hello: 'hi :name' });

        mock_lang('en', 200, {
            message: 'Bad credentials',
            documentation_url: 'https://docs.github.com/rest',
            status: '401'
        }, 1);

        const replaced = await make_i18n().download_translations(
            `${host}/test_project/en.json`,
            path.join(locale_dir, 'en.json')
        );

        replaced.should.be.false();
        read_json('en').should.be.eql({ hello: 'hi :name' });
        temp_files().should.be.empty();
    });


    it('rejects a non-2xx response even when its body is valid JSON', async () => {

        write_json('en', { hello: 'hi :name' });

        mock_lang('en', 401, { message: 'Bad credentials' }, 1);

        const replaced = await make_i18n().download_translations(
            `${host}/test_project/en.json`,
            path.join(locale_dir, 'en.json')
        );

        replaced.should.be.false();
        read_json('en').should.be.eql({ hello: 'hi :name' });
    });


    it('only treats error-shaped bodies as API errors', () => {

        looks_like_api_error({ message: 'Not Found', documentation_url: 'x' }).should.be.true();
        looks_like_api_error({ error: { code: 500 } }).should.be.true();
        looks_like_api_error({ error: 'Internal Server Error' }).should.be.true();

        looks_like_api_error({ message: 'Hello', greeting: 'Hi' }).should.be.false();
        looks_like_api_error({ error: 'Error', retry: 'Retry' }).should.be.false();
        looks_like_api_error({ message: 'Hi', __translation_info: { version: 'v1' } }).should.be.false();
    });


    it('skips an invalid existing file during load instead of crashing', async () => {

        fs.writeFileSync(
            path.join(locale_dir, 'meta.json'),
            JSON.stringify({ languages: ['en', 'de', 'nl'], version: 'latest' })
        );
        write_json('en', { hello: 'hi :name' });
        write_json('nl', { hello: 'hallo :name' });

        // what the production incident left behind
        fs.writeFileSync(path.join(locale_dir, 'de.json'), '');

        const i18n = make_i18n();

        // meta.json matches service_version, so nothing is downloaded
        await i18n.load();

        i18n.trans('nl', 'hello', { name: 'jen' }).should.be.exactly('hallo jen');
        i18n.trans('de', 'hello', { name: 'jen' }).should.be.exactly('hi jen');
        i18n.translations.should.not.have.property('de');
    });


    it('replaces the file with a valid download', async () => {

        write_json('fil', {
            hello: 'lumang :name',
            __translation_info: { version: 'v0.0.1' }
        });

        mock_languages(['en', 'fil']);
        mock_lang('en', 200, { hello: 'hi :name' });
        mock_lang('fil', 200, {
            hello: 'kumusta :name',
            __translation_info: { version: 'vlatest' }
        }, 1);

        const i18n = make_i18n();

        await i18n.load();

        read_json('fil').hello.should.be.exactly('kumusta :name');
        i18n.trans('fil', 'hello', { name: 'jen' }).should.be.exactly('kumusta jen');
        temp_files().should.be.empty();
    });
});
