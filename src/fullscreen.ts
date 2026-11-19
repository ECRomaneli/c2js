type FullscreenApi = {
    request: string
    exit: string
    element: string
    change: string
    error: string
}

const VENDOR_APIS: Array<[string, FullscreenApi]> = [
    ['fullscreenEnabled', {
        request: 'requestFullscreen', exit: 'exitFullscreen', element: 'fullscreenElement',
        change: 'fullscreenchange', error: 'fullscreenerror'
    }],
    ['webkitFullscreenEnabled', {
        request: 'webkitRequestFullscreen', exit: 'webkitExitFullscreen', element: 'webkitFullscreenElement',
        change: 'webkitfullscreenchange', error: 'webkitfullscreenerror'
    }],
    ['webkitCancelFullScreen', {
        request: 'webkitRequestFullScreen', exit: 'webkitCancelFullScreen', element: 'webkitCurrentFullScreenElement',
        change: 'webkitfullscreenchange', error: 'webkitfullscreenerror'
    }],
    ['mozFullScreenEnabled', {
        request: 'mozRequestFullScreen', exit: 'mozCancelFullScreen', element: 'mozFullScreenElement',
        change: 'mozfullscreenchange', error: 'mozfullscreenerror'
    }],
    ['msFullscreenEnabled', {
        request: 'msRequestFullscreen', exit: 'msExitFullscreen', element: 'msFullscreenElement',
        change: 'MSFullscreenChange', error: 'MSFullscreenError'
    }]
]

/** Normalizes the vendor prefixed Fullscreen API into a single interface. */
export class Fullscreen {
    private static cached: Fullscreen | null = null

    private constructor(private readonly api: FullscreenApi | null) {}

    public static get(): Fullscreen {
        if (!Fullscreen.cached) {
            const doc = document as unknown as Record<string, unknown>
            const match = VENDOR_APIS.find(([flag]) => !!doc[flag])
            Fullscreen.cached = new Fullscreen(match ? match[1] : null)
        }
        return Fullscreen.cached
    }

    /** Clears the detected API. Exposed for tests. */
    public static reset(): void {
        Fullscreen.cached = null
    }

    public get allowed(): boolean {
        return this.api !== null
    }

    public enter(el: HTMLElement): void {
        if (!this.api) { return }
        const request = (el as unknown as Record<string, () => void>)[this.api.request]
        request?.call(el)
    }

    public leave(): void {
        if (!this.api) { return }
        const exit = (document as unknown as Record<string, () => void>)[this.api.exit]
        exit?.call(document)
    }

    public current(): Element | null {
        if (!this.api) { return null }
        return ((document as unknown as Record<string, Element | null>)[this.api.element]) ?? null
    }

    public onChange(handler: EventListener): void {
        if (this.api) { document.addEventListener(this.api.change, handler) }
    }

    public onError(handler: EventListener): void {
        if (this.api) { document.addEventListener(this.api.error, handler) }
    }
}
