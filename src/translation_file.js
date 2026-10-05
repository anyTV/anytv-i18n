

/**
 * Keys that, on their own, make up the error body GitHub (and APIs copying
 * its shape) return instead of a translation file, e.g.
 * {"message": "Bad credentials", "documentation_url": "...", "status": "401"}
 */
const GITHUB_ERROR_KEYS = ['message', 'documentation_url', 'status'];


/**
 * true for a plain object (not null, not an array)
 * @param {*} value
 * @return {boolean}
 */
export function is_plain_object (value) {

    return value !== null
        && typeof value === 'object'
        && !Array.isArray(value);
}


/**
 * Tells whether a parsed body is an API error rather than translations.
 *
 * The check is deliberately conservative so a real translation file is never
 * thrown away. A body counts as an error only when:
 *  - it has no `__translation_info` key (translation files carry one), and
 *  - every key is one of `message`, `documentation_url`, `status`, and
 *    `message` is among them (GitHub-style error), or
 *  - its only key is `error`, holding an object or a string ({error: {...}}).
 *
 * @param {Object} body - parsed JSON object
 * @return {boolean}
 */
export function looks_like_api_error (body) {

    if (!is_plain_object(body) || '__translation_info' in body) {
        return false;
    }

    const keys = Object.keys(body);

    const github_error = keys.includes('message')
        && keys.every(key => GITHUB_ERROR_KEYS.includes(key));

    const wrapped_error = keys.length === 1
        && keys[0] === 'error'
        && (is_plain_object(body.error) || typeof body.error === 'string');

    return github_error || wrapped_error;
}


/**
 * Parses the contents of a downloaded translation file and returns the
 * reason it can't be used, or null when it is a usable translation object.
 * @param {string} contents - raw file contents
 * @return {?string} rejection reason
 */
export function translation_rejection (contents) {

    let body;

    try {
        body = JSON.parse(contents);
    }
    catch (error) {
        return `invalid JSON (${error.message})`;
    }

    if (!is_plain_object(body)) {
        return 'not a JSON object';
    }

    if (!Object.keys(body).length) {
        return 'empty JSON object';
    }

    if (looks_like_api_error(body)) {
        return 'looks like an API error: ' + contents.slice(0, 200);
    }

    return null;
}
