/**
 * Minimal DOM stub, just enough for `Player` to run under Node without
 * pulling a dependency like jsdom.
 */

class ClassList {
    #tokens = new Set()
    add(...tokens) { tokens.forEach((t) => this.#tokens.add(t)) }
    contains(token) { return this.#tokens.has(token) }
}

class FakeEvent {
    constructor(type, init = {}) {
        this.type = type
        this.bubbles = !!init.bubbles
        this.cancelable = !!init.cancelable
        this.defaultPrevented = false
        this.propagationStopped = false
        this.target = null
        this.currentTarget = null
    }
    preventDefault() { this.defaultPrevented = true }
    stopPropagation() { this.propagationStopped = true }
}

class FakeNode {
    constructor(tagName, ownerDocument) {
        this.tagName = tagName.toUpperCase()
        this.ownerDocument = ownerDocument
        this.parentNode = null
        this.childNodes = []
        this.attributes = new Map()
        this.classList = new ClassList()
        this.style = new Style()
        this.textContent = ''
        this.value = ''
        this.listeners = new Map()
        this.focused = false
    }

    get children() { return this.childNodes }

    get id() { return this.getAttribute('id') ?? '' }
    set id(value) { this.setAttribute('id', value) }

    appendChild(child) {
        child.parentNode = this
        this.childNodes.push(child)
        return child
    }

    setAttribute(name, value) { this.attributes.set(name, value + '') }
    getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null }
    hasAttribute(name) { return this.attributes.has(name) }
    removeAttribute(name) { this.attributes.delete(name) }

    focus() { this.focused = true }

    addEventListener(type, fn, capture = false) {
        const key = `${type}:${capture ? 'c' : 'b'}`
        if (!this.listeners.has(key)) { this.listeners.set(key, []) }
        this.listeners.get(key).push(fn)
    }

    removeEventListener(type, fn, capture = false) {
        const key = `${type}:${capture ? 'c' : 'b'}`
        const list = this.listeners.get(key)
        if (!list) { return }
        const index = list.indexOf(fn)
        if (index !== -1) { list.splice(index, 1) }
    }

    /** Dispatches with capture on the ancestors, then bubbles back up. */
    dispatchEvent(event) {
        event.target ??= this

        const path = []
        for (let node = this; node; node = node.parentNode) { path.push(node) }

        for (const node of [...path].reverse()) {
            if (event.propagationStopped) { break }
            node.#fire(event, true)
        }

        for (const node of path) {
            if (event.propagationStopped) { break }
            node.#fire(event, false)
            if (!event.bubbles) { break }
        }

        return !event.defaultPrevented
    }

    #fire(event, capture) {
        const list = this.listeners.get(`${event.type}:${capture ? 'c' : 'b'}`)
        if (!list) { return }
        event.currentTarget = this
        for (const fn of [...list]) { fn.call(this, event) }
    }

    /** Supports the attribute, tag and descendant selectors used by c2js. */
    querySelectorAll(selector) {
        const matchers = selector.split(',').map((part) => matcher(part.trim()))
        const found = []
        walk(this, (node) => {
            if (node !== this && matchers.some((match) => match(node))) { found.push(node) }
        })
        return found
    }

    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null }

    getElementsByTagName(tagName) { return this.querySelectorAll(tagName) }

    getElementsByClassName(className) { return this.querySelectorAll('.' + className) }
}

class Style {
    setProperty(name, value) { this[name] = value }
    getPropertyValue(name) { return this[name] ?? '' }
}

class FakeMedia extends FakeNode {
    #volume = 1
    #currentTime = 0

    constructor(tagName, ownerDocument) {
        super(tagName, ownerDocument)
        this.paused = true
        this.muted = false
        this.loop = false
        this.duration = 100
        this.readyState = 4
        this.playbackRate = 1
        this.played = false
    }

    get currentSrc() { return this.getAttribute('src') ?? '' }

    get volume() { return this.#volume }
    set volume(value) {
        const next = Math.min(1, Math.max(0, Number(value) || 0))
        if (next === this.#volume) { return }
        this.#volume = next
        this.emit('volumechange')
    }

    get currentTime() { return this.#currentTime }
    set currentTime(value) {
        this.#currentTime = Math.min(this.duration, Math.max(0, Number(value) || 0))
        this.emit('timeupdate')
    }

    play() {
        this.paused = false
        this.played = true
        this.emit('play')
        return Promise.resolve()
    }

    pause() {
        this.paused = true
        this.emit('pause')
    }

    emit(type) {
        this.dispatchEvent(new FakeEvent(type, { bubbles: true, cancelable: true }))
    }
}

function matcher(selector) {
    const attr = /^\[([-\w]+)(?:([~^$*]?=)"?([^"\]]*)"?)?\]$/.exec(selector)
    if (attr) {
        const [, name, operator, value] = attr
        return (node) => {
            if (!node.hasAttribute(name)) { return false }
            if (!operator) { return true }
            const actual = node.getAttribute(name) ?? ''
            if (operator === '=') { return actual === value }
            if (operator === '~=') { return actual.split(/\s+/).includes(value) }
            if (operator === '*=') { return actual.includes(value) }
            return false
        }
    }

    if (selector.startsWith('.')) {
        const className = selector.slice(1)
        return (node) => node.classList.contains(className)
    }

    if (selector.startsWith('#')) {
        const id = selector.slice(1)
        return (node) => node.getAttribute('id') === id
    }

    const tagName = selector.toUpperCase()
    return (node) => node.tagName === tagName
}

function walk(node, visit) {
    visit(node)
    node.childNodes.forEach((child) => walk(child, visit))
}

class FakeDocument extends FakeNode {
    constructor() {
        super('#document', null)
        this.ownerDocument = this
        this.readyState = 'complete'
        this.cookie = ''
        this.body = this.appendChild(new FakeNode('body', this))
        this.defaultView = null
    }

    createElement(tagName) {
        return /^(video|audio)$/i.test(tagName)
            ? new FakeMedia(tagName, this)
            : new FakeNode(tagName, this)
    }
}

class FakeLocalStorage {
    #data = new Map()
    getItem(key) { return this.#data.has(key) ? this.#data.get(key) : null }
    setItem(key, value) { this.#data.set(key, value + '') }
    removeItem(key) { this.#data.delete(key) }
    clear() { this.#data.clear() }
}

/**
 * Installs the stub as the globals c2js expects and returns helpers plus a
 * `restore()` to put the previous globals back.
 */
export function setupDom() {
    const previous = {
        document: globalThis.document,
        window: globalThis.window,
        localStorage: globalThis.localStorage,
        CustomEvent: globalThis.CustomEvent
    }

    const document = new FakeDocument()
    const window = { document }
    document.defaultView = null

    globalThis.document = document
    globalThis.window = window
    globalThis.localStorage = new FakeLocalStorage()
    globalThis.CustomEvent = FakeEvent

    return {
        document,
        window,
        localStorage: globalThis.localStorage,
        restore() {
            globalThis.document = previous.document
            globalThis.window = previous.window
            globalThis.localStorage = previous.localStorage
            globalThis.CustomEvent = previous.CustomEvent
        }
    }
}

/**
 * Builds a `[c2js]` container with a media element and the given controls,
 * e.g. `buildPlayer(document, { play: '', move: '+5' })`.
 */
export function buildPlayer(document, controls = {}, mediaTag = 'video') {
    const container = document.createElement('div')
    container.setAttribute('c2js', 'player')

    const media = document.createElement(mediaTag)
    media.setAttribute('src', 'sample.mp4')
    container.appendChild(media)

    const elements = {}
    for (const [name, value] of Object.entries(controls)) {
        const el = document.createElement('button')
        el.setAttribute(`c2-${name}`, value ?? '')
        container.appendChild(el)
        elements[name] = el
    }

    document.body.appendChild(container)
    return { container, media, elements }
}

export function click(el) {
    el.dispatchEvent(new FakeEvent('click', { bubbles: true, cancelable: true }))
}

export function keydown(el, key) {
    const event = new FakeEvent('keydown', { bubbles: true, cancelable: true })
    event.key = key
    el.dispatchEvent(event)
    return event
}

export { FakeEvent }
