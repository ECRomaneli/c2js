import { Player, APP_NAME, type OnReady } from './player'
import { Query } from './query'
import type { Config, Selector } from './types'

export { Player, APP_NAME } from './player'
export { Query } from './query'
export { Fullscreen } from './fullscreen'
export { cookie, storage, storageKeys } from './storage'
export { breakNumber, convertTime, minMaxVal, toggleVal } from './utils'
export type { OnReady } from './player'
export type { StorageKeys } from './storage'
export type { ControlContext, ControlDefinition, PlayerApi } from './controls'
export type { Config, ResolvedConfig, SaveWith, Selector, SpeedRange } from './types'

/** Runs `fn` as soon as the DOM is ready. */
export function ready(fn: () => void): void {
    if (document.readyState !== 'loading') {
        fn()
        return
    }
    document.addEventListener('DOMContentLoaded', () => { fn() }, { once: true })
}

/**
 * Initializes every element matched by `selector` once the DOM is ready.
 * Returns nothing because initialization may be deferred; use `onReady` to get
 * each `Player` instance.
 */
export function c2js(selector: Selector, config?: Config, onReady?: OnReady): void {
    ready(() => {
        new Query(selector).each((_, el) => {
            const player = new Player(el as HTMLElement, config)
            onReady?.(player)
        })
    })
}

/** Initializes every `[c2js]` element that has not been initialized yet. */
export function startAll(config?: Config, onReady?: OnReady): void {
    ready(() => {
        new Query(`[${APP_NAME}]`).each((_, el) => {
            if ((el as unknown as Record<string, unknown>)['c2js']) { return }
            const player = new Player(el as HTMLElement, config)
            onReady?.(player)
        })
    })
}

export default c2js
