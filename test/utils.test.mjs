import assert from 'node:assert/strict'
import { test } from 'node:test'

import { breakNumber, convertTime, minMaxVal, toggleVal } from '../dist/module/index.mjs'

test('convertTime formats mm:ss below one hour', () => {
    assert.equal(convertTime(0), '00:00')
    assert.equal(convertTime(9), '00:09')
    assert.equal(convertTime(75), '01:15')
    assert.equal(convertTime(3599), '59:59')
})

test('convertTime formats HH:mm:ss from one hour on', () => {
    assert.equal(convertTime(3600), '01:00:00')
    assert.equal(convertTime(3725), '01:02:05')
    assert.equal(convertTime(86399), '23:59:59')
})

test('convertTime keeps working past 24 hours', () => {
    assert.equal(convertTime(90000), '25:00:00')
})

test('convertTime falls back to zero for invalid input', () => {
    assert.equal(convertTime(NaN), '00:00')
    assert.equal(convertTime(Infinity), '00:00')
    assert.equal(convertTime(-5), '00:00')
})

test('minMaxVal clamps to the given range', () => {
    assert.equal(minMaxVal(5, 0, 3), 3)
    assert.equal(minMaxVal(-1, 0, 3), 0)
    assert.equal(minMaxVal(2, 0, 3), 2)
    assert.equal(minMaxVal(NaN, 0, 3), 0)
})

test('toggleVal flips between the two values', () => {
    assert.equal(toggleVal('current', ['current', 'remaining']), 'remaining')
    assert.equal(toggleVal('remaining', ['current', 'remaining']), 'current')
    assert.equal(toggleVal(null, ['current', 'remaining']), 'current')
})

test('breakNumber reads plain numbers', () => {
    assert.deepEqual(breakNumber('10'), { signal: '', number: 10, type: '' })
    assert.deepEqual(breakNumber('0.5'), { signal: '', number: 0.5, type: '' })
    assert.deepEqual(breakNumber(42), { signal: '', number: 42, type: '' })
})

test('breakNumber keeps the signal for relative values', () => {
    assert.equal(breakNumber('+5').signal, '+')
    assert.equal(breakNumber('+5').number, 5)
    assert.equal(breakNumber('-5').signal, '-')
    assert.equal(breakNumber('-5').number, -5)
})

test('breakNumber resolves percentages against the total', () => {
    const broken = breakNumber('+10%', null, 1)
    assert.equal(broken.signal, '+')
    assert.equal(broken.number, 0.1)
    assert.equal(broken.type, '')

    assert.equal(breakNumber('50%', 's', 120).number, 60)
    assert.equal(breakNumber('-25%', null, 200).number, -50)
})

test('breakNumber converts time units', () => {
    assert.equal(breakNumber('1s', 'ms').number, 1000)
    assert.equal(breakNumber('1000ms', 's').number, 1)
    assert.equal(breakNumber('2m', 's').number, 120)
    assert.equal(breakNumber('1h', 'm').number, 60)
    assert.equal(breakNumber('1d', 'h').number, 24)
})

test('breakNumber is safe with empty or invalid values', () => {
    const zero = { signal: '', number: 0, type: '' }
    assert.deepEqual(breakNumber(''), zero)
    assert.deepEqual(breakNumber(null), zero)
    assert.deepEqual(breakNumber(undefined), zero)
    assert.deepEqual(breakNumber('abc'), zero)
})
