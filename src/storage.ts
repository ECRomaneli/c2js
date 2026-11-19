import type { StorageAccessor } from './types'
import { isSubstr } from './utils'

const PREFIX = '_C2'

export interface StorageKeys {
    readonly volume: string
    readonly muted: string
    readonly source: string
    /** Position key for one source, so sources never share a saved time. */
    time(src: string): string
}

/**
 * djb2, as hex. Only used to turn a source URL into a short token: cookie
 * names may not contain `/`, `:` or `;`, which URLs are full of.
 */
function hash(value: string): string {
    let result = 5381
    for (let i = 0; i < value.length; i++) {
        result = ((result << 5) + result + value.charCodeAt(i)) | 0
    }
    return (result >>> 0).toString(16)
}

/**
 * Builds the persistence keys for one player.
 *
 * Volume and mute stay page wide: they are a user preference, not a property of
 * a given player. The playback position is keyed by source, and by `id` when
 * one is given, so several players never overwrite each other's position.
 */
export function storageKeys(id?: string): StorageKeys {
    const base = id ? `${PREFIX}.${id}` : PREFIX

    return {
        volume: `${PREFIX}.VOLUME`,
        muted: `${PREFIX}.MUTED`,
        source: `${base}.SOURCE`,
        time: (src: string) => `${base}.CURRENT_TIME.${hash(src)}`
    }
}

export function hasLocalStorage(): boolean {
    try {
        const probe = '_c2.probe'
        localStorage.setItem(probe, probe)
        localStorage.removeItem(probe)
        return true
    } catch {
        return false
    }
}

export const storage: StorageAccessor = ((key: string, value?: string | number | boolean) => {
    try {
        if (value === void 0) { return localStorage.getItem(key) }
        localStorage.setItem(key, value + '')
        return
    } catch {
        console.error('c2js: localStorage is not available.')
        return null
    }
}) as StorageAccessor

export const cookie: StorageAccessor = ((key: string, value?: string | number | boolean) => {
    if (value !== void 0) {
        document.cookie = `${key}=${encodeURIComponent(value + '')}; path=/;`
        return
    }

    const name = `${key}=`
    let data: string | null = null

    document.cookie.split(';').some((entry) => {
        entry = entry.trim()
        if (!isSubstr(entry, name)) { return false }
        data = decodeURIComponent(entry.substring(name.length))
        return true
    })

    return data
}) as StorageAccessor

export function getStorage(saveWith: 'cookie' | 'localStorage'): StorageAccessor {
    return saveWith === 'cookie' ? cookie : storage
}
