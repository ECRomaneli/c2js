/*global $, this*/

$['c2js'] = function (config) {
'use strict';

// All c2js global variables
let

DOC = document,
$DOC = $(document),

info = {
    appName: 'C2JS',
    navPrefix: null,
    fullscreen: null,
    seekProp: {
        seeking: false,
        last: null
    },
    keymap: {
        space:  [' ',       'spacebar'  ],
        ctrl:   ['ctrl',    'control'   ],
        alt:    ['alt',     'altgraph'  ],
        del:    ['del',     'delete'    ],
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

    let

    $c2js = $(this),
    c2js = $c2js[0],
    $video = $($c2js.find('video, audio')),
    video = $video[0],

    // All c2js instance letiables
    cache = {
        shortcuts: {}
    },

    // Defines which binder to call
    propertyController = function ($control, properties) {
        $control = $control.not('[c2-custom]');
        forEach(properties, function (prop, propValue) {
            if      (prop === 'ready')  {bindReady(propValue); }
            else if (prop === 'events') {bindEvents($control, propValue); }
            else if (prop === 'video')  {bindVideo(propValue); }
        });
    },

    // Bind control events inside video events
    bindVideo = function (events) {
        forEach(events, function (event, handler) {
            $video.on(event, handler);
        });
    },

    // Bind control events
    bindEvents = function ($callers, events) {
        forEach(events, function (event, handler) {$callers.on(event, handler); });
    },

    // Bind some actions on DOM Ready
    bindReady = function (handler) {
        handler();
    },

    // Write shortcut on cache
    addShortcuts = function ($control) {
        $control.each(function () {
            let elem = this, keys = $(elem).attr('c2-shortcuts'), keymap;
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
    getType = function (controlName, noPrefix) {
        let value = getValue(controls[controlName].type, controlName);
        if (noPrefix) {
            return value;
        }
        return 'c2-' + value;
    },

    // Search on c2js instance all controls of a specific type
    searchControl = function (controlType) {
        return $c2js.find('[' + controlType + ']');
    },

    // Initialize c2js
    initControls = function () {
        // Set tabindex if not exists (Fix focusable problem)
        setAttrIfNotExists(c2js, 'tabindex', -1);

        // Find all controls on c2js instance
        forEach(controls, function(controlName, prop) {
            let controlType = getType(controlName),
                $control = searchControl(controlType);

            if ($control) {
                // Register all controls of the type on $all letiable
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
        $(elem).each(function () {
            if (!this.getAttribute(attr)) {
                this.setAttribute(attr, value);
            }
        });
    },

    addInfo = function (add) {
        let statuses = c2js.getAttribute('c2js'),
            addString = '';

        add.forEach(function (status) {
            if (statuses.indexOf(status) !== -1) {
                console.info('Trying to add duplicated statuses: ' + status + '.');
                return false;
            }
            addString += ' ' + status;
        });

        statuses += addString;
        c2js.setAttribute('c2js', statuses.trim());
    },

    rmInfo = function (rm) {
        let statuses = c2js.getAttribute('c2js'),
            rmRegExp = new RegExp('\\s?(' + rm.join("|") + ')');

        statuses = statuses.replace(rmRegExp, '');
        c2js.setAttribute('c2js', statuses.trim());
    },

    // get/set attribute
    c2 = function (controls, controlName, value) {
        let type = getType(controlName, true);

        if (value === undefined) {
            return $(controls).attr('c2-' + type);
        }

        if (value === true) {
            addInfo([type]);
        } else if (value === false) {
            rmInfo([type]);
        }

        $(controls).attr('c2-' + type, value);
    },

    // Set attribute of all of the type
    c2setAll = function (controlName, value) {
        c2(getAll(controlName), controlName, value);
    },

    // Get any attribute value by type
    c2getAny = function (controlName) {
        let $all = getAll(controlName);
        if (!$all.length) {return ''; }
        return $all[0].getAttribute(getType(controlName));
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

        if (DOC.webkitFullscreenEnabled) {
            info.navPrefix = 'webkit';
            fns = ['webkitRequestFullscreen', 'webkitExitFullscreen', 'webkitFullscreenElement'];
        } else if (DOC.mozFullScreenEnabled) {
            info.navPrefix = 'moz';
            fns = ['mozRequestFullScreen', 'mozCancelFullScreen', 'mozFullScreenElement'];
        } else if (DOC.msFullscreenEnabled) {
            info.navPrefix = 'ms';
            fns = ['msRequestFullscreen', 'msExitFullscreen', 'msFullscreenElement'];
        } else if (DOC.fullscreenEnabled) {
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
                leave: function () {DOC[fns[FS_LEAVE]](); },
                check: function () {return DOC[fns[FS_CHECK]]; }
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
                'durationchange pause ended': function () {
                    c2setAll('play', false);
                },

                play: function () {
                    c2setAll('play', true);
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

                    $DOC.on(fsChange, function () {
                        if (c2js === fs.last) {
                            c2setAll('fullscreen', fs.check());
                        }
                    });
                    $DOC.on(fsError, function () {
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
                    c2setAll('fullscreen', 'null');
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

            type: 'custom-seek',

            helpers: {

                value: function (value) {
                    if (value === undefined) {
                        value = this.c2.getValue();
                    }
                    this.c2.setValue(value);
                    return value;
                },
                
                mouseDown: function (e) {
                    let helpers = getHelpers('customSeek');
                    info.seekProp.last = this;
                    this.c2.mouse = {x: e.pageX, y: e.pageY};
                    $DOC.on('mousemove', helpers.mouseMove)
                        .on('mouseup', helpers.mouseUp);
                    $(this).trigger('change');
                },
                
                mouseUp: function () {
                    let helpers = getHelpers('customSeek'),
                        elem = info.seekProp.last;
                    $DOC.off('mousemove', helpers.mouseMove)
                        .off('mouseup', helpers.mouseUp);
                    $(elem).trigger('mouseup');
                },

                mouseMove: function (e) {
                    let elem = info.seekProp.last;
                    elem.c2.mouse = {x: e.pageX, y: e.pageY};
                    $(elem).trigger('change');
                }
            },

            ready: function () {
                eachAll('customSeek', function () {
                    let elem = this,
                        $range = $(elem).find('[c2-direction]'),
                        direction = $range.attr('c2-direction'),
                        prop;

                    if (direction === 'left' || direction === 'right') {
                        prop = {o: 'left', m: 'x', v: 'width'};
                    } else {
                        prop = {o: 'top', m: 'y', v: 'height'};
                    }

                    elem['c2'] = {
                        mouse: null,
                        setValue: function (value) {
                            if (direction === 'left' || direction === 'top') {
                                value = 100 - value;
                            }
                            $range.css(prop.v, value + '%');
                        },
                        getValue: function () {
                            let value = elem.c2.mouse[prop.m] - $(elem).offset()[prop.o],
                                pos = $(elem)[prop.v]();
                            value = pos ? getMinMax(value / pos, 0, 1) * 100 : 0;
                            if (direction === 'left' || direction === 'top') {
                                value = 100 - value;
                            }
                            return value;
                        }
                    }
                });
            },

            events: {
                mousedown: function (e) {
                    getHelpers('customSeek').mouseDown.apply(this, [e]);
                }
            }

        },
        timeSeek: {

            type: 'time-seek',

            ready: function () {eachAll('timeSeek', function () {
                let custom = this.hasAttribute(getType('customSeek'));
                this['c2value'] = getHelpers(custom ? 'customSeek' : 'timeSeek').value;

                setAttrIfNotExists(this, 'step', 0.1);
                setAttrIfNotExists(this, 'max', 100);
                this.c2value(0);
            })},

            helpers: {
                value: function (value) {
                    if (value === undefined) {
                        return $(this).val();
                    }
                    $(this).val(value);
                },
                setTime: function () {
                    let max = this.getAttribute('max'),
                        value = this.c2value();
                    video.currentTime = video.duration * value / max;
                },
                setSeek: function () {
                    let max = this.getAttribute('max'),
                        value = video.currentTime * max / video.duration;
                    this.c2value(value);
                }
            },

            events: {
                'input change': function () {
                    getHelpers('timeSeek').setTime.apply(this);
                },
                mousedown: function () {
                    info.seekProp.seeking = true;
                },
                mouseup: function () {
                    info.seekProp.seeking = false;
                }
            },

            video: {
                'timeupdate seeked': function () {
                    if (!info.seekProp.seeking) {
                        eachAll('timeSeek', getHelpers('timeSeek').setSeek);
                    }
                }
            }

        },
        volumeSeek: {

            type: 'volume-seek',

            ready: function () {eachAll('volumeSeek', function () {
                let custom = this.hasAttribute(getType('customSeek'));
                this['c2value'] = getHelpers(custom ? 'customSeek' : 'volumeSeek').value;

                setAttrIfNotExists(this, 'step', 5);
                setAttrIfNotExists(this, 'max', 100);
                this.c2value(0);
            })},

            helpers: {
                value: function (value) {
                    if (value === undefined) {
                        return $(this).val();
                    }
                    $(this).val(value);
                },

                setVolume: function () {
                    if (video.muted && !this.c2value()) {return; }

                    let max = this.getAttribute('max');
                    video.volume = this.c2value() / max;
                    video.muted = video.volume === 0;
                },

                setSeek: function () {
                    if (video.muted) {
                        this.c2value(0); return;
                    }

                    let max = this.getAttribute('max');
                    this.c2value(video.volume * max);
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
                timeupdate: function () {eachAll('time', getHelpers('time').updateTime); }
            }

        },
        duration: {

            video: {
                durationchange: function () {
                    eachAll('duration', function () {
                        let time = video.duration,
                        attr = $(this).attr('c2-duration');

                        if (attr) {
                            $(this).attr(attr, convertTime(time));
                            return;
                        }
                        $(this).text(convertTime(time));
                    });
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
                    let min = 0,
                        max = 3,
                        details = getDetailedNumber(c2(this, 'speed'), null, 1),
                        speed = details.number;

                    if (details.signal) {
                        speed += video.playbackRate;
                        speed = getMinMax(speed, min, max);
                    }

                    video.playbackRate = speed;
                }
            }

        },
        hideMouse: {

            type: 'hide-mouse',

            ready: function () {
                eachAll('hideMouse', function () {
                    let elem = this;
                    this['c2HideMouse'] = {
                        id: null,
                        timer: null,
                        isMoving: function (status) {
                            let hm = elem.c2HideMouse,
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
                });
            },

            events: {
                mousemove: function () {
                    let hideMouse = this.c2HideMouse;

                    if (!hideMouse) {return; }

                    if (!hideMouse.timer) {hideMouse.isMoving(true); }

                    if (hideMouse.id) {clearTimeout(hideMouse.id); }
                    hideMouse.id = setTimeout(hideMouse.timeout, hideMouse.timer);
                }
            }

        },
        custom: {}
    };

    initControls();
};

// Start on DOM Ready
$(function () {start('[c2js]'); });

};

$.c2js();