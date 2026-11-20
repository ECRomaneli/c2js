import { Fullscreen } from './fullscreen'
import type { Query } from './query'
import type { Dict, ResolvedConfig } from './types'
import { breakNumber, convertTime, minMaxVal, toggleVal } from './utils'

/** Subset of the player exposed to control handlers. */
export interface PlayerApi {
    readonly config: ResolvedConfig
    readonly element: HTMLElement
    readonly $element: Query
    readonly media: HTMLMediaElement
    readonly $media: Query
    hasStatus(status: string): boolean
}

export interface ControlContext {
    readonly player: PlayerApi
    readonly c2js: HTMLElement
    readonly $c2js: Query
    readonly media: HTMLMediaElement
    readonly $media: Query
    /** Every element declaring this control. */
    readonly $all: Query
    /** Scratch space shared by the handlers of a single control instance. */
    readonly state: Dict<any>
    /** Wraps any node in a status-aware query. */
    $(selector: HTMLElement | ArrayLike<HTMLElement>): Query
}

export type EventHandler = (ctx: ControlContext, el: HTMLElement, event: Event) => void
export type MediaHandler = (ctx: ControlContext, event?: Event) => void

export type ControlDefinition = {
    /** Attribute suffix, used as `c2-<name>`. */
    name: string
    /** Runs once, right after the control elements are found. */
    ready?: (ctx: ControlContext) => void
    /** Listeners bound to each control element. */
    events?: Dict<EventHandler>
    /** Listeners bound to the media element. */
    media?: Dict<MediaHandler>
}

export const enum MEDIA_STATE {
    HAVE_NOTHING = 0,
    HAVE_METADATA = 1,
    HAVE_CURRENT_DATA = 2,
    HAVE_FUTURE_DATA = 3,
    HAVE_ENOUGH_DATA = 4
}

const DEFAULT_HIDE_MOUSE_DELAY = 3000

function seekRatio(el: HTMLElement, ctx: ControlContext): number {
    return parseFloat(ctx.$(el).attr('max') ?? '100') || 100
}

/**
 * End of the buffered range that holds the current position, as a percentage
 * of the duration. Seeks into a gap fall back to the furthest buffered end.
 */
function bufferedPercent(media: HTMLMediaElement): number {
    const ranges = media.buffered
    const duration = media.duration

    if (!ranges || !ranges.length || !Number.isFinite(duration) || duration <= 0) { return 0 }

    const time = media.currentTime
    let end = 0

    for (let i = 0; i < ranges.length; i++) {
        if (ranges.start(i) <= time && time <= ranges.end(i)) {
            end = ranges.end(i)
            break
        }
    }

    if (!end) { end = ranges.end(ranges.length - 1) }

    return minMaxVal(end / duration * 100, 0, 100)
}

export const CONTROLS: ControlDefinition[] = [
    {
        name: 'loading',
        media: {
            'loadstart seeking waiting': (ctx) => { ctx.$all.data('loading', true) },
            'canplay error': (ctx) => { ctx.$all.data('loading', false) }
        }
    },

    {
        name: 'buffer',
        media: {
            'loadeddata durationchange progress seeked emptied': (ctx) => {
                ctx.$all.each((_, el) => {
                    const percent = bufferedPercent(ctx.media)
                    const $el = ctx.$(el as HTMLElement)

                    $el.data('buffer', Math.round(percent * 10) / 10)
                    $el.css('--c2-buffer', percent.toFixed(1) + '%')
                })
            }
        }
    },

    {
        name: 'play',
        events: {
            click: (ctx) => {
                if (!ctx.media.currentSrc && !ctx.$media.attr('src')) {
                    ctx.$media.trigger('error')
                    console.error('c2js: trying to play/pause media without source.')
                    return
                }
                ctx.media.paused ? void ctx.media.play() : ctx.media.pause()
            }
        },
        media: {
            play: (ctx) => { ctx.$all.data('play', true) },
            pause: (ctx) => { ctx.$all.data('play', false) },
            error: (ctx) => { ctx.$all.data('play', 'null') }
        }
    },

    {
        name: 'stop',
        events: {
            click: (ctx) => {
                if (!ctx.media.paused) { ctx.media.pause() }
                ctx.$all.data('stop', true)
                ctx.media.currentTime = 0
            }
        },
        media: {
            play: (ctx) => { ctx.$all.data('stop', false) },
            'loadeddata ended error': (ctx) => {
                if (!ctx.player.hasStatus('stop')) { ctx.$all.data('stop', true) }
            }
        }
    },

    {
        name: 'move',
        events: {
            click: (ctx, el) => {
                const max = ctx.media.duration
                const broken = breakNumber(ctx.$(el).data('move'), 's', max)
                let time = broken.number

                if (broken.signal) {
                    time = minMaxVal(ctx.media.currentTime + time, 0, max || 0)
                }

                if (Number.isFinite(time)) { ctx.media.currentTime = time }
            }
        }
    },

    {
        name: 'volume',
        events: {
            click: (ctx, el) => {
                const broken = breakNumber(ctx.$(el).data('volume'), null, 1)
                let volume = broken.number

                if (broken.signal) { volume += ctx.media.volume }
                ctx.media.volume = minMaxVal(volume, 0, 1)
            }
        }
    },

    {
        name: 'mute',
        events: {
            click: (ctx) => { ctx.media.muted = !ctx.media.muted }
        },
        media: {
            'loadeddata volumechange': (ctx) => {
                ctx.$all.data('mute', !ctx.media.volume || ctx.media.muted)
            }
        }
    },

    {
        name: 'fullscreen',
        ready: (ctx) => {
            const fs = Fullscreen.get()

            if (!fs.allowed) {
                ctx.$all.data('fullscreen', 'null')
                return
            }

            fs.onChange(() => { ctx.$all.data('fullscreen', ctx.c2js === fs.current()) })
            fs.onError(() => {
                if (ctx.c2js === fs.current()) { console.error('c2js: fullscreen error.') }
            })
        },
        events: {
            click: (ctx) => {
                const fs = Fullscreen.get()
                if (!fs.allowed) { return }
                fs.current() ? fs.leave() : fs.enter(ctx.c2js)
            }
        }
    },

    {
        name: 'time-seek',
        ready: (ctx) => {
            ctx.$all.each((_, el) => {
                ctx.$(el as HTMLElement)
                    .attrIfNotExists('step', 0.1)
                    .attrIfNotExists('max', 100)
                    .val(0)
                    .css('--c2-played', '0%')
            })
        },
        events: {
            'input change': (ctx, el) => {
                const max = seekRatio(el, ctx)
                const value = parseFloat(ctx.$(el).val() ?? '0') || 0

                ctx.$(el).css('--c2-played', (value / max * 100).toFixed(1) + '%')

                if (Number.isFinite(ctx.media.duration)) {
                    ctx.media.currentTime = ctx.media.duration * value / max
                }
            },
            'mousedown touchstart': (ctx) => { ctx.state.seeking = true },
            'mouseup touchend': (ctx) => { ctx.state.seeking = false }
        },
        media: {
            'loadeddata timeupdate seeked': (ctx) => {
                if (ctx.state.seeking) { return }
                ctx.$all.each((_, el) => {
                    const target = el as HTMLElement
                    const max = seekRatio(target, ctx)
                    const value = ctx.media.currentTime * max / ctx.media.duration
                    const played = Number.isFinite(value) ? value : 0

                    ctx.$(target)
                        .val(played)
                        .css('--c2-played', (played / max * 100).toFixed(1) + '%')
                })
            }
        }
    },

    {
        name: 'volume-seek',
        ready: (ctx) => {
            ctx.$all.each((_, el) => {
                ctx.$(el as HTMLElement)
                    .attrIfNotExists('step', 5)
                    .attrIfNotExists('max', 100)
                    .val(0)
            })
        },
        events: {
            'input change': (ctx, el) => {
                const value = parseFloat(ctx.$(el).val() ?? '0') || 0
                if (ctx.media.muted && !value) { return }

                ctx.media.volume = minMaxVal(value / seekRatio(el, ctx), 0, 1)
                ctx.media.muted = !ctx.media.volume
            }
        },
        media: {
            'loadeddata volumechange': (ctx) => {
                ctx.$all.each((_, el) => {
                    const target = el as HTMLElement
                    ctx.$(target).val(ctx.media.muted ? 0 : ctx.media.volume * seekRatio(target, ctx))
                })
            }
        }
    },

    {
        name: 'time',
        events: {
            click: (ctx, el) => {
                const $el = ctx.$(el)
                $el.data('time', toggleVal($el.data('time'), ['current', 'remaining']))
                updateTime($el, ctx)
            }
        },
        media: {
            'loadeddata stimeupdate': (ctx) => {
                ctx.$all.each((_, el) => { updateTime(ctx.$(el as HTMLElement), ctx) })
            }
        }
    },

    {
        name: 'duration',
        media: {
            'loadeddata durationchange': (ctx) => {
                ctx.$all.each((_, el) => {
                    const $el = ctx.$(el as HTMLElement)
                    const target = $el.data('duration')
                    const time = convertTime(ctx.media.duration)

                    target ? $el.attr(target, time) : $el.text(time)
                })
            }
        }
    },

    {
        name: 'loop',
        events: {
            click: (ctx, el) => {
                ctx.media.loop = !ctx.media.loop
                ctx.$(el).data('loop', ctx.media.loop)
            }
        }
    },

    {
        name: 'speed',
        events: {
            click: (ctx, el) => {
                const { min, max } = ctx.player.config.speed
                const broken = breakNumber(ctx.$(el).data('speed'), null, 1)
                let speed = broken.number

                if (broken.signal) { speed += ctx.media.playbackRate }
                ctx.media.playbackRate = minMaxVal(speed, min, max)
            }
        }
    },

    {
        name: 'hide-mouse',
        ready: (ctx) => {
            ctx.state.timers = new WeakMap<HTMLElement, { id: any, delay: number | null, cursor: string }>()
            ctx.$all.each((_, el) => {
                ctx.state.timers.set(el, { id: null, delay: null, cursor: ctx.$(el as HTMLElement).css('cursor') ?? 'auto' })
            })
        },
        events: {
            mousemove: (ctx, el) => {
                const entry = ctx.state.timers?.get(el)
                if (!entry) { return }

                if (!entry.delay) {
                    const raw = ctx.$(el).data('hide-mouse')
                    entry.delay = raw ? breakNumber(raw, 'ms').number : DEFAULT_HIDE_MOUSE_DELAY
                    ctx.$(el).css('cursor', entry.cursor)
                }

                if (entry.id) { clearTimeout(entry.id) }
                entry.id = setTimeout(() => {
                    entry.delay = null
                    ctx.$(el).css('cursor', 'none')
                }, entry.delay as number)
            }
        }
    },

    { name: 'status' },

    { name: 'custom' }
]

function updateTime($el: Query, ctx: ControlContext): void {
    const remaining = $el.data('time') === 'remaining'
    const time = remaining ? ctx.media.duration - ctx.media.currentTime : ctx.media.currentTime
    $el.text((remaining ? '-' : '') + convertTime(time))
}
