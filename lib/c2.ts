export function c2js(el: any, config?: c2js.Config, onReady?: c2js.OnReady) {
    c2js.ready(() => { new c2js.Init(el, config, onReady); });
}

export namespace c2js {
    export type Config = {
        saveWith?: 'none' | 'cookie' | 'localStorage',
        saveTime?: boolean,
        speed?: { min?: number, max?: number }
    };
    export type C2Event = {
        originalEvent: Event,
        c2js: HTMLElement,
        $c2js: c2.Query,
        media: HTMLMediaElement,
        $media: c2.Query,
        $all: c2.Query,
        context: c2js.Init,
        [key: string]: any
    }
    export type OnReady = (c2js: c2js.Init) => void;
    type ArrayLikeObject = { [key: string]: any, length?: number };
    type Handler = (event?: C2Event) => void;
    type ControlProperty = {
        ready?: Handler,
        events?: { [key: string]: Handler },
        media?: { [key: string]: Handler },
        helpers?: any
    };
    type ControlProperties = { [key: string]: ControlProperty };
    type BrokenNumber = { signal?: string, number: number, type?: string };
    export interface DOC extends Document { [key: string]: any; }
    export interface WIN extends Window { [key: string]: any; }

    export const APP_NAME = 'c2js';
    const DOC: DOC = document;
    const WIN: WIN = window;

    enum STORAGE {
        VOLUME = '_C2.VOLUME',
        MUTED = '_C2.MUTED',
        TIME = '_C2.CURRENT_TIME',
        SRC = '_C2.SOURCE'
    }

    enum MEDIASTATE {
        HAVE_NOTHING = 0,	    // No information is available.
        HAVE_METADATA = 1,	    // Enough media has been retrieved to the metadata are initialized. Seeking will works.
        HAVE_CURRENT_DATA = 2,	// Current frame loaded. 
        HAVE_FUTURE_DATA = 3,	// At least two frames loaded.
        HAVE_ENOUGH_DATA = 4	// Enough data is available for downloading media to the end without interruption.
    }

    const SEEK_DATA = { seeking: false, last: void 0 };
    const KEYMAP = {
        space:  [' ',       'spacebar'  ],
        ctrl:   ['ctrl',    'control'   ],
        alt:    ['alt',     'altgraph'  ],
        del:    ['del',     'delete'    ],
        esc:    ['esc',     'escape'    ],
        left:   ['left',    'arrowleft' ],
        up:     ['up',      'arrowup'   ],
        right:  ['right',   'arrowright'],
        down:   ['down',    'arrowdown' ]
    };
    const DEFAULT_CONFIG: Config = { saveTime: false, speed: { min: 0, max: 3 } };

    try {
        DEFAULT_CONFIG.saveWith = localStorage ? 'localStorage' : 'cookie';
    } catch (e) {
        DEFAULT_CONFIG.saveWith = 'cookie';
    }

    var FS_VAR;

    // Verify if browser allow fullscreen and set the navPrefix and
    // fullscreen functions
    function allowFullscreen(): boolean {
        if (FS_VAR) { return FS_VAR.allowed; }

        let FN: string[], $DOC = c2(DOC);

        if (DOC.webkitFullscreenEnabled) {
            FN = [
                'webkitRequestFullscreen','webkitExitFullscreen',
                'webkitFullscreenElement','webkitfullscreenchange',
                'webkitfullscreenerror'
            ];
        } else if (DOC.webkitCancelFullScreen) {
            FN = [
                'webkitRequestFullScreen','webkitCancelFullScreen',
                'webkitCurrentFullScreenElement','webkitfullscreenchange',
                'webkitfullscreenerror'
            ];
        } else if (DOC.mozFullScreenEnabled) {
            FN = [
                'mozRequestFullScreen','mozCancelFullScreen',
                'mozFullScreenElement','mozfullscreenchange',
                'mozfullscreenerror'
            ];
        } else if (DOC.msFullscreenEnabled) {
            FN = [
                'msRequestFullscreen','msExitFullscreen',
                'msFullscreenElement','MSFullscreenChange',
                'MSFullscreenError'
            ];
        } else if (DOC.fullscreenEnabled) {
            FN = [
                'requestFullscreen','exitFullscreen',
                'fullscreenElement','fullscreenchange',
                'fullscreenerror'
            ];
        } else {
            FS_VAR = { allowed: false };
            return false;
        }

        FS_VAR = {
            allowed: true,
            enter: (el) => { el[FN[0]](); },
            leave: () => { DOC[FN[1]](); },
            check: () => DOC[FN[2]],
            onChange: (h) => { $DOC.on(FN[3], h); },
            onError: (h) => { $DOC.on(FN[4], h); }
        };

        return true;
    }

    export function ready(fn: Function): void {
        if (DOC.readyState !== 'loading') {
            fn();
        } else {
            DOC.addEventListener('DOMContentLoaded', () => { fn(); });
        }
    }

    export function startAll(config?: c2js.Config, onReady?: c2js.OnReady) {
        ready(() => {
            c2(`[${APP_NAME}]`).each((_, el) => {
                !(<any>el).c2js && new c2js.Init(el, config, onReady);
            });
        });
    }

    // toggle values passed by param
    export function toggleVal(value: any, toggle: any[]): any {
        return toggle[value === toggle[0] ? 1 : 0];
    }

    function isSet(obj: any): boolean {
        return obj !== void 0 && obj !== null;
    }

    // Get value, min or max if overflow
    function minMaxVal(value: number, min: number, max: number): number {
        return  value < min ? min : value > max ? max : value;
    }

    function filterNull($ctrls: c2.Query): c2.Query {
        return $ctrls.filter((_, el) => !el.hasAttribute('c2-null'));
    }

    // Break down string number to 'signal', 'number' and 'unit'.
    function breakNumber(number: string, typeTo: string, total?: number): BrokenNumber {
        if (!number) { return { number: 0 }; }

        let match = (number + '').match(/^(\D*)(\d|\.)+(\D*)$/),
            broken = { signal: match[1], type: match[3], number: parseFloat(number) },
            param = broken.type === '%' ? total : typeTo;

        if (param) { parseNumber(broken, param); }
        return broken;
    }

    // Convert number or resolve the porcentage
    function parseNumber(broken: BrokenNumber, typeToOrTotal: string | number): void {
        if (!broken.type) { return; }

        if (typeof typeToOrTotal === 'number') {
            broken.type = '';
            broken.number *= typeToOrTotal / 100;
            return;
        }

        let types = ['ms', 's', 'm', 'h', 'd'],
            values = [  1000,  60,  60,  24  ],
            indexFrom = types.indexOf(broken.type),
            indexTo = types.indexOf(typeToOrTotal);

        broken.type = typeToOrTotal;
        while (indexFrom !== indexTo) {
            if (indexFrom > indexTo) {
                broken.number *= values[--indexFrom];
            } else {
                broken.number /= values[indexFrom++];
            }
        }
    }

    // Convert seconds to format HH:mm:ss
    function convertTime(seconds: number): string {
        let date = new Date(seconds * 1000), ISORange = [11, 8];
        if (seconds < 3600) { ISORange = [14, 5]; }
        return date.toISOString().substr(ISORange[0], ISORange[1]);
    }

    function isSubstr(str: string, substr: string): boolean {
        return str.indexOf(substr) !== -1;
    } 

    export class Init {
        private status: string;
        private shortcuts: HTMLElement[];
        private $c2js: c2.Query;
        private c2js: HTMLElement;
        private $media: c2.Query;
        private media: HTMLMediaElement;
        private config: Config;
        private cache: any = {};

        public constructor(el, config?: Config, onReady?: Function) {
            let _this = this;

            c2.fn.data = function (ctrlType: string, value?) {        
                if (value === void 0) {
                    return c2(this).attr('c2-' + ctrlType);
                }

                if (value === true) {
                    _this.addStatus(ctrlType);
                } else if (value === false) {
                    _this.rmStatus(ctrlType);
                }

                return c2(this).attr('c2-' + ctrlType, value);
            }

            el.c2js = true;
            this.status = '';
            this.shortcuts = [];
            this.c2js = <HTMLElement> c2(el).first(),
            this.$c2js = c2(this.c2js),
            this.$media = this.$c2js.findOne('video, audio'),
            this.media = <HTMLMediaElement> this.$media.first();

            this.$media.on('timeupdate', () => {
                if ((this.cache.currentTime|0) !== (this.media.currentTime|0)) {
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

            onReady && onReady(this.$c2js.attr('c2js'), this);
        }

        private readyStateAtLeast(id) {
            return this.media.readyState >= id;
        }

        private searchCtrl(ctrlType: string): c2.Query {
            return this.$c2js.find(`[c2-${ctrlType}]`);
        }

        private createHandler(handler: Function, prop: ControlProperty): Handler {
            let h = prop.helpers;

            h.c2js = this.c2js;
            h.$c2js = this.$c2js;
            h.media = this.media;
            h.$media = this.$media;
            h.context = this;

            return function (e) {
                h.event = e;
                handler.call(this, h);
            };
        }

        private getAll(ctrlType) {
            return this.ctrls[ctrlType].helpers.$all;
        }

        private setStatus(): void {
            this.$c2js.data('status', this.status);
            this.getAll('status').data('status', this.status);
        }

        private addStatus(status: string): void {
            if (this.hasStatus(status)) { return; }
            this.status += ' ' + status;
            this.status = this.status.trim();
            this.setStatus();
        }

        private rmStatus(status: string): void {
            let rmRegExp = new RegExp(`\\s?(${status})`);
            this.status = this.status.replace(rmRegExp, '').trim();
            this.setStatus();
        }

        private hasStatus(status: string): boolean {
            return isSubstr(this.status, status);
        }

        private initControls(): void {
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

        private propertyController(property: ControlProperty): void {
            property.ready    && this.bindReady(property);
            property.media    && this.bindMedia(property);
            property.events   && this.bindEvents(property);
        }

        private bindEvents(property: ControlProperty): void {
            let $callers = filterNull(property.helpers.$all);
            c2.each(property.events, (event, handler) => {
                $callers.on(event, this.createHandler(handler, property));
            });
        }

        private bindMedia(property: ControlProperty): void {
            // TESTING
            let loadedData = this.readyStateAtLeast(MEDIASTATE.HAVE_CURRENT_DATA);

            c2.each(property.media, (event, handler) => {
                handler = this.createHandler(handler, property);

                // Fix crash when video loads before c2js
                if (isSubstr(event, 'loadeddata') && loadedData) {
                    if (loadedData) { handler(); }
                }

                this.$media.on(event, handler);
            });
        }

        private bindReady(property: ControlProperty): void {
            this.createHandler(property.ready, property)();
        }

        private addShortcuts($ctrls: c2.Query): void {
            $ctrls.each((_, el) => {
                let keys = c2(el).data('shortcuts');
                if (!keys) { return; }

                keys.toLowerCase().split(' ').forEach((key) => {
                    if (key === 'dblclick') {
                        let $el = c2(el);
                        this.$c2js.on(key, (e) => {
                            if (!e.target.hasOnClick) {
                                $el.trigger('click');
                            }
                        }, true);
                    } else {
                        (KEYMAP[key] || [key]).forEach((key) => {
                            this.shortcuts[key] = el;
                        });
                    }
                });
            });
        }

        private bindShortcuts(): void {
            this.$c2js.on('keydown', (e) => {
                let el, key = e.key.toLowerCase();
                if (el = this.shortcuts[key]) {
                    c2(el).trigger('click');
                    e.preventDefault();
                }
            });
        }

        private redirectControlFocus(): void {
            let $leaves = this.$c2js.find('*').filter((_, el) => !el.firstElementChild);
            $leaves.on('focus', () => { this.$c2js.trigger('focus'); });
        }

        private ctrls: ControlProperties = {
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
                        } else {
                            e.$media.trigger('error');
                            console.error('Trying to play/pause media without source.');
                        }
                    }
                },
                media: {
                    play: function (e) {
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
                        if (!e.media.paused) { e.media.pause(); }
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

            move: {
                events: {
                    click: function (e) {
                        let max = e.media.duration,
                            broken = breakNumber(c2(this).data('move'), 's', max),
                            time = broken.number;
    
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
                        let broken = breakNumber(c2(this).data('volume'), null, 1),
                            volume = broken.number;
    
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

                    FS_VAR.onChange(() => {
                        e.$all.data('fullscreen', e.c2js === FS_VAR.check());
                    });

                    FS_VAR.onError(() => {
                        if (e.c2js === FS_VAR.check()) {
                            alert('Fullscreen Error!');
                            console.error('Fullscreen Error!');
                        }
                    });
                },
    
                events: {
                    click: function (e) {
                        if (FS_VAR.allowed) {
                            FS_VAR.check() ? FS_VAR.leave() : FS_VAR.enter(e.c2js);
                        }
                    }
                }
            },

            'time-seek': {
                helpers: {
                    setTime: function (el, media) {
                        let max = parseFloat(c2(el).attr('max')),
                            value = c2(el).val();
                        media.currentTime = media.duration * value / max;
                    },
                    setSeek: function (el, media) {
                        let max = parseFloat(c2(el).attr('max')),
                            value = media.currentTime * max / media.duration;
                        c2(el).val(value || 0);
                    }
                },
                ready: function (e) {
                    e.$all.each(function (_, el) {
                        c2(el)  .attrIfNotExists('step', 0.1)
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
                            e.$all.each((_, el) => {
                                e.setSeek(el, e.media);
                            });
                        }
                    }
                }
            },

            'volume-seek': {
                helpers: {
                    setVolume: function (el, media) {
                        let value = c2(el).val();
                        if (media.muted && !value) { return; }
    
                        let max = c2(el).attr('max');
                        media.volume = (value / max) || 0;
                        media.muted = !media.volume;
                    },
                    setSeek: function (el, media) {
                        if (media.muted) {
                            c2(el).val(0);
                        } else {
                            let max = c2(el).attr('max');
                            c2(el).val(media.volume * max);
                        }
    
                    }
                },
                ready: function (e) {
                    e.$all.each((_, el) => {
                        c2(el)  .attrIfNotExists('step', 5)
                                .attrIfNotExists('max', 100)
                                .val(0);
                    });
                },
                events: {
                    'input change': function (e) {
                        e.$all.each((_, el) => {
                            e.setVolume(el, e.media);
                        });
                    }
                },
                media: {
                    'loadeddata volumechange': function (e) {
                        e.$all.each((_, el) => {
                            e.setSeek(el, e.media);
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
                    click: function (e) {
                        c2(this).data('time', toggleVal(c2(this).data('time'), ['current', 'remaining']));
                        e.update(this, e.media);
                    }
                },
                media: {
                    'loadeddata stimeupdate': function (e) {
                        e.$all.each((_, el) => {
                            e.update(el, e.media);
                        });
                    }
                }
            },

            duration: {
                media: {
                    'loadeddata durationchange': function (e) {
                        e.$all.each((_, el) => {
                            let time = e.media.duration,
                                attr = c2(el).data('duration');
                            
                            if (attr) {
                                c2(el).attr(attr, convertTime(time));
                            } else {
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
                        let speedCfg = e.context.config.speed,
                            broken = breakNumber(c2(this).data('speed'), null, 1),
                            speed = broken.number;
    
                        if (broken.signal) {
                            speed += e.media.playbackRate;
                            speed = minMaxVal(speed, speedCfg.min, speedCfg.max);
                        }
    
                        e.media.playbackRate = speed;
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
                ready: function (e) {
                    e.$all.each((_, el) => {
                        (<any>el).c2 = { id: null, timer: null, cursor: c2(el).css('cursor') };
                    });
                },
                events: {
                    mousemove: function (e) {
                        let prop = this.c2;
                        if (!prop) { return; }
    
                        if (!prop.timer) { e.isMoving(this); }
    
                        if (prop.id) { clearTimeout(prop.id); }
                        prop.id = setTimeout(() => { e.isStopped(this); }, prop.timer);
                    }
                }
            },

            status: {},

            custom: {}
        };

        private loadSavedInfo(): void {
            let cfg = this.config;
            if (cfg.saveWith === 'none') { return; }
            
            let storage = this.cache.storage = cfg.saveWith === 'cookie' ? c2.cookie : c2.storage,
                volume = storage(STORAGE.VOLUME),
                muted = storage(STORAGE.MUTED),
                src = storage(STORAGE.SRC),
                time = storage(STORAGE.TIME);

            if (isSet(volume)) { this.media.volume = volume; }
            this.media.muted = muted === true || muted === 'true';

            // If src not exists, dont change the time
            if (!isSet(src)) { return; }

            // If the src of the video exists and is different, dont change the time
            let actualSrc = this.$media.attr('src');
            if (actualSrc && actualSrc !== src) { return; }

            let updateTime = () => {
                if (!isSet(time)) { return; }
                this.media.pause();
                // FIXED: Issue "updatetime unchanged" on Edge and IE
                this.media.currentTime = parseInt(time);
                this.media.currentTime += 0.001;
            };

            // FIXED: Same video loaded on start
            if (this.readyStateAtLeast(MEDIASTATE.HAVE_METADATA)) {
                updateTime();
                return;    
            }

            this.$media.one('loadedmetadata', updateTime);
            if (!actualSrc) { this.$media.attr('src', src); }
        }

        private bindSaveEvents(): void {
            let cfg = this.config;
            if (cfg.saveWith === 'none') { return; }

            let storage = this.cache.storage;

            this.$media.on('volumechange', function () {
                let volume = this.volume,
                    muted = this.muted;

                // Save volume status
                storage(STORAGE.VOLUME, volume);
                storage(STORAGE.MUTED, !volume || muted);
            });

            if (cfg.saveTime) {
                let src;
                // Save on init
                if (src = this.$media.attr('src')) {
                    storage(STORAGE.SRC, src);
                }
                // Save when SRC change
                this.$media.on('loadstart', () => {
                    if (src = this.$media.attr('src')) {
                        storage(STORAGE.SRC, src);
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
        }
    }

    export function c2(selector: string | HTMLElement | ArrayLike<HTMLElement> | DOC, context?): c2.Query { return new c2.Query(selector, context || DOC); }

    export namespace c2 {
        export class Query {
            [key: string]: any;
            private list: ArrayLike<HTMLElement>;

            public constructor(selector, context: DOC | HTMLElement) {
                if (typeof selector === 'string') {

                    let type = selector.match(/^([#.]?)([-\w]+)(.*)$/);

                    if (!type || type[3]) { // selector
                        this.list = context.querySelectorAll(selector);

                    } else if (!type[1]) { // tag
                        this.list = <any>context.getElementsByTagName(type[2]);

                    } else if (type[1] === '.') { // class
                        this.list = <any>context.getElementsByClassName(type[2]);

                    } else { // id
                        this.list = [context.querySelector('#' + type[2])];
                    }

                } else if (selector instanceof Query) {
                    this.list = selector.list;

                } else if (isArrayLike(selector)) {
                    this.list = selector;

                } else {
                    this.list = [selector];
                }
            }

            public each(handler: (i: number, el: HTMLElement) => void): this {
                each(this.list, handler);
                return this;
            }

            public on(events, fn, capture?): this {
                return this.eventListener('add', events, fn, capture);
            }

            public off(events, fn, capture?): this {
                return this.eventListener('remove', events, fn, capture);
            }

            public one(events, fn, capture?): this {
                return this.on(events, fn.$handler = function (e) {
                    this.removeEventListener(e.type, fn.$handler, capture);
                    return fn.apply(this, arguments);
                }, capture);
            }

            private eventListener(type, events, fn, capture = false): this {
                events = events.split(' ');
                return this.each((_, el) => {
                    events.forEach((event) => {
                        if (event === 'click') { (<any>el).hasOnClick = true; }
                        el[type + 'EventListener'](event, fn, capture);
                    });
                });
            }

            public trigger(type): this {
                let customEvent;

                try {
                    customEvent = new CustomEvent(type, { bubbles: true, cancelable: true });
                } catch (_) {
                    customEvent = DOC.createEvent('CustomEvent');
                    customEvent.initCustomEvent(type, true, true, 'CustomEvent');
                }
        
                return this.each((_, elem) => {
                    if (type === 'focus') { return elem.focus(); }
                    elem.dispatchEvent(customEvent);
                });
            }

            public empty(): boolean {
                return !this.list.length;
            }

            public attr(name: string, value?): any {
                if (this.empty()) { return; }
                if (!isSet(value)) {
                    return this.first().getAttribute(name);
                }
                return this.each((_, el) => {
                    el.setAttribute(name, value + '');
                });
            }

            public attrIfNotExists(attr: string, value): Query {
                return this.each((_, el) => {
                    if (!el.getAttribute(attr)) {
                        el.setAttribute(attr, value);
                    }
                });
            }

            public val(value?): any {
                if (!isSet(value)) {
                    return (<any>this.first()).value;
                }
                (<any>this.first()).value = value;
            }

            public text(text?): any {
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

            public css(styleName, value?): any {
                if (typeof styleName !== 'string') {
                    each(styleName, (key, value) => { this.css(key, value) });
                    return this;
                }
    
                if (isSet(value)) {
                    if (typeof styleName === 'number') { value += 'px' }
                    return this.each((_, elem) => { elem.style[styleName] = value });
                }
    
                if (this.empty()) { return void 0; }
    
                let el: any = this.first(),
                    view = el.ownerDocument.defaultView;
    
                if (view && view.getComputedStyle) { return view.getComputedStyle(el, void 0).getPropertyValue(styleName); }
                if (el.currentStyle) { return el.currentStyle[styleName]; }
                return el.style[styleName];
            }

            public find(selector: string): Query {
                return c2(selector, this.first());
            }

            public findOne(selector: string): Query {
                return c2(this.first().querySelector(selector));
            }

            public filter(filter: (i: number, el: HTMLElement) => boolean): Query {
                let list = [];
                this.each((i, el) => { filter.call(el, i, el) && list.push(el); });
                return c2(list);
            }

            public first(): HTMLElement | DOC | WIN {
                return this.list[0];
            }
        }

        function isArrayLike(obj): boolean {
            if (Array.isArray && Array.isArray(obj)) { return true }
            if (!obj) { return false }
    
            let l = obj.length;
            return typeof l === "number" && (l === 0 || (l > 0 && (l - 1) in obj));
        }

        function isSet(value): boolean {
            return value !== void 0;
        }

        export function each(arrLike: ArrayLikeObject, iterator): any {
            if (isArrayLike(arrLike)) {
                for (let i = 0; i < arrLike.length; i++) { iterator.call(arrLike[i], i, arrLike[i]); }
            } else {
                for (let key in arrLike) { iterator.call(arrLike[key], key, arrLike[key]); }
            }
            return arrLike;
        }

        export function storage(key: string, value?: any): any {
            try {
                if (isSet(value)) {    
                    localStorage.setItem(key, value);
                } else {
                    return localStorage.getItem(key);
                }
            } catch (e) {
                console.error('LocalStorage is not available and thrown an error.')
                return '';
            }            
        }

        export function cookie(key: string, value?: any): any {
            if (isSet(value)) {    
                DOC.cookie = `${key}=${JSON.stringify(value)}; path=/;`;
                return;
            }
    
            // Create name
            let name = `${key}=`, data;
    
            // Split cookies by ';'
            let rawCookies = DOC.cookie.split(';');
    
            // Find cookie with 'name'
            rawCookies.some((cookie) => {
                cookie = cookie.trim();
                if (!isSubstr(cookie, name)) { return false; }
    
                // When find name, get data and stop each
                data = cookie.substring(name.length, cookie.length);
                return true;
            });

            // Return json or string
            try { return JSON.parse(data); } catch (_) { return data; }
        }

        export const fn = Query.prototype;
    }
}