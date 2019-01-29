'use strict';

import config from './config';
import i18n from '../src/index';
import should from 'should';
import nock from 'nock';


describe('i18n', () => {


    function mock_trans_server () {

        nock('http://translations.tm')
            .get('/test_project/languages')
            .reply(200, {
                data: {
                    languages: [
                        'en',
                        'fil'
                    ]
                }
            });

        nock('http://translations.tm')
            .get(/\/test_project\/en.json/)
            .reply(200, {
                hello: 'hi :name'
            });

        nock('http://translations.tm')
            .get(/\/test_project\/fil.json/)
            .reply(200, {
                hello: 'haro :name'
            });
    }


    it('should work as expected', done => {

        mock_trans_server();

        i18n.configure(config);

        i18n.use(config.project)
            .load()
            .then(() => {

                i18n.trans('hello', {name: 'jennifer'}).should.be.exactly('hi jennifer');
                i18n.trans('fil', 'hello', {name: 'jennifer'}).should.be.exactly('haro jennifer');;

                done();
            })
            .catch(done);
    });


    it('should not work when server does not exist', done => {

        nock('http://translations.tm')
            .get('/test_project/languages')
            .reply(404, {});

        i18n.configure(config);

        i18n.use(config.project)
            .load()
            .catch(err => {
                done();
            });
    });
});
