import type { AnyElement, Dict, Selector } from './types'

/** Implemented by `Player` so controls can flip status flags through `Query.data()`. */
export interface StatusOwner {
    addStatus(status: string): void
    removeStatus(status: string): void
}

type EachHandler<T = void> = (this: AnyElement, index: number, el: AnyElement) => T

const SIMPLE_SELECTOR = /^([#.]?)([-\w]+)(.*)$/

export function isArrayLike(obj: unknown): obj is ArrayLike<AnyElement> {
    if (Array.isArray(obj)) { return true }
    if (!obj) { return false }

    const length = (obj as ArrayLike<AnyElement>).length
    return typeof length === 'number' && (length === 0 || (length > 0 && (length - 1) in (obj as object)))
}

export function isSet<T>(value: T | null | undefined): value is T {
    return value !== void 0 && value !== null
}

export function each<T>(arrayLike: ArrayLike<T> | Dict<T>, iterator: (key: any, value: T) => unknown): void {
    if (isArrayLike(arrayLike)) {
        const list = arrayLike as unknown as ArrayLike<T>
        for (let i = 0; i < list.length; i++) { iterator.call(list[i], i, list[i]) }
        return
    }

    const dict = arrayLike as Dict<T>
    for (const key in dict) {
        if (Object.prototype.hasOwnProperty.call(dict, key)) { iterator.call(dict[key], key, dict[key]) }
    }
}

function isElement(node: AnyElement | null | undefined): node is HTMLElement {
    return !!node && typeof (node as HTMLElement).setAttribute === 'function'
}

/**
 * Minimal jQuery-like wrapper over a list of nodes. Only the handful of
 * operations needed by the controls is implemented, so it stays dependency free.
 */
export class Query {
    private readonly list: ArrayLike<AnyElement>
    private readonly owner?: StatusOwner

    public constructor(selector: Selector, context: Document | HTMLElement = document, owner?: StatusOwner) {
        this.owner = owner
        this.list = Query.resolve(selector, context)
    }

    private static resolve(selector: Selector, context: Document | HTMLElement): ArrayLike<AnyElement> {
        if (selector instanceof Query) { return selector.list }
        if (typeof selector !== 'string') {
            return isArrayLike(selector) ? selector : [selector as AnyElement]
        }

        const type = SIMPLE_SELECTOR.exec(selector)

        if (!type || type[3]) { return context.querySelectorAll<HTMLElement>(selector) }
        if (!type[1]) { return context.getElementsByTagName(type[2]) as HTMLCollectionOf<HTMLElement> }
        if (type[1] === '.') { return context.getElementsByClassName(type[2]) as HTMLCollectionOf<HTMLElement> }

        const byId = context.querySelector<HTMLElement>('#' + type[2])
        return byId ? [byId] : []
    }

    /** Creates a new query that keeps the current status owner. */
    private wrap(selector: Selector, context?: Document | HTMLElement): Query {
        return new Query(selector, context ?? document, this.owner)
    }

    public get length(): number {
        return this.list.length
    }

    public each(handler: EachHandler): this {
        each(this.list, (index: number, el: AnyElement) => { handler.call(el, index, el) })
        return this
    }

    public on(events: string, fn: EventListener, capture = false): this {
        return this.eventListener('add', events, fn, capture)
    }

    public off(events: string, fn: EventListener, capture = false): this {
        return this.eventListener('remove', events, fn, capture)
    }

    /** Binds a listener that detaches itself right after the first call. */
    public one(events: string, fn: EventListener, capture = false): this {
        const once: EventListener = function (this: AnyElement, event: Event) {
            (this as HTMLElement).removeEventListener(event.type, once, capture)
            return fn.call(this, event)
        }
        return this.on(events, once, capture)
    }

    private eventListener(type: 'add' | 'remove', events: string, fn: EventListener, capture: boolean): this {
        const names = events.split(/\s+/).filter(Boolean)
        return this.each((_, el) => {
            names.forEach((event) => {
                if (event === 'click') { (el as unknown as Dict)['hasOnClick'] = true }
                el[`${type}EventListener`](event, fn, capture)
            })
        })
    }

    public trigger(type: string): this {
        return this.each((_, el) => {
            if (type === 'focus') { return (el as HTMLElement).focus?.() }
            el.dispatchEvent(new CustomEvent(type, { bubbles: true, cancelable: true }))
        })
    }

    public empty(): boolean {
        return !this.list.length
    }

    public attr(name: string): string | null
    public attr(name: string, value: string | number | boolean): this
    public attr(name: string, value?: string | number | boolean): string | null | this {
        if (!isSet(value)) {
            const el = this.first()
            return isElement(el) ? el.getAttribute(name) : null
        }
        return this.each((_, el) => {
            if (isElement(el)) { el.setAttribute(name, value + '') }
        })
    }

    public attrIfNotExists(name: string, value: string | number | boolean): this {
        return this.each((_, el) => {
            if (isElement(el) && !el.hasAttribute(name)) { el.setAttribute(name, value + '') }
        })
    }

    /**
     * Reads or writes the `c2-<name>` attribute. Boolean values also toggle the
     * matching player status, keeping CSS selectors such as
     * `[c2-status~=play]` in sync.
     */
    public data(name: string): string | null
    public data(name: string, value: string | number | boolean): this
    public data(name: string, value?: string | number | boolean): string | null | this {
        if (!isSet(value)) { return this.attr('c2-' + name) }

        if (value === true) {
            this.owner?.addStatus(name)
        } else if (value === false) {
            this.owner?.removeStatus(name)
        }

        return this.attr('c2-' + name, value)
    }

    public val(): string | undefined
    public val(value: string | number): this
    public val(value?: string | number): string | undefined | this {
        const el = this.first() as HTMLInputElement | undefined
        if (!isSet(value)) { return el?.value }
        return this.each((_, node) => { (node as HTMLInputElement).value = value + '' })
    }

    public text(): string | undefined
    public text(text: string): this
    public text(text?: string): string | undefined | this {
        if (isSet(text)) {
            return this.each((_, el) => { (el as HTMLElement).textContent = text })
        }

        let value = ''
        this.each((_, el) => { value += (el as HTMLElement).textContent ?? '' })
        return value.trim() || void 0
    }

    public css(styles: Dict<string | number>): this
    public css(name: string): string | undefined
    public css(name: string, value: string | number): this
    public css(name: string | Dict<string | number>, value?: string | number): string | undefined | this {
        if (typeof name !== 'string') {
            each(name, (key: string, styleValue) => { this.css(key, styleValue) })
            return this
        }

        if (isSet(value)) {
            const styleValue = typeof value === 'number' ? `${value}px` : value
            return this.each((_, el) => { (el as HTMLElement).style?.setProperty(name, styleValue) })
        }

        const el = this.first() as HTMLElement | undefined
        if (!el) { return void 0 }

        const view = el.ownerDocument?.defaultView
        if (view?.getComputedStyle) { return view.getComputedStyle(el).getPropertyValue(name) }
        return el.style?.[name as any]
    }

    public find(selector: string): Query {
        const el = this.first()
        return this.wrap(isElement(el) ? selector : [], isElement(el) ? el : document)
    }

    public findOne(selector: string): Query {
        const el = this.first()
        const found = isElement(el) ? el.querySelector<HTMLElement>(selector) : null
        return this.wrap(found ? [found] : [])
    }

    public filter(predicate: EachHandler<boolean>): Query {
        const list: AnyElement[] = []
        this.each(function (index, el) {
            if (predicate.call(el, index, el)) { list.push(el) }
        })
        return this.wrap(list)
    }

    public first<T extends AnyElement = HTMLElement>(): T | undefined {
        return this.list[0] as T | undefined
    }

    public toArray(): AnyElement[] {
        return Array.prototype.slice.call(this.list)
    }
}
