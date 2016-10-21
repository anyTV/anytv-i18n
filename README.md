# anytv-i18n

A module for app internationalization


## Install

```sh
npm install git+https://git@gitlab.com:anytv/anytv-i18n.git -S
```

## Introduction

Simple example:
```js
'use strict';

const i18n = require('anytv-18n');

i18n.configure({
    languages_url: 'http://translations.myapp.com/:project/languages',
    translation_url: 'http://translations.myapp.com/:project/:lang.json',
    locales_dir: '_locales',
    debug: true
});

i18n.use('freedom_dashboard')
    .load();

i18n.set('zh_TW');

i18n.trans('greetings', 'Hello :name!', {
    name: 'Raven!'
});

i18n.trans('non_existent_key', 'default value');


```

## Configuration options

* `languages_url` url for getting all available languages in json. `:project` will be replaced by the project you're using. Exact JSON format:
```json
{
	"data": {
		"languages": [
			"en",
			"zh",
			"zh_TW"
		]
	}
}
```
* `translation_url` url for getting json translations. `:project` will be replaced by the project you're using. `:lang` will be replaced by the language you're using. Exact format:
```json
{
	"__translation_info": {
		"language": "zh"
	},
	"greetings": "你好 :name",
	...
}
```
> note: __translation_info.language is required

* `locale_dir` directory where the translations will be cached. should be an absolute path with a trailing backslach. example: `/home/user/my-app/_locales/`
* `debug` set to true if you want to debug
* `logger` replaces the default logger
> note: Only [Winston](https://github.com/winstonjs/winston)-like loggers are accepted


# Todo
- [ ] Add test cases


# Contributing

Install the tools needed:
```sh
npm install grunt -g
npm install --dev
```

To compile the ES6 source code to ES5:
```sh
grunt
```

To generate the docs:
```sh
esdoc -c ./esdoc.json
```

# Running test

```sh
npm test
```

# Code coverage

```sh
npm run coverage
```
Then open coverage/lcov-report/index.html.

# License

MIT


# Author
[Freedom! Labs, any.TV Limited DBA Freedom!](https://www.freedom.tm)