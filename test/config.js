var fs = require('fs');
var dir = __dirname + '/../../translations/';

if (!fs. existsSync(dir)){
    fs. mkdirSync(dir);
}


export default {
    languages_url: 'http://translations.tm/:project/languages',
    translations_url: 'http://translations.tm/:project/:lang.json',
    locales_dir: dir,
    project: 'test_project',
    default: 'en'
};
