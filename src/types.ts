import type { Query } from './query'

/** How the player persists volume, mute and playback position. */
export type SaveWith = 'none' | 'cookie' | 'localStorage'

export type SpeedRange = {
    min: number
    max: number
}

export type Config = {
    /**
     * Namespace for the persisted data. Defaults to the container `id`. Give
     * two players different ids when they play the same source and should keep
     * separate positions.
     */
    id?: string
    saveWith?: SaveWith
    saveTime?: boolean
    speed?: Partial<SpeedRange>
}

/** Config after the defaults have been applied. */
export type ResolvedConfig = {
    id: string
    saveWith: SaveWith
    saveTime: boolean
    speed: SpeedRange
}

export type AnyElement = HTMLElement | Document | Window

export type Selector = string | AnyElement | ArrayLike<AnyElement> | Query

export type Dict<T = unknown> = { [key: string]: T }

/** Signature of a persistence backend (`storage` or `cookie`). */
export interface StorageAccessor {
    (key: string): string | null
    (key: string, value: string | number | boolean): void
}
