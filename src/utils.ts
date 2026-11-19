export type BrokenNumber = {
    signal: string
    number: number
    type: string
}

export type TimeUnit = 'ms' | 's' | 'm' | 'h' | 'd'

const TIME_UNITS: TimeUnit[] = ['ms', 's', 'm', 'h', 'd']
const TIME_FACTORS = [1000, 60, 60, 24]
const NUMBER_PATTERN = /^(\D*?)((?:\d+)?(?:\.\d+)?)\s*(\D*)$/

export function isSubstr(str: string, substr: string): boolean {
    return str.indexOf(substr) !== -1
}

/** Returns the other value of the pair, so attributes can be flipped. */
export function toggleVal<T>(value: T | null | undefined, toggle: [T, T]): T {
    return toggle[value === toggle[0] ? 1 : 0]
}

/** Clamps `value` between `min` and `max`. */
export function minMaxVal(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) { return min }
    return value < min ? min : value > max ? max : value
}

/**
 * Splits a control value such as `-10%`, `+5s` or `0.5` into its signal,
 * numeric value and unit. When `unitTo` or `total` is given, the number is
 * already converted (percentages resolve against `total`).
 */
export function breakNumber(value: string | number | null | undefined, unitTo?: TimeUnit | null, total?: number): BrokenNumber {
    const broken: BrokenNumber = { signal: '', number: 0, type: '' }
    if (!isSet(value) || value === '') { return broken }

    const raw = (value + '').trim()
    const match = NUMBER_PATTERN.exec(raw)
    if (!match || !match[2]) { return broken }

    broken.signal = match[1].trim()
    broken.type = match[3].trim()
    broken.number = parseFloat(broken.signal + match[2])

    if (Number.isNaN(broken.number)) { return { signal: '', number: 0, type: '' } }

    if (broken.type === '%') {
        if (isSet(total)) { resolvePercentage(broken, total) }
    } else if (isSet(unitTo)) {
        convertUnit(broken, unitTo)
    }

    return broken
}

function resolvePercentage(broken: BrokenNumber, total: number): void {
    broken.type = ''
    broken.number *= total / 100
}

function convertUnit(broken: BrokenNumber, unitTo: TimeUnit): void {
    let from = TIME_UNITS.indexOf(broken.type as TimeUnit)
    const to = TIME_UNITS.indexOf(unitTo)

    if (from === -1 || to === -1) { return }

    broken.type = unitTo
    while (from !== to) {
        if (from > to) {
            broken.number *= TIME_FACTORS[--from]
        } else {
            broken.number /= TIME_FACTORS[from++]
        }
    }
}

/** Formats seconds as `mm:ss`, or `HH:mm:ss` for durations of an hour or more. */
export function convertTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) { seconds = 0 }

    const total = Math.floor(seconds)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const secs = total % 60
    const pad = (value: number) => (value < 10 ? '0' + value : '' + value)

    return hours ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`
}

function isSet<T>(value: T | null | undefined): value is T {
    return value !== void 0 && value !== null
}
