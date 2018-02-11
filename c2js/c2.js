/* global $ */

$['c2js'] = function (config) {

// All c2js global variables
let 

info = {
    appName: 'c2js',
    navPrefix: null,
    fullscreen: null,
    customSeek: {},
    keymap: {
        space: ' ',
        esc: 'escape'
    }
},

/*
    * Start all c2js found
*/
start = function (query) {
    // Call engine to all c2js found
    console.info('Loading ' + info.appName + '...');
    $(query).each(engine);
    console.info(info.appName + ' is ready!');
},

/*
    * Configure control and video events
*/
engine = function () {

    let 

    $c2js = $(this),
    c2js = $c2js[0],
    $video = $($c2js.find('video, audio, iframe')),
    video = $video[0],

    // All c2js instance variables
    cache = {
        time: {
            seeking: null
        },
        mouse: {
            x: null,
            y: null,
            timeout: null
        },
        shortcuts: {}
    },

    // Defines which binder to call
    propertyController = function ($control, properties) {
        $control = $control.not('[c2-status]');
        forEach(properties, (prop, propValue) => {
            if      (prop === 'video')  {bindVideo($control, propValue); }
            else if (prop === 'events') {bindEvents($control, propValue); }
            else if (prop === 'ready')  {bindReady($control, propValue); }
        });
    },

    // Bind control events inside video events
    bindVideo = function ($callers, events) {
        forEach(events, (event, handler) => {
            $video.on(event, handler);
        });
    },

    // Bind control events
    bindEvents = function ($callers, events) {
        forEach(events, (event, handler) => $callers.on(event, handler));
    },

    // Bind some actions on DOM Ready
    bindReady = function ($callers, handler) {
        $callers.each(handler);
    },

    // Write shortcut on cache
    addShortcuts = function ($control) {
        $control.each(function () {
            let keys = $(this).attr('c2-shortcuts');
            if (!keys) {return null; }

            keys.split(' ').forEach(key => {
                key = key.toLowerCase();

                if (info.keymap[key]) {
                    key = info.keymap[key];
                }

                cache.shortcuts[key] = this;
            });
        });
    },

    // Bind shortcut on c2js keydown event
    bindShortcuts = function () {
        if (!cache.shortcuts) {return null; }

        $c2js.keydown(function (e) {
            let element, key = e.key.toLowerCase();
            if (element = cache.shortcuts[key]) {
                $(element).trigger('click');
            }
        });
    },

    // Redirect focus on control parameter to c2js
    redirectControlFocus = function () {
        $c2js.find(':not(:has(:first))').focus(function () {
            $c2js.focus();
        });
    },

    // Get control Helpers
    getHelpers = function (controlName) {
        return controls[controlName].helpers;
    },

    // Get all controls of a specific type
    getAll = function (controlName) {
        return controls[controlName].$all;
    },

    eachAll = function (controlName, handler) {
        getAll(controlName).each(handler);
    },

    // Get type
    getType = function (controlName) {
        return getValue(controls[controlName].type, controlName);
    },

    // Search on c2js instance all controls of a specific type
    searchControl = function (controlType) {
        return $c2js.find('[c2-' + controlType + ']');
    },

    // Initialize c2js
    initControls = function () {
        // Set tabindex if not exists (Fix focusable problem)
        setAttrIfNotExists(c2js, 'tabindex', -1);

        // Find all controls on c2js instance
        forEach(controls, function(controlName, prop) {
            let controlType = getValue(prop.type, controlName),
                $control = searchControl(controlType);

            if ($control) {
                // Register all controls of the type on $all variable
                controls[controlName]['$all'] = $control;

                // Register events
                propertyController($control, prop);

                // Add shortcuts on list
                addShortcuts($control);
            }
        });

        // Redirect focus of control to c2js (Fix 'space' problem)
        redirectControlFocus();

        // When you finish recording all the controls, then register your shortcuts
        bindShortcuts();
    },

    // Helpers

    // get value or default
    getValue = (value, defaultValue) => value ? value : defaultValue,

    // forEach (heavy :<) to get key and value
    forEach = function (object, iterator) {
        Object.keys(object).forEach(key => iterator(key, object[key]));
    },

    // toggle values passed by param
    toggleValue = (value, toggle) => toggle[value === toggle[0] ? 1 : 0],

    // Get value, min or max if overflow
    getMinMax = (value, min, max) =>    value < min ? min :
                                        value > max ? max :
                                        value,

    setAttrIfNotExists = function (elem, attr, value) {
        if (!$(elem).attr(attr)) {
            $(elem).attr(attr, value);
        }
    },

    addInfo = function (add) {
        let info = $c2js.attr('c2js'),
            addString = '';

        add.forEach(status => {
            if (info.indexOf(status) !== -1) {
                console.info('Trying to add duplicated info: ' + status + '.');
                return false;
            }
            addString += ' ' + status;
        });

        info += addString;
        $c2js.attr('c2js', info.trim());
    },

    rmInfo = function (rm) {
        let info = $c2js.attr('c2js'),
            rmRegExp = new RegExp('\\s?(' + rm.join("|") + ')');

        info = info.replace(rmRegExp, '');
        $c2js.attr('c2js', info.trim());
    },

    // get/set attribute
    c2 = function (control, controlName, value) {
        let type = getType(controlName);

        if (value === undefined) {
            return $(control).attr('c2-' + type);
        }else if (value === true) {
            addInfo([type]);
        } else if (value === false) {
            rmInfo([type]);
        }

        $(control).attr('c2-' + type, value);
    },

    // Set attribute of all of the type
    c2setAll = function (controlName, value) {
        c2(getAll(controlName), controlName, value);
    },

    // Get any attribute value by type
    c2getAny = function (controlName) {
        let $all = getAll(controlName);
        if (!$all.length) {return ''; }

        let type = getType(controlName);             
        return $($all[0]).attr('c2-' + type);
    },

    // Get details of the number and convert if needed (not very suggestive)
    getDetailedNumber = function (number, typeTo, total) {
        if (!number) {number = 0; }
        
        let match = (number + '').match(/^(\D*)(\d|\.)+(\D*)$/),
            result = {signal: match[1], type: match[3]},
            param = result.type === '%' ? total : typeTo;

        result.number = parseFloat(number);
        if (param) {result.number = convertNumber(result, param); }

        return result;
    },

    // Convert number or resolve the porcentage
    convertNumber = function (value, typeToOrTotal) {
        if (!value.type) {return value.number; }

        if (value.type === '%') {
            return value.number * typeToOrTotal / 100;
        }

        let types = ['ms', 's', 'm', 'h', 'd'],
            values = [  1000,  60,  60,  24  ],
            indexFrom = types.indexOf(value.type),
            indexTo = types.indexOf(typeToOrTotal);

        while (indexFrom !== indexTo) {
            if (indexFrom > indexTo) {
                value.number *= values[--indexFrom];
            } else {
                value.number /= values[indexFrom++];
            }
        }

        return value.number;
    },

    // Convert seconds to format HH:mm:ss
    convertTime = function (seconds) {
        let date = new Date(null),
            ISORange = [11, 8];
        date.setSeconds(seconds);
        
        if (seconds < 3600) {
            ISORange = [14, 5];
        }
        return date.toISOString().substr(ISORange[0], ISORange[1]);
    },

    // Verify if browser allow fullscreen and set the navPrefix and
    // fullscreen functions
    allowFullscreen = function () {
        if (info.fullscreen) {return info.fullscreen.allowed; }

        let fns = false, FS_ENTER = 0, FS_LEAVE = 1, FS_CHECK = 2;

        if (document.webkitFullscreenEnabled) {

            info.navPrefix = 'webkit';
            fns = ['webkitRequestFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement'];

        } else if (document.mozFullScreenEnabled) {

            info.navPrefix = 'moz';
            fns = ['mozRequestFullScreen', 'mozCancelFullScreen', 'mozFullScreenElement'];

        } else if (document.msFullscreenEnabled) {
            
            info.navPrefix = 'ms';
            fns = ['msRequestFullscreen', 'msExitFullscreen', 'msFullscreenElement'];

        } else if (document.fullscreenEnabled) {

            info.navPrefix = '';
            fns = ['requestFullscreen', 'exitFullscreen', 'fullscreenElement'];

        } else {info.fullscreen = {allowed: false}; }

        if (fns) {
            info.fullscreen = {
                allowed: true,
                last: null,
                enter: e => {
                    e[fns[FS_ENTER]]();
                    info.fullscreen.last = e;
                },
                leave: () => document[fns[FS_LEAVE]](),
                check: () => document[fns[FS_CHECK]],
            };
        }

        return info.fullscreen.allowed;
    },

    // Controls

    controls = {
        play: {

            events: {
                click: function () {
                    video.paused ? video.play() : video.pause();
                }
            },

            video: {
                play: function () {
                    c2setAll('play', true);
                },
                pause: function () {
                    c2setAll('play', false);
                }
            }

        },
        stop: {

            events: {
                click: function () {
                    video.pause();
                    video.currentTime = 0;
                    c2setAll('stop', true);
                }
            },

            video: {
                durationchange: function () {
                    c2setAll('stop', true);
                },
                play: function () {
                    c2setAll('stop', false);
                }
            }

        },
        move: {

            events: {
                click: function () {
                    let max = video.duration,
                        details = getDetailedNumber(c2(this, 'move'), 's', max),
                        time = details.number;

                    if (details.signal) {
                        time += video.currentTime;
                        time = getMinMax(time, 0, max);
                    }
                    video.currentTime = time;
                }
            }

        },
        volume: {

            events: {
                click: function () {
                    let details = getDetailedNumber(c2(this, 'volume'), null, 1),
                        volume = details.number;

                    if (details.signal) {
                        volume += video.volume;
                        volume = getMinMax(volume, 0, 1);
                    }
                    video.volume = volume;
                }
            }

        },
        mute: {

            events: {
                click: function () {
                    video.muted = !video.muted;
                }
            },

            video: {
                volumechange: function () {
                    let muted = video.volume === 0 || video.muted;
                    c2setAll('mute', muted);
                }
            }

        },
        fullscreen: {

            helpers: {
                setFullscreenEvents: function () {
                    let fs = info.fullscreen,
                        fsChange = info.navPrefix + 'fullscreenchange',
                        fsError = info.navPrefix + 'fullscreenerror';

                    $(document).on(fsChange, function () {
                        if (c2js === fs.last) {
                            if (fs.check()) {
                                c2setAll('fullscreen', true);
                            } else {
                                c2setAll('fullscreen', false);
                            }
                        }
                    });
                    $(document).on(fsError, function () {
                        if (c2js === fs.last) {
                            alert('Fullscreen Error!');
                            console.error('Fullscreen Error!');
                        }
                    });
                }
            },

            ready: function () {
                if (allowFullscreen()) {
                    getHelpers('fullscreen').setFullscreenEvents();
                } else {
                    c2(this, 'fullscreen', 'null');
                }
            },

            events: {
                click: function () {
                    let fs = info.fullscreen;
                    if (!fs.allowed) {return null; }
                    fs.check() ? fs.leave() : fs.enter(c2js);
                }
            }

        },
        customSeek: {

            helpers: {

                getValue: function (e) {
                    let pos = e.pageX - $(this).offset().left;
                    return getMinMax(pos / $(this).width(), 0, 1);
                },

                setValue: function (fn) {fn.apply(this); },

                mouseDown: function () {
                    info.customSeek['actived'] = true;
                },

                mouseMove: function (e) {
                    let pos = e.pageX - $(this).offset().left,
                        pct = getMinMax(pos / $(this).width(), 0, 1);
                    vid.currentTime = vid.duration * pct;
                },

                mouseUp: function () {
                    info.customSeek['actived'] = false;
                },

                onUpdate: function (progress, loaded) {

                }
            }

        },
        timeSeek: {

            type: 'time-seek',

            ready: function () {
                setAttrIfNotExists(this, 'step', 0.1);
                setAttrIfNotExists(this, 'max', 100);
                setAttrIfNotExists(this, 'value', 0);
            },

            helpers: {
                setTime: function () {
                    let value = $(this).val(), max = $(this).attr('max');
                    video.currentTime = video.duration * value / max;
                },
                setSeek: function () {
                    let max = $(this).attr('max');
                    $(this).val(video.currentTime * max / video.duration);
                }
            },

            events: {
                'input change': function () {
                    getHelpers('timeSeek').setTime.apply(this);
                },
                mousedown: function () {
                    cache.time.seeking = true;
                },
                mouseup: function () {
                    cache.time.seeking = false;
                }
            },

            video: {
                timeupdate: function () {
                    if (!cache.time.seeking) {
                        eachAll('timeSeek', getHelpers('timeSeek').setSeek);
                    }
                }
            }

        },
        volumeSeek: {

            type: 'volume-seek',

            ready: function () {
                setAttrIfNotExists(this, 'step', 5);
                setAttrIfNotExists(this, 'max', 100);
                setAttrIfNotExists(this, 'value', 0);
            },

            helpers: {
                setVolume: function () {
                    if (!video.muted || $(this).val()) {
                        video.volume = $(this).val() / $(this).attr('max');
                        video.muted = video.volume === 0;
                    }
                },
                setSeek: function () {
                    if (video.muted) {
                        $(this).val(0); return;
                    }
                    $(this).val(video.volume * $(this).attr('max'));
                }
            },

            events: {
                'input change': function () {
                    getHelpers('volumeSeek').setVolume.apply(this);
                }
            },
            
            video: {
                durationchange: () => eachAll('volumeSeek', function () {
                    getHelpers('volumeSeek').setSeek.apply(this);
                }),
                volumechange: () => eachAll('volumeSeek', function () {
                    getHelpers('volumeSeek').setSeek.apply(this);
                })
            }

        },
        time: {

            helpers: {
                updateTime: function () {
                    let time = video.currentTime, prefix = '';
                        
                    if ($(this).attr('c2-time') === 'remaining') {
                        time = video.duration - video.currentTime;  
                        prefix = '-';
                    }
                    
                    $(this).text(prefix + convertTime(time));
                }
            },

            events: {
                click: function () {
                    c2(this, 'time', toggleValue(c2(this, 'time'), ['current', 'remaining']));
                    getHelpers('time').updateTime.apply(this);
                }
            },

            video: {
                timeupdate: () => eachAll('time', getHelpers('time').updateTime)
            }

        },
        duration: {
            
            video: {
                durationchange: () => eachAll('duration', function () {
                    let time = video.duration,
                    attr = $(this).attr('c2-duration');

                    if (attr) {
                        $(this).attr(attr, convertTime(time));
                        return;
                    }
                    $(this).text(convertTime(time));
                })
            }

        },
        loop: {

            events: {
                click: function () {
                    video.loop = !video.loop;
                    if (video.loop) {
                        c2(this, 'loop', true);
                        return;
                    }
                    c2(this, 'loop', false);
                }
            }

        },
        speed: {

            events: {
                click: function () {
                    let min = 0,
                        max = 3,
                        details = getDetailedNumber(c2(this, 'speed'), null, 1),
                        speed = details.number;

                    if (details.signal) {
                        speed += video.playbackRate;
                        speed = speed > max ? max : 
                                speed < min ? min : 
                                speed;
                    }

                    video.playbackRate = speed;
                }
            }

        },
        hideMouse: {
            
            type: 'hide-mouse',
            
            ready: function () {
                this['c2HideMouse'] = {
                    id: null,
                    timer: null,
                    isMoving: (status) => {
                        let hm = this.c2HideMouse,
                            timer = $(this).attr('c2-hide-mouse');
                        
                        if (!status) {
                            hm.timer = null;
                            $(this).css('cursor', 'none');
                            return;
                        }
                        
                        hm.timer = timer ? getDetailedNumber(timer, 'ms').number : 3000;
                        $(this).css('cursor', '');
                    },
                    timeout: () => this.c2HideMouse.isMoving(false)
                };
            },
            
            events: {
                mousemove: function (e) {
                    let hideMouse = this.c2HideMouse;
                    
                    if (!hideMouse.timer) {hideMouse.isMoving(true); }
                    
                    if (hideMouse.id) {clearTimeout(hideMouse.id); }
                    hideMouse.id = setTimeout(hideMouse.timeout, hideMouse.timer);
                }
            }

        },
        blank: {},
    };

    initControls();
};

// Start on DOM Ready
$(() => start('[c2js]'));

};

$.c2js({

});