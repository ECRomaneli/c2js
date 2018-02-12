/* global $ */

$['c2js'] = function (config) {

// All c2js global variables
var 

info = {
    appName: 'C2JS',
    navPrefix: null,
    fullscreen: null,
    customSeek: {},
    keymap: {
        space:  [' '                    ],
        esc:    ['esc',     'escape'    ],
        right:  ['right',   'arrowright'],
        down:   ['down',    'arrowdown' ],
        left:   ['left',    'arrowleft' ],
        up:     ['up',      'arrowup'   ]
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

    var 

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
        $control = $control.not('[c2-null]');
        forEach(properties, function (prop, propValue) {
            if      (prop === 'events') {bindEvents($control, propValue); }
            else if (prop === 'video')  {bindVideo($control, propValue); }
            else if (prop === 'ready')  {bindReady($control, propValue); }
        });
    },

    // Bind control events inside video events
    bindVideo = function ($callers, events) {
        forEach(events, function (event, handler) {
            $video.on(event, handler);
        });
    },

    // Bind control events
    bindEvents = function ($callers, events) {
        forEach(events, function (event, handler) {$callers.on(event, handler); });
    },

    // Bind some actions on DOM Ready
    bindReady = function ($callers, handler) {
        $callers.each(handler);
    },

    // Write shortcut on cache
    addShortcuts = function ($control) {
        $control.each(function () {
            var elem = this, keys = $(this).attr('c2-shortcuts'), keymap;
            if (!keys) {return null; }

            keys.split(' ').forEach(function (key) {
                key = key.toLowerCase();
                if (keymap = info.keymap[key]) {
                    keymap.forEach(function (key) {
                        cache.shortcuts[key] = elem;
                    });                    
                } else {
                    cache.shortcuts[key] = elem;
                }
            });
        });
    },

    // Bind shortcut on c2js keydown event
    bindShortcuts = function () {
        if (!cache.shortcuts) {return null; }
        console.log(cache.shortcuts);
        $c2js.keydown(function (e) {
            var element, key = e.key.toLowerCase();
            console.log(key);
            if (element = cache.shortcuts[key]) {
                console.log(element);
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
            var controlType = getValue(prop.type, controlName),
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
    getValue = function (value, defaultValue) {return value ? value : defaultValue; },

    // forEach (heavy :<) to get key and value
    forEach = function (object, iterator) {
        Object.keys(object).forEach(function (key) {iterator(key, object[key]); });
    },

    // toggle values passed by param
    toggleValue = function (value, toggle) {return toggle[value === toggle[0] ? 1 : 0]; },

    // Get value, min or max if overflow
    getMinMax = function (value, min, max) {
        return  value < min ? min :
                value > max ? max :
                value;
    },

    setAttrIfNotExists = function (elem, attr, value) {
        if (!$(elem).attr(attr)) {
            $(elem).attr(attr, value);
        }
    },

    addInfo = function (add) {
        var info = $c2js.attr('c2js'),
            addString = '';

        add.forEach(function (status) {
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
        var info = $c2js.attr('c2js'),
            rmRegExp = new RegExp('\\s?(' + rm.join("|") + ')');

        info = info.replace(rmRegExp, '');
        $c2js.attr('c2js', info.trim());
    },

    // get/set attribute
    c2 = function (control, controlName, value) {
        var type = getType(controlName);

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
        var $all = getAll(controlName);
        if (!$all.length) {return ''; }

        var type = getType(controlName);             
        return $($all[0]).attr('c2-' + type);
    },

    // Get details of the number and convert if needed (not very suggestive)
    getDetailedNumber = function (number, typeTo, total) {
        if (!number) {number = 0; }
        
        var match = (number + '').match(/^(\D*)(\d|\.)+(\D*)$/),
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

        var types = ['ms', 's', 'm', 'h', 'd'],
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
        var date = new Date(null),
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

        var fns = false, FS_ENTER = 0, FS_LEAVE = 1, FS_CHECK = 2;

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
                enter: function (e) {
                    e[fns[FS_ENTER]]();
                    info.fullscreen.last = e;
                },
                leave: function () {document[fns[FS_LEAVE]](); },
                check: function () {document[fns[FS_CHECK]]; },
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
                'durationchange ended': function () {
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
                    var max = video.duration,
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
                    var details = getDetailedNumber(c2(this, 'volume'), null, 1),
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
                    var muted = video.volume === 0 || video.muted;
                    c2setAll('mute', muted);
                }
            }

        },
        fullscreen: {

            helpers: {
                setFullscreenEvents: function () {
                    var fs = info.fullscreen,
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
                    var fs = info.fullscreen;
                    if (!fs.allowed) {return null; }
                    fs.check() ? fs.leave() : fs.enter(c2js);
                }
            }

        },
        customSeek: {

            helpers: {

                getValue: function (e) {
                    var pos = e.pageX - $(this).offset().left;
                    return getMinMax(pos / $(this).width(), 0, 1);
                },

                setValue: function (fn) {fn.apply(this); },

                mouseDown: function () {
                    info.customSeek['actived'] = true;
                },

                mouseMove: function (e) {
                    var pos = e.pageX - $(this).offset().left,
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
                    var value = $(this).val(), max = $(this).attr('max');
                    video.currentTime = video.duration * value / max;
                },
                setSeek: function () {
                    var max = $(this).attr('max');
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
                'durationchange volumechange': function () {
                    eachAll('volumeSeek', function () {
                        getHelpers('volumeSeek').setSeek.apply(this);
                    });
                }
            }
        },
        time: {

            helpers: {
                updateTime: function () {
                    var time = video.currentTime, prefix = '';
                        
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
                timeupdate: function () {eachAll('time', getHelpers('time').updateTime); }
            }

        },
        duration: {
            
            video: {
                durationchange: function () {
                    eachAll('duration', function () {
                        var time = video.duration,
                        attr = $(this).attr('c2-duration');

                        if (attr) {
                            $(this).attr(attr, convertTime(time));
                            return;
                        }
                        $(this).text(convertTime(time));
                    })
                }
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
                    var min = 0,
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
                var elem = this;
                this['c2HideMouse'] = {
                    id: null,
                    timer: null,
                    isMoving: function (status) {
                        var hm = elem.c2HideMouse,
                            timer = $(elem).attr('c2-hide-mouse');
                        
                        if (!status) {
                            hm.timer = null;
                            $(elem).css('cursor', 'none');
                            return;
                        }
                        
                        hm.timer = timer ? getDetailedNumber(timer, 'ms').number : 3000;
                        $(elem).css('cursor', '');
                    },
                    timeout: function () {elem.c2HideMouse.isMoving(false); }
                };
            },
            
            events: {
                mousemove: function () {
                    var hideMouse = this.c2HideMouse;
                    
                    if (!hideMouse.timer) {hideMouse.isMoving(true); }
                    
                    if (hideMouse.id) {clearTimeout(hideMouse.id); }
                    hideMouse.id = setTimeout(hideMouse.timeout, hideMouse.timer);
                }
            }

        },
        custom: {},
    };

    initControls();
};

// Start on DOM Ready
$(function () {start('[c2js]'); });

};

$.c2js();