import path from 'path';

const locale_dir = path.resolve(path.join('node_modules', 'anytv-i18n', 'translations'));

export default {
    default: 'en',
    locale_dir,
    download_retry: 3,
    service_version: 'latest',
};
