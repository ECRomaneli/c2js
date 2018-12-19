/**
 * Mix self-constructor
 */
function c2js(e, c, o) {
    var isConfig = function (obj) { return obj.__proto__ === Object.prototype; }, isFunction = function (fn) { return typeof fn === 'function'; }, startAll = function (c, o) {
        c2js.c2("[" + c2js.APP_NAME + "]").each(function (_, el) {
            !el.c2 && new c2js.Init(el, c, o);
        });
    };
    if (arguments.length === 3
        || arguments.length === 2 && isConfig(c)
        || arguments.length === 1 && !(isConfig(e) || isFunction(e))) {
        c2js.DOMReady(function () { new c2js.Init(e, c, o); });
        return;
    }
    if (arguments.length === 2) {
        if (isConfig(e)) {
            c2js.DOMReady(function () { startAll(e, c); });
            return;
        }
        c2js.DOMReady(function () { new c2js.Init(e, void 0, c); });
        return;
    }
    if (arguments.length === 1) {
        if (isConfig(e)) {
            c2js.DOMReady(function () { startAll(e); });
            return;
        }
        c2js.DOMReady(function () { startAll(void 0, e); });
        return;
    }
    c2js.DOMReady(function () { startAll(); });
}
(function (c2js) {
    c2js.APP_NAME = 'c2js';
    var DOC = document;
    var WIN = window;
    var STORAGE;
    (function (STORAGE) {
        STORAGE["VOLUME"] = "_C2.VOLUME";
        STORAGE["MUTED"] = "_C2.MUTED";
        STORAGE["TIME"] = "_C2.CURRENT_TIME";
        STORAGE["SRC"] = "_C2.SOURCE";
    })(STORAGE || (STORAGE = {}));
    var MEDIASTATE;
    (function (MEDIASTATE) {
        MEDIASTATE[MEDIASTATE["HAVE_NOTHING"] = 0] = "HAVE_NOTHING";
        MEDIASTATE[MEDIASTATE["HAVE_METADATA"] = 1] = "HAVE_METADATA";
        MEDIASTATE[MEDIASTATE["HAVE_CURRENT_DATA"] = 2] = "HAVE_CURRENT_DATA";
        MEDIASTATE[MEDIASTATE["HAVE_FUTURE_DATA"] = 3] = "HAVE_FUTURE_DATA";
        MEDIASTATE[MEDIASTATE["HAVE_ENOUGH_DATA"] = 4] = "HAVE_ENOUGH_DATA"; // Enough data is available for downloading media to the end without interruption.
    })(MEDIASTATE || (MEDIASTATE = {}));
    var READY_INSTANCES = [];
    var READY_HANDLERS = [];
    var SEEK_DATA = { seeking: false, last: void 0 };
    var KEYMAP = {
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
    var DEFAULT_CONFIG = {
        saveTime: false,
        speed: { min: 0, max: 3 },
        timer: 1000,
        timeFormat: 'mm:ss'
    };
    // FIXED: On trying to access localStorage with file protocol at the Edge, thrown Exception.
    try {
        DEFAULT_CONFIG.saveWith = localStorage ? 'localStorage' : 'cookie';
    }
    catch (e) {
        DEFAULT_CONFIG.saveWith = 'cookie';
    }
    var FS_VAR;
    // Verify if browser allow fullscreen and set the navPrefix and
    // fullscreen functions
    // FIX: This script dont grant if fullscreen is not supported.
    function allowFullscreen() {
        if (FS_VAR) {
            return FS_VAR.allowed;
        }
        var FN, $DOC = c2(DOC);
        if (DOC.webkitFullscreenEnabled) {
            FN = [
                'webkitRequestFullscreen', 'webkitExitFullscreen',
                'webkitFullscreenElement', 'webkitfullscreenchange',
                'webkitfullscreenerror'
            ];
        }
        else if (DOC.webkitCancelFullScreen) {
            FN = [
                'webkitRequestFullScreen', 'webkitCancelFullScreen',
                'webkitCurrentFullScreenElement', 'webkitfullscreenchange',
                'webkitfullscreenerror'
            ];
        }
        else if (DOC.mozFullScreenEnabled) {
            FN = [
                'mozRequestFullScreen', 'mozCancelFullScreen',
                'mozFullScreenElement', 'mozfullscreenchange',
                'mozfullscreenerror'
            ];
        }
        else if (DOC.msFullscreenEnabled) {
            FN = [
                'msRequestFullscreen', 'msExitFullscreen',
                'msFullscreenElement', 'MSFullscreenChange',
                'MSFullscreenError'
            ];
        }
        else if (DOC.fullscreenEnabled) {
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
            enter: function (el) { el[FN[0]](); },
            leave: function () { DOC[FN[1]](); },
            check: function () { return DOC[FN[2]]; },
            onChange: function (h) { $DOC.on(FN[3], h); },
            onError: function (h) { $DOC.on(FN[4], h); }
        };
        return true;
    }
    function DOMReady(fn) {
        if (DOC.readyState !== 'loading') {
            fn();
        }
        else {
            DOC.addEventListener('DOMContentLoaded', function () { fn(); });
        }
    }
    c2js.DOMReady = DOMReady;
    function ready(fn) {
        READY_INSTANCES.forEach(function (instance) { fn.apply(instance.root, instance); });
        READY_HANDLERS.push(fn);
    }
    c2js.ready = ready;
    // toggle values passed by param
    function toggleVal(value, toggle) {
        return toggle[value === toggle[0] ? 1 : 0];
    }
    c2js.toggleVal = toggleVal;
    function isNull(obj) {
        return obj !== void 0 && obj !== null;
    }
    // Get value, min or max if overflow
    function minMaxVal(value, min, max) {
        return value < min ? min : value > max ? max : value;
    }
    // Break down string number to 'signal', 'number' and 'unit'.
    function breakNumber(number, typeTo, total) {
        if (!number) {
            return { number: 0 };
        }
        var match = (number + '').match(/^(\D*)(\d|\.)+(\D*)$/), broken = { signal: match[1], type: match[3], number: parseFloat(number) }, param = broken.type === '%' ? total : typeTo;
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
        var types = ['ms', 's', 'm', 'h', 'd'], values = [1000, 60, 60, 24], indexFrom = types.indexOf(broken.type), indexTo = types.indexOf(typeToOrTotal);
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
        var date = new Date(seconds * 1000), ISORange = [11, 8];
        if (seconds < 3600) {
            ISORange = [14, 5];
        }
        return date.toISOString().substr(ISORange[0], ISORange[1]);
    }
    function isSubstr(str, substr) {
        return str.indexOf(substr) !== -1;
    }
    var Init = /** @class */ (function () {
        function Init(el, config, onReady) {
            if (config === void 0) { config = {}; }
            var _this_1 = this;
            this.cache = {};
            this.ctrls = {
                loading: {
                    media: {
                        'loadstart seeking waiting': function (e) {
                            e.$all.data('loading', true);
                        },
                        'canplay error': function (e) {
                            e.$all.data('loading', false);
                        }
                    }
                },
                play: {
                    events: {
                        click: function (e) {
                            if (e.$media.attr('src')) {
                                e.media.paused ? e.media.play() : e.media.pause();
                            }
                            else {
                                e.$media.trigger('error');
                                console.error('Trying to play/pause media without source.');
                            }
                        }
                    },
                    media: {
                        playing: function (e) {
                            e.$all.data('play', true);
                        },
                        pause: function (e) {
                            e.$all.data('play', false);
                        },
                        error: function (e) {
                            e.$all.data('play', 'null');
                        }
                    }
                },
                stop: {
                    events: {
                        click: function (e) {
                            if (!e.media.paused) {
                                e.media.pause();
                            }
                            e.$all.data('stop', true);
                            e.media.currentTime = 0;
                        }
                    },
                    media: {
                        play: function (e) {
                            e.$all.data('stop', false);
                        },
                        'loadeddata ended error': function (e) {
                            if (!e.context.hasStatus('stop')) {
                                e.$all.data('stop', true);
                            }
                        }
                    }
                },
                skip: {
                    events: {
                        click: function (e) {
                            var max = e.media.duration, broken = breakNumber(c2(this).data('skip'), 's', max), time = broken.number;
                            if (broken.signal) {
                                time += e.media.currentTime;
                                time = minMaxVal(time, 0, max);
                            }
                            e.media.currentTime = time;
                        }
                    }
                },
                volume: {
                    events: {
                        click: function (e) {
                            var broken = breakNumber(c2(this).data('volume'), null, 1), volume = broken.number;
                            if (broken.signal) {
                                volume += e.media.volume;
                                volume = minMaxVal(volume, 0, 1);
                            }
                            e.media.volume = volume;
                        }
                    }
                },
                mute: {
                    events: {
                        click: function (e) {
                            e.media.muted = !e.media.muted;
                        }
                    },
                    media: {
                        'loadeddata volumechange': function (e) {
                            e.$all.data('mute', !e.media.volume || e.media.muted);
                        }
                    }
                },
                fullscreen: {
                    ready: function (e) {
                        if (!allowFullscreen()) {
                            e.$all.data('fullscreen', 'null');
                            return;
                        }
                        FS_VAR.onChange(function () {
                            e.$all.data('fullscreen', e.root === FS_VAR.check());
                        });
                        FS_VAR.onError(function () {
                            if (e.root === FS_VAR.check()) {
                                alert('Fullscreen Error!');
                                console.error('Fullscreen Error!');
                            }
                        });
                    },
                    events: {
                        click: function (e) {
                            if (FS_VAR.allowed) {
                                FS_VAR.check() ? FS_VAR.leave() : FS_VAR.enter(e.root);
                            }
                        }
                    }
                },
                'time-seek': {
                    helpers: {
                        setTime: function (el, media) {
                            var max = parseFloat(c2(el).attr('max')), value = c2(el).val();
                            media.currentTime = media.duration * value / max;
                        },
                        setSeek: function (el, media) {
                            var max = parseFloat(c2(el).attr('max')), value = media.currentTime * max / media.duration;
                            c2(el).val(value || 0);
                        }
                    },
                    ready: function (e) {
                        e.$all.each(function (_, el) {
                            c2(el).attrIfNotExists('step', 0.1)
                                .attrIfNotExists('max', 100)
                                .val(0);
                        });
                    },
                    events: {
                        'input change': function (e) {
                            e.setTime(this, e.media);
                        },
                        mousedown: function () {
                            SEEK_DATA.seeking = true;
                        },
                        mouseup: function () {
                            SEEK_DATA.seeking = false;
                        }
                    },
                    media: {
                        'loadeddata timeupdate seeked': function (e) {
                            if (!SEEK_DATA.seeking) {
                                e.$all.each(function (_, el) {
                                    e.setSeek(el, e.media);
                                });
                            }
                        }
                    }
                },
                'volume-seek': {
                    helpers: {
                        setVolume: function (el, media) {
                            var value = c2(el).val();
                            if (media.muted && !value) {
                                return;
                            }
                            var max = c2(el).attr('max');
                            media.volume = (value / max) || 0;
                            media.muted = !media.volume;
                        },
                        setSeek: function (el, media) {
                            if (media.muted) {
                                c2(el).val(0);
                            }
                            else {
                                var max = c2(el).attr('max');
                                c2(el).val(media.volume * max);
                            }
                        }
                    },
                    ready: function (e) {
                        e.$all.each(function (_, el) {
                            c2(el).attrIfNotExists('step', 5)
                                .attrIfNotExists('max', 100)
                                .val(0);
                        });
                    },
                    events: {
                        'input change': function (e) {
                            e.$all.each(function (_, el) {
                                e.setVolume(el, e.media);
                            });
                        }
                    },
                    media: {
                        'loadeddata volumechange': function (e) {
                            e.$all.each(function (_, el) {
                                e.setSeek(el, e.media);
                            });
                        }
                    }
                },
                time: {
                    helpers: {
                        update: function (el, media) {
                            var time = media.currentTime, prefix = '';
                            if (c2(el).data('time') === 'remaining') {
                                time = media.duration - media.currentTime;
                                prefix = '-';
                            }
                            c2(el).text(prefix + convertTime(time));
                        }
                    },
                    events: {
                        click: function (e) {
                            c2(this).data('time', toggleVal(c2(this).data('time'), ['current', 'remaining']));
                            e.update(this, e.media);
                        }
                    },
                    media: {
                        'loadeddata stimeupdate': function (e) {
                            e.$all.each(function (_, el) {
                                e.update(el, e.media);
                            });
                        }
                    }
                },
                duration: {
                    media: {
                        'loadeddata durationchange': function (e) {
                            e.$all.each(function (_, el) {
                                var time = e.media.duration, attr = c2(el).data('duration');
                                if (attr) {
                                    c2(el).attr(attr, convertTime(time));
                                }
                                else {
                                    c2(el).text(convertTime(time));
                                }
                            });
                        }
                    }
                },
                loop: {
                    events: {
                        click: function (e) {
                            c2(this).data('loop', e.media.loop = !e.media.loop);
                        }
                    }
                },
                speed: {
                    events: {
                        click: function (e) {
                            var speedCfg = e.context.config.speed, broken = breakNumber(c2(this).data('speed'), null, 1), speed = broken.number;
                            if (broken.signal) {
                                speed += e.media.playbackRate;
                                speed = minMaxVal(speed, speedCfg.min, speedCfg.max);
                            }
                            e.media.playbackRate = speed;
                        }
                    }
                },
                timer: {
                    ready: function (e) {
                        var _this_1 = this;
                        // Initialize c2.timer and c2.maxTimer
                        e.$all.each(function (_, el) {
                            el.c2.timer = c2(_this_1).config('timer') || e.context.config.timer;
                        });
                    },
                    events: {
                        mousemove: function () {
                            var _this_1 = this;
                            var prop = this.c2;
                            if (prop.timerId) {
                                clearTimeout(prop.timerId);
                            }
                            else {
                                c2(this).data('timer', 'true');
                            }
                            this.c2.timerId = setTimeout(function () {
                                prop.timerId = void 0;
                                c2(_this_1).data('timer', 'false');
                            }, prop.timer);
                        }
                    }
                },
                status: {},
                custom: {}
            };
            var _this = this;
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
                return c2(this).attr('c2-' + ctrlType, value);
            };
            el.c2 = { instance: this };
            this.status = '';
            this.shortcuts = [];
            this.root = c2(el).get(0),
                this.$root = c2(this.root),
                this.$media = this.$root.findOne('video, audio'),
                this.media = this.$media.get(0);
            this.id = this.$root.attr(c2js.APP_NAME);
            this.$media.on('timeupdate', function () {
                if ((_this_1.cache.currentTime | 0) !== (_this_1.media.currentTime | 0)) {
                    _this_1.cache.currentTime = _this_1.media.currentTime;
                    _this_1.$media.trigger('stimeupdate');
                }
            });
            this.config = config;
            c2.each(DEFAULT_CONFIG, function (key, value) {
                if (_this_1.config[key] === void 0) {
                    _this_1.config[key] = value;
                }
            });
            this.$root.attrIfNotExists('tabindex', -1);
            this.$media.attrIfNotExists('src', '')
                .attrIfNotExists('tabindex', -1);
            this.initControls();
            this.loadSavedInfo();
            this.bindSaveEvents();
            this.executeOnReadyHandlers(onReady);
        }
        Init.prototype.executeOnReadyHandlers = function (onReady) {
            var _this_1 = this;
            READY_HANDLERS.forEach(function (handler) { handler.call(_this_1.root, _this_1); });
            onReady && onReady(this);
            READY_INSTANCES.push(this);
        };
        Init.prototype.mediaReadyState = function (id) {
            return this.media.readyState >= id;
        };
        Init.prototype.createHandler = function (handler, prop) {
            var h = prop.helpers;
            h.root = this.root;
            h.$root = this.$root;
            h.media = this.media;
            h.$media = this.$media;
            h.context = this;
            return function (e) {
                h.event = e;
                handler.call(this, h);
            };
        };
        Init.prototype.getAll = function (ctrlType) {
            return this.ctrls[ctrlType].helpers.$all;
        };
        Init.prototype.setStatus = function () {
            this.$root.data('status', this.status);
            this.getAll('status').data('status', this.status);
        };
        Init.prototype.addStatus = function (status) {
            if (this.hasStatus(status)) {
                return;
            }
            this.status += ' ' + status;
            this.status = this.status.trim();
            this.setStatus();
        };
        Init.prototype.rmStatus = function (status) {
            var rmRegExp = new RegExp("\\s?(" + status + ")");
            this.status = this.status.replace(rmRegExp, '').trim();
            this.setStatus();
        };
        Init.prototype.hasStatus = function (status) {
            return isSubstr(this.status, status);
        };
        Init.prototype.initControls = function () {
            var _this_1 = this;
            c2.each(this.ctrls, function (name, property) {
                var $ctrl = _this_1.$root.control(name).initProp('c2');
                if ($ctrl) {
                    // Register global variables into props
                    if (!property.helpers) {
                        property.helpers = {};
                    }
                    property.helpers.$all = $ctrl;
                    // Register events
                    _this_1.propertyController(property);
                    // Add shortcuts on list
                    _this_1.addShortcuts($ctrl);
                }
            });
            // Redirect focus of control to root (Fix 'space' problem)
            this.redirectControlFocus();
            // When you finish recording all the controls, then register your shortcuts
            this.bindShortcuts();
        };
        Init.prototype.propertyController = function (property) {
            property.ready && this.bindReady(property);
            property.media && this.bindMedia(property);
            property.events && this.bindEvents(property);
        };
        Init.prototype.bindEvents = function (property) {
            var _this_1 = this;
            var $callers = property.helpers.$all.notNull();
            c2.each(property.events, function (event, handler) {
                $callers.on(event, _this_1.createHandler(handler, property));
            });
        };
        Init.prototype.bindMedia = function (property) {
            var _this_1 = this;
            var loadedData = this.mediaReadyState(MEDIASTATE.HAVE_CURRENT_DATA);
            c2.each(property.media, function (event, handler) {
                handler = _this_1.createHandler(handler, property);
                // FIXED: crash when video loads first
                if (isSubstr(event, 'loadeddata') && loadedData) {
                    if (loadedData) {
                        handler();
                    }
                }
                _this_1.$media.on(event, handler);
            });
        };
        Init.prototype.bindReady = function (property) {
            this.createHandler(property.ready, property)();
        };
        Init.prototype.addShortcuts = function ($ctrls) {
            var _this_1 = this;
            $ctrls.each(function (_, el) {
                var $el = c2(el), keys = $el.data('shortcuts');
                if (!keys) {
                    return;
                }
                keys.toLowerCase().split(' ').forEach(function (key) {
                    if (key === 'dblclick') {
                        _this_1.$root.on(key, function (e) {
                            if (c2(e.target).config('dblClick') !== 'false') {
                                $el.trigger('click');
                            }
                        }, true);
                    }
                    else {
                        (KEYMAP[key] || [key]).forEach(function (key) {
                            _this_1.shortcuts[key] = el;
                        });
                    }
                });
            });
        };
        Init.prototype.bindShortcuts = function () {
            var _this_1 = this;
            this.$root.on('keydown', function (e) {
                var el, key = e.key.toLowerCase();
                if (el = _this_1.shortcuts[key]) {
                    c2(el).trigger('click');
                    e.preventDefault();
                }
            });
        };
        Init.prototype.redirectControlFocus = function () {
            var _this_1 = this;
            this.$root.on('focus', function (e) {
                _this_1.root.focus();
                e.stopPropagation();
            }, true);
        };
        Init.prototype.loadSavedInfo = function () {
            var _this_1 = this;
            var cfg = this.config;
            if (cfg.saveWith === 'none') {
                return;
            }
            var storage = this.cache.storage = cfg.saveWith === 'cookie' ? c2.cookie : c2.storage, volume = storage(STORAGE.VOLUME), muted = storage(STORAGE.MUTED), src = storage(STORAGE.SRC), time = storage(STORAGE.TIME);
            if (isNull(volume)) {
                this.media.volume = volume;
            }
            this.media.muted = muted === true || muted === 'true';
            // If src not exists, dont change the time
            if (!isNull(src)) {
                return;
            }
            // If the src of the video exists and is different, dont change the time
            var actualSrc = this.$media.attr('src');
            if (actualSrc && actualSrc !== src) {
                return;
            }
            var updateTime = function () {
                if (!isNull(time)) {
                    return;
                }
                _this_1.media.pause();
                // FIXED: Issue "updatetime unchanged" on Edge and IE
                _this_1.media.currentTime = parseFloat(time);
                _this_1.media.currentTime += 0.001;
            };
            // FIXED: Same video loaded on start
            if (this.mediaReadyState(MEDIASTATE.HAVE_METADATA)) {
                updateTime();
                return;
            }
            this.$media.one('loadedmetadata', updateTime);
            if (!actualSrc) {
                this.$media.attr('src', src);
            }
        };
        Init.prototype.bindSaveEvents = function () {
            var _this_1 = this;
            var cfg = this.config;
            if (cfg.saveWith === 'none') {
                return;
            }
            var storage = this.cache.storage;
            this.$media.on('volumechange', function () {
                var volume = this.volume, muted = this.muted;
                // Save volume status
                storage(STORAGE.VOLUME, volume);
                storage(STORAGE.MUTED, !volume || muted);
            });
            if (cfg.saveTime) {
                var src_1;
                // Save on init
                if (src_1 = this.$media.attr('src')) {
                    storage(STORAGE.SRC, src_1);
                }
                // Save when SRC change
                this.$media.on('loadstart', function () {
                    if (src_1 = _this_1.$media.attr('src')) {
                        storage(STORAGE.SRC, src_1);
                    }
                });
                // Save current time
                this.$media.on('stimeupdate', function () {
                    storage(STORAGE.TIME, this.currentTime);
                });
                // Save reset time
                this.$media.on('ended', function () {
                    storage(STORAGE.TIME, 0);
                });
            }
        };
        return Init;
    }());
    c2js.Init = Init;
    function c2(selector, context) { return new c2.Query(selector, context || DOC); }
    c2js.c2 = c2;
    (function (c2) {
        var Query = /** @class */ (function () {
            function Query(selector, context) {
                if (typeof selector === 'string') {
                    var type = selector.match(/^([#.]?)([-\w]+)(.*)$/);
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
            Query.prototype.each = function (handler) {
                each(this.list, handler);
                return this;
            };
            Query.prototype.on = function (events, fn, capture) {
                return this.eventListener('add', events, fn, capture);
            };
            Query.prototype.off = function (events, fn, capture) {
                return this.eventListener('remove', events, fn, capture);
            };
            Query.prototype.one = function (events, fn, capture) {
                return this.on(events, fn.$handler = function (e) {
                    this.removeEventListener(e.type, fn.$handler, capture);
                    return fn.apply(this, arguments);
                }, capture);
            };
            Query.prototype.eventListener = function (type, events, fn, capture) {
                if (capture === void 0) { capture = false; }
                events = events.split(' ');
                return this.each(function (_, el) {
                    events.forEach(function (event) {
                        if (event === 'click') {
                            el.hasOnClick = true;
                        }
                        el[type + 'EventListener'](event, fn, capture);
                    });
                });
            };
            Query.prototype.trigger = function (type) {
                var customEvent;
                try {
                    customEvent = new CustomEvent(type, { bubbles: true, cancelable: true });
                }
                catch (_) {
                    customEvent = DOC.createEvent('CustomEvent');
                    customEvent.initCustomEvent(type, true, true, 'CustomEvent');
                }
                return this.each(function (_, elem) {
                    if (type === 'focus') {
                        return elem.focus();
                    }
                    elem.dispatchEvent(customEvent);
                });
            };
            Query.prototype.empty = function () {
                return !this.list.length;
            };
            Query.prototype.toggleClass = function (className) {
                return this.requestClassList('toggle', className);
            };
            Query.prototype.addClass = function (className) {
                return this.requestClassList('add', className);
            };
            Query.prototype.removeClass = function (className) {
                return this.requestClassList('remove', className);
            };
            Query.prototype.requestClassList = function (fnName, className) {
                try {
                    return this.each(function (_, el) {
                        el.classList[fnName](className);
                    });
                }
                catch (e) {
                    console.error("ClassList not supported!\nError:");
                    console.error(e);
                    return this;
                }
            };
            Query.prototype.attr = function (name, value) {
                if (this.empty()) {
                    return;
                }
                if (!isSet(value)) {
                    return this.get(0).getAttribute(name);
                }
                return this.each(function (_, el) {
                    el.setAttribute(name, value + '');
                });
            };
            Query.prototype.attrIfNotExists = function (attr, value) {
                return this.each(function (_, el) {
                    if (!isNull(el.getAttribute(attr))) {
                        el.setAttribute(attr, value);
                    }
                });
            };
            Query.prototype.prop = function (prop, value) {
                if (!isSet(value)) {
                    return this.get(0)[prop];
                }
                return this.each(function (_, el) {
                    el[prop] = value;
                });
            };
            Query.prototype.val = function (value) {
                return this.prop('value', value);
            };
            Query.prototype.text = function (text) {
                if (isSet(text)) {
                    return this.each(function (_, el) {
                        el.textContent = text;
                    });
                }
                var value = '';
                this.each(function (_, el) {
                    value += el.textContent;
                });
                return value.trim() || void 0;
            };
            Query.prototype.css = function (styleName, value) {
                var _this_1 = this;
                if (typeof styleName !== 'string') {
                    each(styleName, function (key, value) { _this_1.css(key, value); });
                    return this;
                }
                if (isSet(value)) {
                    if (typeof styleName === 'number') {
                        value += 'px';
                    }
                    return this.each(function (_, elem) { elem.style[styleName] = value; });
                }
                if (this.empty()) {
                    return void 0;
                }
                var el = this.get(0), view = el.ownerDocument.defaultView;
                if (view && view.getComputedStyle) {
                    return view.getComputedStyle(el, void 0).getPropertyValue(styleName);
                }
                if (el.currentStyle) {
                    return el.currentStyle[styleName];
                }
                return el.style[styleName];
            };
            Query.prototype.find = function (selector) {
                return c2(selector, this.get(0));
            };
            Query.prototype.findOne = function (selector) {
                return c2(this.get(0).querySelector(selector));
            };
            Query.prototype.filter = function (filter) {
                var list = [];
                this.each(function (i, el) { filter.call(el, i, el) && list.push(el); });
                return c2(list);
            };
            Query.prototype.first = function () {
                var newList = this.list.length > 1 ? [this.list[0]] : this.list;
                return c2(newList);
            };
            Query.prototype.get = function (index) {
                return this.list[index];
            };
            Query.prototype.initProp = function (prop) {
                return this.each(function (_, el) { el[prop] = {}; });
            };
            Query.prototype.control = function (type) {
                return this.find("[c2-" + type + "]");
            };
            Query.prototype.notNull = function () {
                return this.filter(function (_, el) { return !el.hasAttribute('c2-null'); });
            };
            Query.prototype.custom = function (id) {
                return this.find("[c2-custom=" + id + "]");
            };
            Query.prototype.config = function (config) {
                return this.first().attr("c2-config:" + config);
            };
            return Query;
        }());
        c2.Query = Query;
        function isArrayLike(obj) {
            if (Array.isArray && Array.isArray(obj)) {
                return true;
            }
            if (!obj) {
                return false;
            }
            var l = obj.length;
            return typeof l === "number" && (l === 0 || (l > 0 && (l - 1) in obj));
        }
        function isSet(value) {
            return value !== void 0;
        }
        function each(arrLike, iterator) {
            if (isArrayLike(arrLike)) {
                for (var i = 0; i < arrLike.length; i++) {
                    iterator.call(arrLike[i], i, arrLike[i]);
                }
            }
            else {
                for (var key in arrLike) {
                    iterator.call(arrLike[key], key, arrLike[key]);
                }
            }
            return arrLike;
        }
        c2.each = each;
        function storage(key, value) {
            try {
                if (isSet(value)) {
                    localStorage.setItem(key, value);
                }
                else {
                    return localStorage.getItem(key);
                }
            }
            catch (e) {
                console.error('LocalStorage is not available and thrown an error.');
                return '';
            }
        }
        c2.storage = storage;
        function cookie(key, value) {
            if (isSet(value)) {
                DOC.cookie = key + "=" + JSON.stringify(value) + "; path=/;";
                return;
            }
            // Create name
            var name = key + "=", data;
            // Split cookies by ';'
            var rawCookies = DOC.cookie.split(';');
            // Find cookie with 'name'
            rawCookies.some(function (cookie) {
                cookie = cookie.trim();
                if (!isSubstr(cookie, name)) {
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
})(c2js || (c2js = {}));
