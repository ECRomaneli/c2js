import { CONTROLS, MEDIA_STATE, type ControlContext, type ControlDefinition, type PlayerApi } from './controls'
import { Query, each, isSet, type StatusOwner } from './query'
import { getStorage, hasLocalStorage, storageKeys, type StorageKeys } from './storage'
import type { AnyElement, Config, Dict, ResolvedConfig, StorageAccessor } from './types'
import { isSubstr } from './utils'

export const APP_NAME = 'c2js'

export type OnReady = (player: Player) => void

const DEFAULT_CONFIG: Omit<ResolvedConfig, 'id'> = {
    saveWith: 'localStorage',
    saveTime: false,
    speed: { min: 0, max: 3 }
}

/** Aliases so `c2-shortcuts` accepts both the short and the standard key name. */
const KEYMAP: Dict<string[]> = {
    space: [' ', 'spacebar'],
    ctrl: ['ctrl', 'control'],
    alt: ['alt', 'altgraph'],
    del: ['del', 'delete'],
    esc: ['esc', 'escape'],
    left: ['left', 'arrowleft'],
    up: ['up', 'arrowup'],
    right: ['right', 'arrowright'],
    down: ['down', 'arrowdown']
}

/**
 * Namespace for the persisted data: explicit `id`, else the container `id`.
 * Empty means the keys are only separated by source, which is what a single
 * player on a page wants.
 */
function resolveId(element: HTMLElement, config?: Config): string {
    return config?.id ?? element.id ?? ''
}

function resolveConfig(element: HTMLElement, config?: Config): ResolvedConfig {
    const fallback = {
        ...DEFAULT_CONFIG,
        saveWith: hasLocalStorage() ? ('localStorage' as const) : ('cookie' as const)
    }

    return {
        id: resolveId(element, config),
        saveWith: config?.saveWith ?? fallback.saveWith,
        saveTime: config?.saveTime ?? fallback.saveTime,
        speed: {
            min: config?.speed?.min ?? fallback.speed.min,
            max: config?.speed?.max ?? fallback.speed.max
        }
    }
}

/** Binds every `c2-*` control found inside a `[c2js]` container to its media element. */
export class Player implements PlayerApi, StatusOwner {
    public readonly config: ResolvedConfig
    public readonly element: HTMLElement
    public readonly $element: Query
    public readonly media: HTMLMediaElement
    public readonly $media: Query

    private status: string[] = []
    private readonly shortcuts: Dict<HTMLElement> = {}
    private readonly contexts: Dict<ControlContext> = {}
    private readonly storage: StorageAccessor | null
    private readonly keys: StorageKeys
    private lastSecond = -1
    private timeUpdateTimer: ReturnType<typeof setInterval> | null = null

    public constructor(el: Query | HTMLElement | string, config?: Config, onReady?: OnReady) {
        const $element = el instanceof Query ? el : new Query(el, document, void 0)
        const element = $element.first<HTMLElement>()

        if (!element) { throw new Error(`c2js: no element matches the given selector.`) }

        const media = new Query(element).findOne('video, audio').first<HTMLElement>() as HTMLMediaElement | undefined
        if (!media) { throw new Error('c2js: no <video> or <audio> found inside the player container.') }

        this.element = element
        this.$element = this.$(element)
        this.media = media
        this.$media = this.$(media)
        this.config = resolveConfig(element, config)
        this.storage = this.config.saveWith === 'none' ? null : getStorage(this.config.saveWith)
        this.keys = storageKeys(this.config.id)

        ;(element as unknown as Dict)['c2js'] = this

        this.bindSecondUpdates()
        this.initControls()
        this.loadSavedInfo()
        this.bindSaveEvents()

        onReady?.(this)
    }

    /** Status-aware query, so `data()` keeps `c2-status` in sync. */
    private $(selector: AnyElement | ArrayLike<AnyElement>): Query {
        return new Query(selector, document, this)
    }

    public hasStatus(status: string): boolean {
        return this.status.indexOf(status) !== -1
    }

    public addStatus(status: string): void {
        if (this.hasStatus(status)) { return }
        this.status.push(status)
        this.syncStatus()
    }

    public removeStatus(status: string): void {
        const index = this.status.indexOf(status)
        if (index === -1) { return }
        this.status.splice(index, 1)
        this.syncStatus()
    }

    /** Current status list, e.g. `['play', 'fullscreen']`. */
    public getStatus(): string[] {
        return this.status.slice()
    }

    /** Detaches the player from its container. */
    public destroy(): void {
        this.stopTimeUpdateLoop()
        delete (this.element as unknown as Dict)['c2js']
    }

    private syncStatus(): void {
        const value = this.status.join(' ')
        this.$element.attr('c2-status', value)
        this.contexts['status']?.$all.attr('c2-status', value)
    }

    /**
     * Emits `stimeupdate` once per second, so text controls are not updated
     * dozens of times per second by `timeupdate`.
     */
    private bindSecondUpdates(): void {
        this.$media.on('timeupdate seeked', () => { this.emitSecondUpdate() })
        this.$media.on('play playing', () => { this.startTimeUpdateLoop() })
        this.$media.on('pause ended error', () => { this.stopTimeUpdateLoop() })

        if (!this.media.paused) { this.startTimeUpdateLoop() }
    }

    private emitSecondUpdate(): void {
        const second = Math.floor(this.media.currentTime)
        if (second === this.lastSecond) { return }
        this.lastSecond = second
        this.$media.trigger('stimeupdate')
    }

    /**
     * Some TV engines, such as webOS, stop delivering `timeupdate` while the
     * media plays. Polling keeps `stimeupdate` flowing without it.
     */
    private startTimeUpdateLoop(): void {
        if (this.timeUpdateTimer !== null || this.media.paused) { return }
        this.timeUpdateTimer = setInterval(() => { this.emitSecondUpdate() }, 250)
    }

    private stopTimeUpdateLoop(): void {
        if (this.timeUpdateTimer === null) { return }
        clearInterval(this.timeUpdateTimer)
        this.timeUpdateTimer = null
    }

    private initControls(): void {
        this.$element.attrIfNotExists('tabindex', -1)

        CONTROLS.forEach((control) => {
            const $all = this.$element.find(`[c2-${control.name}]`)
            if ($all.empty()) { return }

            const ctx = this.createContext($all)
            this.contexts[control.name] = ctx

            control.ready?.(ctx)
            this.bindMediaHandlers(control, ctx)
            this.bindEventHandlers(control, ctx)
            this.collectShortcuts($all)
        })

        this.redirectControlFocus()
        this.bindShortcuts()
    }

    private createContext($all: Query): ControlContext {
        const player = this
        return {
            player,
            c2js: this.element,
            $c2js: this.$element,
            media: this.media,
            $media: this.$media,
            $all,
            state: {},
            $: (selector) => player.$(selector)
        }
    }

    private bindEventHandlers(control: ControlDefinition, ctx: ControlContext): void {
        if (!control.events) { return }

        // `c2-null` marks decorative elements that only reflect status.
        const $callers = ctx.$all.filter((_, el) => !(el as HTMLElement).hasAttribute('c2-null'))

        each(control.events, (events: string, handler) => {
            $callers.on(events, function (this: HTMLElement, event: Event) {
                handler(ctx, this, event)
            })
        })
    }

    private bindMediaHandlers(control: ControlDefinition, ctx: ControlContext): void {
        if (!control.media) { return }

        const alreadyLoaded = this.media.readyState >= MEDIA_STATE.HAVE_CURRENT_DATA

        each(control.media, (events: string, handler) => {
            const listener = (event: Event) => { handler(ctx, event) }

            // The media may already be loaded when c2js starts, so replay the event.
            if (alreadyLoaded && isSubstr(events, 'loadeddata')) { handler(ctx) }

            this.$media.on(events, listener)
        })
    }

    private collectShortcuts($ctrls: Query): void {
        $ctrls.each((_, node) => {
            const el = node as HTMLElement
            const keys = this.$(el).data('shortcuts')
            if (!keys) { return }

            keys.toLowerCase().split(/\s+/).filter(Boolean).forEach((key) => {
                if (key === 'dblclick') {
                    this.$element.on('dblclick', (event) => {
                        if (!(event.target as unknown as Dict)['hasOnClick']) { this.$(el).trigger('click') }
                    }, true)
                    return
                }

                (KEYMAP[key] ?? [key]).forEach((alias) => { this.shortcuts[alias] = el })
            })
        })
    }

    private bindShortcuts(): void {
        this.$element.on('keydown', (event) => {
            const key = (event as KeyboardEvent).key?.toLowerCase()
            const el = key && this.shortcuts[key]
            if (!el) { return }

            this.$(el).trigger('click')
            event.preventDefault()
        })
    }

    /** Keeps focus on the container so shortcuts such as `space` keep working. */
    private redirectControlFocus(): void {
        this.$element.on('focus', (event) => {
            if (event.target === this.element) { return }
            this.element.focus()
            event.stopPropagation()
        }, true)
    }

    private loadSavedInfo(): void {
        const storage = this.storage
        if (!storage) { return }

        const volume = storage(this.keys.volume)
        const muted = storage(this.keys.muted)

        if (isSet(volume) && volume !== '') {
            const parsed = parseFloat(volume)
            if (!Number.isNaN(parsed)) { this.media.volume = parsed }
        }
        this.media.muted = muted === 'true'

        if (!this.config.saveTime) { return }

        const savedSrc = storage(this.keys.source)
        const currentSrc = this.$media.attr('src')

        // With no source anywhere there is nothing to key the position on.
        const src = currentSrc || (isSet(savedSrc) ? savedSrc : '')
        if (!src) { return }

        const time = storage(this.keys.time(src))
        const updateTime = () => {
            if (!isSet(time) || time === '') { return }
            const parsed = parseFloat(time)
            if (Number.isNaN(parsed)) { return }

            this.media.pause()
            this.media.currentTime = parsed
        }

        if (currentSrc && this.media.readyState >= MEDIA_STATE.HAVE_METADATA) {
            updateTime()
            return
        }

        this.$media.one('loadedmetadata', updateTime)
        if (!currentSrc) { this.$media.attr('src', src) }
    }

    private bindSaveEvents(): void {
        const storage = this.storage
        if (!storage) { return }

        this.$media.on('volumechange', () => {
            storage(this.keys.volume, this.media.volume)
            storage(this.keys.muted, !this.media.volume || this.media.muted)
        })

        if (!this.config.saveTime) { return }

        const save = (time: number) => {
            const src = this.$media.attr('src')
            if (!src) { return }
            storage(this.keys.source, src)
            storage(this.keys.time(src), time)
        }

        this.$media.on('stimeupdate', () => { save(this.media.currentTime) })
        this.$media.on('ended', () => { save(0) })
    }
}
