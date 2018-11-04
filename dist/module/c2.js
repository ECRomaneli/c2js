"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function c2js(config) {
    let elems = document.querySelectorAll(`[${c2js.APP_NAME}]`);
    c2js.ready((c2) => {
        c2.each(elems, (_, el) => {
            !el.c2js && new c2js.Init(el, config);
        });
    });
}
exports.c2js = c2js;
(function (c2js) {
    c2js.APP_NAME = 'c2js';
    c2js.DOC = document;
    c2js.WIN = window;
    let STORAGE;
    (function (STORAGE) {
        STORAGE["VOLUME"] = "_C2.VOLUME";
        STORAGE["MUTED"] = "_C2.MUTED";
        STORAGE["TIME"] = "_C2.CURRENT_TIME";
        STORAGE["SRC"] = "_C2.SOURCE";
    })(STORAGE || (STORAGE = {}));
    const SEEK_DATA = { seeking: false, last: void 0 };
    const KEYMAP = {
        space: [' ', 'spacebar'],
        ctrl: ['ctrl', 'control'],
        alt: ['alt', 'altgraph'],
        del: ['del', 'delete'],
        esc: ['esc', 'escape'],
        left: ['left', 'arrowleft'],
        up: ['up', 'arrowup'],
        right: ['right', 'arrowright'],
        down: ['down', 'arrowdown']
    };
    const DEFAULT_CONFIG = {
        saveWith: window.localStorage ? 'localStorage' : 'cookie',
        saveTime: false,
        speed: { min: 0, max: 3 }
    };
    let FS_VAR;
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn(c2js.c2);
        }
        else {
            document.addEventListener('DOMContentLoaded', () => { fn(c2js.c2); });
        }
    }
    c2js.ready = ready;
    // toggle values passed by param
    function toggleVal(value, toggle) {
        return toggle[value === toggle[0] ? 1 : 0];
    }
    c2js.toggleVal = toggleVal;
    function isSet(obj) {
        return obj !== void 0 && obj !== null;
    }
    // Get value, min or max if overflow
    function minMaxVal(value, min, max) {
        return value < min ? min : value > max ? max : value;
    }
    function filterNull($ctrls) {
        return $ctrls.filter((_, el) => !el.hasAttribute('c2-null'));
    }
    // Break down string number to 'signal', 'number' and 'unit'.
    function breakNumber(number, typeTo, total) {
        if (!number) {
            return { number: 0 };
        }
        let match = (number + '').match(/^(\D*)(\d|\.)+(\D*)$/), broken = { signal: match[1], type: match[3], number: parseFloat(number) }, param = broken.type === '%' ? total : typeTo;
        if (param) {
            parseNumber(broken, param);
        }
        return broken;
    }
    // Convert number or resolve the porcentage
    function parseNumber(broken, typeToOrTotal) {
        if (!broken.type) {
            return;
        }
        if (typeof typeToOrTotal === 'number') {
            broken.type = '';
            broken.number *= typeToOrTotal / 100;
            return;
        }
        let types = ['ms', 's', 'm', 'h', 'd'], values = [1000, 60, 60, 24], indexFrom = types.indexOf(broken.type), indexTo = types.indexOf(typeToOrTotal);
        broken.type = typeToOrTotal;
        while (indexFrom !== indexTo) {
            if (indexFrom > indexTo) {
                broken.number *= values[--indexFrom];
            }
            else {
                broken.number /= values[indexFrom++];
            }
        }
    }
    // Convert seconds to format HH:mm:ss
    function convertTime(seconds) {
        let date = new Date(seconds * 1000), ISORange = [11, 8];
        if (seconds < 3600) {
            ISORange = [14, 5];
        }
        return date.toISOString().substr(ISORange[0], ISORange[1]);
    }
    // Verify if browser allow fullscreen and set the navPrefix and
    // fullscreen functions
    function allowFullscreen() {
        if (FS_VAR) {
            return FS_VAR.allowed;
        }
        let FN, $DOC = c2(c2js.DOC);
        if (c2js.DOC.webkitFullscreenEnabled) {
            FN = [
                'webkitRequestFullscreen', 'webkitExitFullscreen',
                'webkitFullscreenElement', 'webkitfullscreenchange',
                'webkitfullscreenerror'
            ];
        }
        else if (c2js.DOC.webkitCancelFullScreen) {
            FN = [
                'webkitRequestFullScreen', 'webkitCancelFullScreen',
                'webkitCurrentFullScreenElement', 'webkitfullscreenchange',
                'webkitfullscreenerror'
            ];
        }
        else if (c2js.DOC.mozFullScreenEnabled) {
            FN = [
                'mozRequestFullScreen', 'mozCancelFullScreen',
                'mozFullScreenElement', 'mozfullscreenchange',
                'mozfullscreenerror'
            ];
        }
        else if (c2js.DOC.msFullscreenEnabled) {
            FN = [
                'msRequestFullscreen', 'msExitFullscreen',
                'msFullscreenElement', 'MSFullscreenChange',
                'MSFullscreenError'
            ];
        }
        else if (c2js.DOC.fullscreenEnabled) {
            FN = [
                'requestFullscreen', 'exitFullscreen',
                'fullscreenElement', 'fullscreenchange',
                'fullscreenerror'
            ];
        }
        else {
            FS_VAR = { allowed: false };
            return false;
        }
        FS_VAR = {
            allowed: true,
            enter: (el) => { el[FN[0]](); },
            leave: () => { c2js.DOC[FN[1]](); },
            check: () => c2js.DOC[FN[2]],
            onChange: (h) => { $DOC.on(FN[3], h); },
            onError: (h) => { $DOC.on(FN[4], h); }
        };
        return true;
    }
    class Init {
        constructor(el, config) {
            this.cache = {};
            this.ctrls = {
                play: {
                    events: {
                        click: function (_e, inst) {
                            if (!inst.$media.attr('src')) {
                                inst.$media.trigger('error');
                                console.error('Trying to play/pause media without source.');
                                return;
                            }
                            inst.media.paused ? inst.media.play() : inst.media.pause();
                        }
                    },
                    media: {
                        play: function (_e, _i, helpers) {
                            helpers.$all.data('play', true);
                        },
                        pause: function (_e, _i, helpers) {
                            helpers.$all.data('play', false);
                        }
                    }
                },
                stop: {
                    events: {
                        click: function (_e, inst, helpers) {
                            if (!inst.media.paused) {
                                inst.media.pause();
                            }
                            helpers.$all.data('stop', true);
                            inst.media.currentTime = 0;
                        }
                    },
                    media: {
                        play: function (_e, _i, helpers) {
                            helpers.$all.data('stop', false);
                        },
                        'loadeddata ended abort error': function (_e, inst, helpers) {
                            if (!inst.hasStatus('stop')) {
                                if (!inst.media.paused) {
                                    inst.media.pause();
                                }
                                helpers.$all.data('stop', true);
                            }
                        }
                    }
                },
                move: {
                    events: {
                        click: function (_e, inst) {
                            let max = inst.media.duration, broken = breakNumber(c2(this).data('move'), 's', max), time = broken.number;
                            if (broken.signal) {
                                time += inst.media.currentTime;
                                time = minMaxVal(time, 0, max);
                            }
                            inst.media.currentTime = time;
                        }
                    }
                },
                volume: {
                    events: {
                        click: function (_e, inst) {
                            let broken = breakNumber(c2(this).data('volume'), null, 1), volume = broken.number;
                            if (broken.signal) {
                                volume += inst.media.volume;
                                volume = minMaxVal(volume, 0, 1);
                            }
                            inst.media.volume = volume;
                        }
                    }
                },
                mute: {
                    events: {
                        click: function (_e, inst) {
                            inst.media.muted = !inst.media.muted;
                        }
                    },
                    media: {
                        'loadeddata volumechange': function (_e, inst, helpers) {
                            let muted = inst.media.volume === 0 || inst.media.muted;
                            helpers.$all.data('mute', muted);
                        }
                    }
                },
                fullscreen: {
                    ready: function (_e, inst, helpers) {
                        if (!allowFullscreen()) {
                            helpers.$all.data('fullscreen', 'null');
                            return;
                        }
                        FS_VAR.onChange(() => {
                            helpers.$all.data('fullscreen', inst.c2js === FS_VAR.check());
                        });
                        FS_VAR.onError(() => {
                            if (inst.c2js === FS_VAR.check()) {
                                alert('Fullscreen Error!');
                                console.error('Fullscreen Error!');
                            }
                        });
                    },
                    events: {
                        click: function (_e, inst) {
                            if (FS_VAR.allowed) {
                                FS_VAR.check() ? FS_VAR.leave() : FS_VAR.enter(inst.c2js);
                            }
                        }
                    }
                },
                'time-seek': {
                    helpers: {
                        setTime: function (el, media) {
                            let max = parseFloat(c2(el).attr('max')), value = c2(el).val();
                            media.currentTime = media.duration * value / max;
                        },
                        setSeek: function (el, media) {
                            let max = parseFloat(c2(el).attr('max')), value = media.currentTime * max / media.duration;
                            c2(el).val(value);
                        }
                    },
                    ready: function (_e, _i, helpers) {
                        helpers.$all.each(function (_, el) {
                            c2(el).attrIfNotExists('step', 0.1);
                            c2(el).attrIfNotExists('max', 100);
                            c2(el).val(0);
                        });
                    },
                    events: {
                        'input change': function (_e, inst, helpers) {
                            helpers.setTime(this, inst.media);
                        },
                        mousedown: function () {
                            SEEK_DATA.seeking = true;
                        },
                        mouseup: function () {
                            SEEK_DATA.seeking = false;
                        }
                    },
                    media: {
                        'loadeddata timeupdate': function (_e, inst, helpers) {
                            if (!SEEK_DATA.seeking) {
                                helpers.$all.each((_, el) => {
                                    helpers.setSeek(el, inst.media);
                                });
                            }
                        }
                    }
                },
                'volume-seek': {
                    helpers: {
                        setVolume: function (el, media) {
                            let value = c2(el).val();
                            if (media.muted && !value) {
                                return;
                            }
                            let max = c2(el).attr('max');
                            media.volume = value / max;
                            media.muted = !media.volume;
                        },
                        setSeek: function (el, media) {
                            if (media.muted) {
                                c2(el).val(0);
                                return;
                            }
                            let max = c2(el).attr('max');
                            c2(el).val(media.volume * max);
                        }
                    },
                    ready: function (_e, _i, helpers) {
                        helpers.$all.each((_, el) => {
                            c2(el).attrIfNotExists('step', 5);
                            c2(el).attrIfNotExists('max', 100);
                            c2(el).val(0);
                        });
                    },
                    events: {
                        'input change': function (_e, inst, helpers) {
                            helpers.$all.each((_, el) => {
                                helpers.setVolume(el, inst.media);
                            });
                        }
                    },
                    media: {
                        'loadeddata volumechange': function (_e, inst, helpers) {
                            helpers.$all.each((_, el) => {
                                helpers.setSeek(el, inst.media);
                            });
                        }
                    }
                },
                time: {
                    helpers: {
                        update: function (el, media) {
                            let time = media.currentTime, prefix = '';
                            if (c2(el).data('time') === 'remaining') {
                                time = media.duration - media.currentTime;
                                prefix = '-';
                            }
                            c2(el).text(prefix + convertTime(time));
                        }
                    },
                    events: {
                        click: function (_e, inst, helpers) {
                            c2(this).data('time', toggleVal(c2(this).data('time'), ['current', 'remaining']));
                            helpers.update(this, inst.media);
                        }
                    },
                    media: {
                        'loadeddata stimeupdate': function (_e, inst, helpers) {
                            helpers.$all.each((_, el) => {
                                helpers.update(el, inst.media);
                            });
                        }
                    }
                },
                duration: {
                    media: {
                        'loadeddata durationchange': function (_e, inst, helpers) {
                            helpers.$all.each((_, el) => {
                                let time = inst.media.duration, attr = c2(el).data('duration');
                                if (attr) {
                                    c2(el).attr(attr, convertTime(time));
                                    return;
                                }
                                c2(el).text(convertTime(time));
                            });
                        }
                    }
                },
                loop: {
                    events: {
                        click: function (_e, inst) {
                            c2(this).data('loop', inst.media.loop = !inst.media.loop);
                        }
                    }
                },
                speed: {
                    events: {
                        click: function (_e, inst) {
                            let min = inst.config.speed.min, max = inst.config.speed.max, broken = breakNumber(c2(this).data('speed'), null, 1), speed = broken.number;
                            if (broken.signal) {
                                speed += inst.media.playbackRate;
                                speed = minMaxVal(speed, min, max);
                            }
                            inst.media.playbackRate = speed;
                        }
                    }
                },
                'hide-mouse': {
                    helpers: {
                        isMoving: function (el) {
                            let timer = c2(el).data('hide-mouse');
                            el.c2.timer = timer ? breakNumber(timer, 'ms').number : 3000;
                            c2(el).css('cursor', el.c2.cursor);
                        },
                        isStopped: function (el) {
                            el.c2.timer = null;
                            c2(el).css('cursor', 'none');
                        }
                    },
                    ready: function (_e, _i, helpers) {
                        helpers.$all.each((_, el) => {
                            el.c2 = { id: null, timer: null, cursor: c2(el).css('cursor') };
                        });
                    },
                    events: {
                        mousemove: function (_e, _i, helpers) {
                            let prop = this.c2;
                            if (!prop) {
                                return;
                            }
                            if (!prop.timer) {
                                helpers.isMoving(this);
                            }
                            if (prop.id) {
                                clearTimeout(prop.id);
                            }
                            prop.id = setTimeout(() => { helpers.isStopped(this); }, prop.timer);
                        }
                    }
                },
                custom: {}
            };
            let _this = this;
            c2.fn.data = function (ctrlType, value) {
                if (value === void 0) {
                    return c2(this).attr('c2-' + ctrlType);
                }
                if (value === true) {
                    _this.addStatus(ctrlType);
                }
                else if (value === false) {
                    _this.rmStatus(ctrlType);
                }
                c2(this).attr('c2-' + ctrlType, value);
            };
            el.c2js = true;
            this.status = '';
            this.shortcuts = [];
            this.$c2js = c2(el),
                this.c2js = el,
                this.$media = this.$c2js.findOne('video, audio'),
                this.media = this.$media.first();
            this.$media.on('timeupdate', () => {
                if ((this.media.currentTime | 0) !== (this.cache.currentTime | 0)) {
                    this.cache.currentTime = this.media.currentTime;
                    this.$media.trigger('stimeupdate');
                }
            });
            this.config = config || {};
            c2.each(DEFAULT_CONFIG, (key, value) => {
                if (this.config[key] === void 0) {
                    this.config[key] = value;
                }
            });
            this.initControls();
            this.loadSavedInfo();
            this.bindSaveEvents();
        }
        searchCtrl(ctrlType) {
            return this.$c2js.find(`[c2-${ctrlType}]`);
        }
        createHandler(handler, prop) {
            let inst = this;
            return function (e) { handler.call(this, e, inst, prop.helpers); };
        }
        addStatus(status) {
            this.status += ' ' + status;
            this.status = this.status.trim();
            this.$c2js.attr('c2js', this.status);
        }
        rmStatus(status) {
            let rmRegExp = new RegExp(`\\s?(${status})`);
            this.status = this.status.replace(rmRegExp, '').trim();
            this.$c2js.attr(c2js.APP_NAME, this.status);
        }
        hasStatus(status) {
            return this.status.indexOf(status) !== -1;
        }
        initControls() {
            this.$c2js.attrIfNotExists('tabindex', -1);
            c2.each(this.ctrls, (name, property) => {
                let $ctrl = this.searchCtrl(name);
                if ($ctrl) {
                    // Register global variables into props
                    if (!property.helpers) {
                        property.helpers = {};
                    }
                    property.helpers.$all = $ctrl;
                    // Register events
                    this.propertyController(property);
                    // Add shortcuts on list
                    this.addShortcuts($ctrl);
                }
            });
            // Redirect focus of control to c2js (Fix 'space' problem)
            this.redirectControlFocus();
            // When you finish recording all the controls, then register your shortcuts
            this.bindShortcuts();
        }
        propertyController(property) {
            property.ready && this.bindReady(property);
            property.media && this.bindMedia(property);
            property.events && this.bindEvents(property);
        }
        bindEvents(property) {
            let $callers = filterNull(property.helpers.$all);
            c2.each(property.events, (event, handler) => {
                $callers.on(event, this.createHandler(handler, property));
            });
        }
        bindMedia(property) {
            // IMPROVEIT: See other properties more reliable than this
            let loadedData = this.media.buffered.length;
            c2.each(property.media, (event, handler) => {
                handler = this.createHandler(handler, property);
                // Fix crash when video loads before c2js
                if (event.indexOf('loadeddata') !== -1) {
                    if (loadedData) {
                        handler();
                    }
                }
                this.$media.on(event, handler);
            });
        }
        bindReady(property) {
            this.createHandler(property.ready, property)();
        }
        addShortcuts($ctrls) {
            $ctrls.each((_, el) => {
                let keys = c2(el).data('shortcuts'), keymap;
                if (!keys) {
                    return;
                }
                keys = keys.toLowerCase().split(' ');
                keys.forEach((key) => {
                    if (keymap = KEYMAP[key]) {
                        keymap.forEach((key) => {
                            this.shortcuts[key] = el;
                        });
                        return;
                    }
                    this.shortcuts[key] = el;
                });
            });
        }
        bindShortcuts() {
            this.$c2js.on('keydown', (e) => {
                let el, key = e.key.toLowerCase();
                if (el = this.shortcuts[key]) {
                    c2(el).trigger('click');
                    e.preventDefault();
                }
            });
        }
        loadSavedInfo() {
            let cfg = this.config;
            if (cfg.saveWith === 'none') {
                return;
            }
            let storage = this.cache.storage = cfg.saveWith === 'cookie' ? c2.cookie : c2.storage, volume = storage(STORAGE.VOLUME), muted = storage(STORAGE.MUTED), src = storage(STORAGE.SRC), time = storage(STORAGE.TIME);
            muted = muted === true || muted === 'true';
            if (!this.media.src && isSet(src)) {
                this.$media.attr('src', src);
            }
            let updateFn = () => {
                if (isSet(volume)) {
                    this.media.volume = volume;
                }
                if (this.media.src === src && isSet(time)) {
                    this.media.currentTime = parseInt(time);
                    // Second update fix issue "updatetime unchanged" on Edge and IE
                    this.media.currentTime = parseInt(time) + 0.001;
                }
                this.media.muted = muted;
            };
            if (this.media.buffered.length) {
                updateFn();
                return;
            }
            this.$media.one('loadeddata', updateFn);
        }
        bindSaveEvents() {
            let cfg = this.config;
            if (cfg.saveWith === 'none') {
                return;
            }
            let storage = this.cache.storage;
            this.$media.on('volumechange', function () {
                let volume = this.volume, muted = this.muted;
                storage(STORAGE.VOLUME, volume);
                storage(STORAGE.MUTED, !volume || muted);
            });
            if (cfg.saveTime) {
                storage(STORAGE.SRC, this.media.src);
                this.$media.on('loadeddata', function () {
                    storage(STORAGE.SRC, this.src);
                });
                this.$media.on('stimeupdate ended', function () {
                    storage(STORAGE.TIME, this.currentTime);
                });
            }
        }
        redirectControlFocus() {
            let $leaves = this.$c2js.find('*').filter((_, el) => !el.firstElementChild);
            $leaves.on('focus', () => { this.$c2js.trigger('focus'); });
        }
    }
    c2js.Init = Init;
    function c2(selector, context) { return new c2.Query(selector, context || c2js.DOC); }
    c2js.c2 = c2;
    (function (c2) {
        class Query {
            constructor(selector, context) {
                if (typeof selector === 'string') {
                    let type = selector.match(/^([#.]?)([-\w]+)(.*)$/);
                    if (!type || type[3]) { // selector
                        this.list = context.querySelectorAll(selector);
                    }
                    else if (!type[1]) { // tag
                        this.list = context.getElementsByTagName(type[2]);
                    }
                    else if (type[1] === '.') { // class
                        this.list = context.getElementsByClassName(type[2]);
                    }
                    else { // id
                        this.list = [context.querySelector('#' + type[2])];
                    }
                }
                else if (selector instanceof Query) {
                    this.list = selector.list;
                }
                else if (isArrayLike(selector)) {
                    this.list = selector;
                }
                else {
                    this.list = [selector];
                }
            }
            each(handler) {
                each(this.list, handler);
                return this;
            }
            on(events, fn) {
                events = events.split(' ');
                return this.each((_, el) => {
                    events.forEach((event) => {
                        el.addEventListener(event, fn, false);
                    });
                });
            }
            one(events, fn) {
                events = events.split(' ');
                fn.$handler = function (e) {
                    this.removeEventListener(e.type, fn.$handler);
                    return fn.apply(this, arguments);
                };
                return this.each((_, el) => {
                    events.forEach((event) => {
                        el.addEventListener(event, fn.$handler, false);
                    });
                });
            }
            trigger(type) {
                let customEvent;
                try {
                    customEvent = new CustomEvent(type, { bubbles: true, cancelable: true });
                }
                catch (_) {
                    customEvent = c2js.DOC.createEvent('CustomEvent');
                    customEvent.initCustomEvent(type, true, true, 'CustomEvent');
                }
                return this.each((_, elem) => {
                    if (type === 'focus') {
                        return elem.focus();
                    }
                    elem.dispatchEvent(customEvent);
                });
            }
            empty() {
                return !this.list.length;
            }
            attr(name, value) {
                if (this.empty()) {
                    return;
                }
                if (!isSet(value)) {
                    return this.first().getAttribute(name);
                }
                return this.each((_, el) => {
                    el.setAttribute(name, value + '');
                });
            }
            attrIfNotExists(attr, value) {
                return this.each((_, el) => {
                    if (!el.getAttribute(attr)) {
                        el.setAttribute(attr, value);
                    }
                });
            }
            prop(name, value) {
                if (this.empty()) {
                    return;
                }
                if (!isSet(value)) {
                    return this.first()[name];
                }
                return this.each((_, el) => {
                    el[name] = value;
                });
            }
            val(value) {
                if (!isSet(value)) {
                    return this.prop('value');
                }
                this.prop('value', value);
            }
            text(text) {
                if (isSet(text)) {
                    return this.each((_, elem) => {
                        elem.textContent = text;
                    });
                }
                let value = '';
                this.each((_, elem) => {
                    value += elem.textContent;
                });
                return value.trim() || void 0;
            }
            css(styleName, value) {
                if (typeof styleName !== 'string') {
                    each(styleName, (key, value) => { this.css(key, value); });
                    return this;
                }
                if (isSet(value)) {
                    if (typeof styleName === 'number') {
                        value += 'px';
                    }
                    return this.each((_, elem) => { elem.style[styleName] = value; });
                }
                if (this.empty()) {
                    return void 0;
                }
                let el = this.first(), view = el.ownerDocument.defaultView;
                if (view && view.getComputedStyle) {
                    return view.getComputedStyle(el, void 0).getPropertyValue(styleName);
                }
                if (el.currentStyle) {
                    return el.currentStyle[styleName];
                }
                return el.style[styleName];
            }
            find(selector) {
                return c2(selector, this.first());
            }
            findOne(selector) {
                return c2(this.first().querySelector(selector));
            }
            filter(filter) {
                let list = [];
                this.each((i, el) => { filter.call(el, i, el) && list.push(el); });
                return c2(list);
            }
            get(index) {
                if (index < this.list.length) {
                    return this.list[index];
                }
                return void 0;
            }
            first() {
                return this.get(0);
            }
        }
        c2.Query = Query;
        function isArrayLike(obj) {
            if (Array.isArray && Array.isArray(obj)) {
                return true;
            }
            if (!obj) {
                return false;
            }
            let length = obj.length;
            return typeof length === "number" && (length === 0 || (length > 0 && (length - 1) in obj));
        }
        function isSet(value) {
            return value !== void 0;
        }
        function each(arrLike, iterator) {
            if (isArrayLike(arrLike)) {
                for (let i = 0; i < arrLike.length; i++) {
                    iterator.call(arrLike[i], i, arrLike[i]);
                }
            }
            else {
                for (let key in arrLike) {
                    iterator.call(arrLike[key], key, arrLike[key]);
                }
            }
            return arrLike;
        }
        c2.each = each;
        function storage(key, value) {
            if (isSet(value)) {
                localStorage.setItem(key, value);
                return;
            }
            return localStorage.getItem(key);
        }
        c2.storage = storage;
        function cookie(key, value) {
            if (isSet(value)) {
                c2js.DOC.cookie = `${key}=${JSON.stringify(value)}; path=/;`;
                return;
            }
            // Create name
            let name = `${key}=`, data;
            // Split cookies by ';'
            let rawCookies = c2js.DOC.cookie.split(';');
            // Find cookie with 'name'
            rawCookies.some((cookie) => {
                cookie = cookie.trim();
                if (cookie.indexOf(name) === -1) {
                    return false;
                }
                // When find name, get data and stop each
                data = cookie.substring(name.length, cookie.length);
                return true;
            });
            // Return json or string
            try {
                return JSON.parse(data);
            }
            catch (_) {
                return data;
            }
        }
        c2.cookie = cookie;
        c2.fn = Query.prototype;
    })(c2 = c2js.c2 || (c2js.c2 = {}));
})(c2js = exports.c2js || (exports.c2js = {}));
