

import CONFIG from './../config';


export default class Config {

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
            if (prop.hasOwnProperty(key)) {
                this.prop[key] = prop[key];
            }
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
            if (prop.hasOwnProperty(key)) {
                this.PROP[key] = prop[key];
            }
        }

        return this;
    }
}
