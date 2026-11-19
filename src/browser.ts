import { Fullscreen } from './fullscreen'
import { Player, APP_NAME } from './player'
import { Query } from './query'
import { cookie, storage } from './storage'
import { breakNumber, convertTime, minMaxVal, toggleVal } from './utils'
import { c2js, ready, startAll } from './index'

/**
 * Browser entry point. Exposes `c2js` as a callable global, keeping the helpers
 * (`c2js.startAll`, `c2js.Player`, ...) attached to it.
 */
const global = Object.assign(c2js, {
    APP_NAME,
    Player,
    Query,
    Fullscreen,
    ready,
    startAll,
    storage,
    cookie,
    breakNumber,
    convertTime,
    minMaxVal,
    toggleVal
})

;(window as unknown as Record<string, unknown>)['c2js'] = global

export default global
