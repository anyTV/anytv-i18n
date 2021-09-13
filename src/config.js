var fs = require('fs');
var dir = __dirname + '/../../translations/';

if (!fs. existsSync(dir)){
    fs. mkdirSync(dir);
}

export default {
    default: 'en',
    locale_dir: dir,

    download_retry: 3,
    service_version: 'latest',
};
