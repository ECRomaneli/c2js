import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, test } from 'node:test'

import { buildPlayer, click, setupDom } from './helpers/dom.mjs'

let dom

beforeEach(() => {
    dom = setupDom()
})

afterEach(() => {
    dom.restore()
})

/** Evaluates the IIFE bundle against the DOM stub, like a <script> tag would. */
function loadWebBundle(file) {
    const code = readFileSync(new URL(`../dist/web/${file}`, import.meta.url), 'utf8')
    new Function('window', 'document', 'localStorage', 'CustomEvent', code)(
        globalThis.window, globalThis.document, globalThis.localStorage, globalThis.CustomEvent
    )
    return globalThis.window.c2js
}

for (const file of ['c2.js', 'c2.min.js']) {
    test(`${file} exposes a callable c2js global with its helpers`, () => {
        const c2js = loadWebBundle(file)

        assert.equal(typeof c2js, 'function')
        for (const key of ['Player', 'Query', 'Fullscreen', 'ready', 'startAll', 'convertTime']) {
            assert.ok(key in c2js, `expected c2js.${key} to be exposed`)
        }
    })

    test(`${file} initializes players through c2js()`, () => {
        const c2js = loadWebBundle(file)
        const { container, media, elements } = buildPlayer(dom.document, { play: '' })

        c2js('[c2js]', { saveWith: 'none' })

        click(elements.play)
        assert.equal(media.paused, false)
        assert.equal(container.getAttribute('c2-status'), 'play')

        container.c2js.destroy()
    })

    test(`${file} passes each player to onReady`, () => {
        const c2js = loadWebBundle(file)
        buildPlayer(dom.document, { play: '' })
        buildPlayer(dom.document, { play: '' })

        const players = []
        c2js('[c2js]', { saveWith: 'none' }, (player) => { players.push(player) })

        assert.equal(players.length, 2)
        assert.ok(players.every((player) => player instanceof c2js.Player))
    })

    test(`${file} startAll skips already initialized players`, () => {
        const c2js = loadWebBundle(file)
        const { container } = buildPlayer(dom.document, { play: '' })

        c2js('[c2js]', { saveWith: 'none' })
        const first = container.c2js

        let started = 0
        c2js.startAll({ saveWith: 'none' }, () => { started++ })

        assert.equal(started, 0)
        assert.equal(container.c2js, first)
    })
}
