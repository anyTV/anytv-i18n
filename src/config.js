import path from 'path';

const locale_dir = path.resolve(path.dirname(require.main.filename), 'translations');

export default {
    default: 'en',
    locale_dir,
    download_retry: 3,
    service_version: 'latest',
};
