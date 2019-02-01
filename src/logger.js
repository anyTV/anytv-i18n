

import Config from './classes/Config';

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

})();


export default _exports;
