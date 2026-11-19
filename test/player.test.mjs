import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

import { buildPlayer, click, keydown, setupDom } from './helpers/dom.mjs'

let dom
let Player
let storageKeys

beforeEach(async () => {
    dom = setupDom()
    // Imported after the globals exist, since the bundle touches `document`.
    ;({ Player, storageKeys } = await import('../dist/module/index.mjs'))
})

afterEach(() => {
    dom.restore()
})

test('throws when the container has no media element', () => {
    const container = dom.document.createElement('div')
    container.setAttribute('c2js', '')
    dom.document.body.appendChild(container)

    assert.throws(() => new Player(container), /no <video> or <audio>/)
})

test('throws when the selector matches nothing', () => {
    assert.throws(() => new Player('[missing]'), /no element matches/)
})

test('marks the container as initialized and adds tabindex', () => {
    const { container } = buildPlayer(dom.document, { play: '' })
    const player = new Player(container, { saveWith: 'none' })

    assert.equal(container.c2js, player)
    assert.equal(container.getAttribute('tabindex'), '-1')
})

test('play control toggles playback and reflects the status', () => {
    const { container, media, elements } = buildPlayer(dom.document, { play: '' })
    const player = new Player(container, { saveWith: 'none' })

    click(elements.play)
    assert.equal(media.paused, false)
    assert.equal(elements.play.getAttribute('c2-play'), 'true')
    assert.deepEqual(player.getStatus(), ['play'])
    assert.equal(container.getAttribute('c2-status'), 'play')

    click(elements.play)
    assert.equal(media.paused, true)
    assert.equal(elements.play.getAttribute('c2-play'), 'false')
    assert.deepEqual(player.getStatus(), [])
})

test('stop control pauses and rewinds', () => {
    const { container, media, elements } = buildPlayer(dom.document, { stop: '' })
    new Player(container, { saveWith: 'none' })

    media.currentTime = 30
    media.play()
    click(elements.stop)

    assert.equal(media.paused, true)
    assert.equal(media.currentTime, 0)
})

test('move control supports absolute, relative and percentage values', () => {
    const { container, media } = buildPlayer(dom.document, {})
    const absolute = dom.document.createElement('button')
    absolute.setAttribute('c2-move', '42')
    const relative = dom.document.createElement('button')
    relative.setAttribute('c2-move', '+5')
    const percent = dom.document.createElement('button')
    percent.setAttribute('c2-move', '-10%')
    container.appendChild(absolute)
    container.appendChild(relative)
    container.appendChild(percent)

    new Player(container, { saveWith: 'none' })

    click(absolute)
    assert.equal(media.currentTime, 42)

    click(relative)
    assert.equal(media.currentTime, 47)

    // duration is 100, so -10% is -10s.
    click(percent)
    assert.equal(media.currentTime, 37)
})

test('move control clamps relative seeks to the media bounds', () => {
    const { container, media, elements } = buildPlayer(dom.document, { move: '-50' })
    new Player(container, { saveWith: 'none' })

    media.currentTime = 10
    click(elements.move)
    assert.equal(media.currentTime, 0)
})

test('volume control adds relative percentages', () => {
    const { container, media, elements } = buildPlayer(dom.document, { volume: '-10%' })
    new Player(container, { saveWith: 'none' })

    assert.equal(media.volume, 1)
    click(elements.volume)
    assert.equal(Math.round(media.volume * 100) / 100, 0.9)
})

test('mute control toggles and reports the muted status', () => {
    const { container, media, elements } = buildPlayer(dom.document, { mute: '' })
    new Player(container, { saveWith: 'none' })

    click(elements.mute)
    assert.equal(media.muted, true)

    media.emit('volumechange')
    assert.equal(elements.mute.getAttribute('c2-mute'), 'true')

    click(elements.mute)
    media.emit('volumechange')
    assert.equal(elements.mute.getAttribute('c2-mute'), 'false')
})

test('loop control toggles media.loop', () => {
    const { container, media, elements } = buildPlayer(dom.document, { loop: '' })
    new Player(container, { saveWith: 'none' })

    click(elements.loop)
    assert.equal(media.loop, true)
    assert.equal(elements.loop.getAttribute('c2-loop'), 'true')
})

test('speed control honours the configured range', () => {
    const { container, media, elements } = buildPlayer(dom.document, { speed: '+1' })
    new Player(container, { saveWith: 'none', speed: { min: 0.5, max: 2 } })

    click(elements.speed)
    assert.equal(media.playbackRate, 2)

    click(elements.speed)
    assert.equal(media.playbackRate, 2)
})

test('time control renders current and remaining time', () => {
    const { container, media, elements } = buildPlayer(dom.document, { time: 'current' })
    new Player(container, { saveWith: 'none' })

    media.currentTime = 65
    assert.equal(elements.time.textContent, '01:05')

    click(elements.time)
    assert.equal(elements.time.getAttribute('c2-time'), 'remaining')
    assert.equal(elements.time.textContent, '-00:35')
})

test('duration control writes text or the requested attribute', () => {
    const { container, media, elements } = buildPlayer(dom.document, { duration: '' })
    const asTitle = dom.document.createElement('span')
    asTitle.setAttribute('c2-duration', 'title')
    container.appendChild(asTitle)

    new Player(container, { saveWith: 'none' })
    media.emit('durationchange')

    assert.equal(elements.duration.textContent, '01:40')
    assert.equal(asTitle.getAttribute('title'), '01:40')
})

test('loading control follows the buffering events', () => {
    const { container, media, elements } = buildPlayer(dom.document, { loading: '' })
    new Player(container, { saveWith: 'none' })

    media.emit('waiting')
    assert.equal(elements.loading.getAttribute('c2-loading'), 'true')

    media.emit('canplay')
    assert.equal(elements.loading.getAttribute('c2-loading'), 'false')
})

test('time-seek gets defaults and syncs both ways', () => {
    const { container, media } = buildPlayer(dom.document, {})
    const seek = dom.document.createElement('input')
    seek.setAttribute('c2-time-seek', '')
    container.appendChild(seek)

    new Player(container, { saveWith: 'none' })

    assert.equal(seek.getAttribute('max'), '100')
    assert.equal(seek.getAttribute('step'), '0.1')

    media.currentTime = 25
    assert.equal(Number(seek.value), 25)

    seek.value = '50'
    seek.dispatchEvent(new globalThis.CustomEvent('change', { bubbles: true }))
    assert.equal(media.currentTime, 50)
})

test('shortcuts trigger the matching control', () => {
    const { container, media, elements } = buildPlayer(dom.document, { play: '' })
    elements.play.setAttribute('c2-shortcuts', 'space k')

    new Player(container, { saveWith: 'none' })

    const event = keydown(container, ' ')
    assert.equal(media.paused, false)
    assert.equal(event.defaultPrevented, true)

    keydown(container, 'k')
    assert.equal(media.paused, true)
})

test('unmapped keys are ignored', () => {
    const { container, media, elements } = buildPlayer(dom.document, { play: '' })
    elements.play.setAttribute('c2-shortcuts', 'space')

    new Player(container, { saveWith: 'none' })

    const event = keydown(container, 'q')
    assert.equal(media.paused, true)
    assert.equal(event.defaultPrevented, false)
})

test('c2-null elements reflect status without reacting to clicks', () => {
    const { container, media, elements } = buildPlayer(dom.document, { play: '' })
    elements.play.setAttribute('c2-null', '')

    new Player(container, { saveWith: 'none' })

    click(elements.play)
    assert.equal(media.paused, true)

    media.play()
    assert.equal(elements.play.getAttribute('c2-play'), 'true')
})

test('focus is redirected to the container', () => {
    const { container, elements } = buildPlayer(dom.document, { play: '' })
    new Player(container, { saveWith: 'none' })

    elements.play.dispatchEvent(new globalThis.CustomEvent('focus', { bubbles: true }))
    assert.equal(container.focused, true)
})

test('stimeupdate fires only once per second', () => {
    const { container, media } = buildPlayer(dom.document, { play: '' })
    new Player(container, { saveWith: 'none' })

    let count = 0
    media.addEventListener('stimeupdate', () => { count++ })

    media.currentTime = 1.1
    media.currentTime = 1.5
    media.currentTime = 1.9
    assert.equal(count, 1)

    media.currentTime = 2.1
    assert.equal(count, 2)
})

test('volume and mute are persisted and restored', () => {
    const keys = storageKeys()
    const first = buildPlayer(dom.document, { mute: '' })
    new Player(first.container, { saveWith: 'localStorage' })

    first.media.volume = 0.4
    assert.equal(dom.localStorage.getItem(keys.volume), '0.4')

    const second = buildPlayer(dom.document, { mute: '' })
    new Player(second.container, { saveWith: 'localStorage' })
    assert.equal(second.media.volume, 0.4)
})

test('playback position is only persisted when saveTime is on', () => {
    const keys = storageKeys()
    const timeKey = keys.time('sample.mp4')

    const off = buildPlayer(dom.document, { play: '' })
    new Player(off.container, { saveWith: 'localStorage' })
    off.media.currentTime = 10
    assert.equal(dom.localStorage.getItem(timeKey), null)

    const on = buildPlayer(dom.document, { play: '' })
    new Player(on.container, { saveWith: 'localStorage', saveTime: true })
    on.media.currentTime = 12
    assert.equal(Number(dom.localStorage.getItem(timeKey)), 12)
    assert.equal(dom.localStorage.getItem(keys.source), 'sample.mp4')
})

test('the saved position is keyed by source', () => {
    const keys = storageKeys()

    const first = buildPlayer(dom.document, { play: '' })
    new Player(first.container, { saveWith: 'localStorage', saveTime: true })
    first.media.currentTime = 12

    // A different source must not inherit the previous position.
    const second = buildPlayer(dom.document, { play: '' })
    second.media.setAttribute('src', 'other.mp4')
    new Player(second.container, { saveWith: 'localStorage', saveTime: true })
    assert.equal(second.media.currentTime, 0)

    second.media.currentTime = 30
    assert.equal(Number(dom.localStorage.getItem(keys.time('sample.mp4'))), 12)
    assert.equal(Number(dom.localStorage.getItem(keys.time('other.mp4'))), 30)
})

test('the id namespaces the saved position but not the volume', () => {
    const left = buildPlayer(dom.document, { play: '' })
    new Player(left.container, { id: 'left', saveWith: 'localStorage', saveTime: true })
    left.media.currentTime = 12

    // Same source, different id: positions stay independent.
    const right = buildPlayer(dom.document, { play: '' })
    new Player(right.container, { id: 'right', saveWith: 'localStorage', saveTime: true })
    assert.equal(right.media.currentTime, 0)

    right.media.currentTime = 40
    assert.equal(Number(dom.localStorage.getItem(storageKeys('left').time('sample.mp4'))), 12)
    assert.equal(Number(dom.localStorage.getItem(storageKeys('right').time('sample.mp4'))), 40)

    // Volume is a user preference, so it is shared.
    assert.equal(storageKeys('left').volume, storageKeys('right').volume)
})

test('the id falls back to the container id', () => {
    const byId = buildPlayer(dom.document, { play: '' })
    byId.container.id = 'from-id'
    const player = new Player(byId.container, { saveWith: 'none' })
    assert.equal(player.config.id, 'from-id')

    const anonymous = buildPlayer(dom.document, { play: '' })
    assert.equal(new Player(anonymous.container, { saveWith: 'none' }).config.id, '')
})

test('saveWith none keeps the storage untouched', () => {
    const keys = storageKeys()
    const { container, media } = buildPlayer(dom.document, { play: '' })
    new Player(container, { saveWith: 'none', saveTime: true })

    media.volume = 0.2
    media.currentTime = 5

    assert.equal(dom.localStorage.getItem(keys.volume), null)
    assert.equal(dom.localStorage.getItem(keys.time('sample.mp4')), null)
})

test('destroy releases the container', () => {
    const { container } = buildPlayer(dom.document, { play: '' })
    const player = new Player(container, { saveWith: 'none' })

    player.destroy()
    assert.equal(container.c2js, undefined)
})
