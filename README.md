# C2JS

[![CI](https://github.com/ECRomaneli/c2js/actions/workflows/ci.yml/badge.svg)](https://github.com/ECRomaneli/c2js/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/c2js.svg)](https://www.npmjs.com/package/c2js)
[![license](https://img.shields.io/github/license/ECRomaneli/c2js.svg)](LICENSE)

**C2JS** (Custom Control JS) is a dependency-free media control framework. Mark up your own
HTML however you like, add `c2-*` attributes, and C2JS wires those elements to the
`<video>` or `<audio>` inside the container.

- **No dependencies.** ~15 kB minified, no jQuery, no runtime deps.
- **HTML first.** Controls are plain attributes, styling is entirely yours.
- **Typed.** Written in TypeScript with declarations shipped.
- **Keyboard ready.** Shortcuts declared per control via `c2-shortcuts`.
- **Status driven.** State is published as attributes, so CSS does the rest.

## Installation

```bash
npm install c2js
```

Or drop the browser bundle in a page:

```html
<link rel="stylesheet" href="dist/web/c2.css">
<script src="dist/web/c2.min.js"></script>
```

## Quick start

```html
<link rel="stylesheet" href="dist/web/c2.css">
<script src="dist/web/c2.min.js"></script>

<div c2js>
    <video src="sample.mp4" c2-hide-mouse="1000"></video>

    <button c2-play c2-shortcuts="space"></button>
    <button c2-stop></button>
    <button c2-move="-5" c2-shortcuts="left"></button>
    <button c2-move="+5" c2-shortcuts="right"></button>
    <input  c2-time-seek type="range">
    <span   c2-time="current">00:00</span>
    <span   c2-duration>00:00</span>
    <button c2-mute c2-shortcuts="m"></button>
    <input  c2-volume-seek type="range">
    <button c2-fullscreen c2-shortcuts="f"></button>
</div>

<script>c2js('[c2js]', { saveTime: true })</script>
```

As a module:

```js
import c2js, { Player } from 'c2js'
import 'c2js/c2.css'

// Initialize every matching container once the DOM is ready.
c2js('[c2js]', { saveTime: true }, (player) => console.log('ready', player))

// Or control a single container directly.
const player = new Player(document.querySelector('#my-player'), { saveWith: 'none' })
```

## Controls

Every control is an attribute named `c2-<control>`. Any element can be a control, and a
single element can carry several of them.

| Attribute | Value | Description |
| --- | --- | --- |
| `c2-play` | – | Toggles play/pause. Gets `c2-play="true\|false"`. |
| `c2-stop` | – | Pauses and rewinds to the start. |
| `c2-move` | `42`, `+5`, `-5`, `+10%`, `-1m` | Seeks. A signal makes it relative to the current time, `%` is relative to the duration. |
| `c2-volume` | `0.5`, `+10%`, `-10%` | Sets the volume. A signal makes it relative. |
| `c2-mute` | – | Toggles mute. Gets `c2-mute="true\|false"`. |
| `c2-loop` | – | Toggles looping. |
| `c2-speed` | `1`, `+0.5`, `-0.5` | Changes `playbackRate`, clamped by `config.speed`. |
| `c2-fullscreen` | – | Toggles fullscreen on the container. `c2-fullscreen="null"` when unsupported. |
| `c2-time` | `current`, `remaining` | Writes the time as text. Clicking toggles the mode. |
| `c2-duration` | – or attribute name | Writes the duration as text, or into the named attribute. |
| `c2-time-seek` | – | `<input type="range">` bound to the playback position. |
| `c2-volume-seek` | – | `<input type="range">` bound to the volume. |
| `c2-loading` | – | Gets `c2-loading="true"` while buffering. |
| `c2-buffer` | – | Gets the buffered percentage (0–100) and publishes it as `--c2-buffer`. |
| `c2-status` | – | Mirrors the player status list, for styling. |
| `c2-hide-mouse` | `3000`, `2s` | Hides the cursor over this element after the given idle time. |
| `c2-shortcuts` | `space f left dblclick` | Keys that trigger this control. |
| `c2-null` | – | The element only reflects status; it does not react to clicks. |
| `c2-custom` | any | Does nothing by itself; a hook for your own listeners. |

### Status and styling

The container (and every `c2-status` element) carries a `c2-status` attribute listing the
active states, so CSS can drive the whole appearance:

```css
[c2js][c2-status~="play"]       .my-play-button { background-image: url(pause.svg); }
[c2js][c2-status~="fullscreen"] .my-controls    { font-size: 1.5rem; }
[c2-loading="true"]                             { animation: spin 1s linear infinite; }
```

### Buffered track

`c2-buffer` writes how much of the media is already downloaded, both as the `c2-buffer`
attribute and as the `--c2-buffer` custom property. `c2-time-seek` publishes the played
position as `--c2-played`, so the native range can paint both segments with plain CSS:

```html
<input class="progress" c2-time-seek c2-buffer type="range">
```

```css
.progress::-webkit-slider-runnable-track {
    background: linear-gradient(to right,
        red 0 var(--c2-played, 0%),
        rgba(255, 255, 255, .4) var(--c2-played, 0%) var(--c2-buffer, 0%),
        rgba(255, 255, 255, .15) var(--c2-buffer, 0%) 100%);
}

.progress::-moz-range-track {
    background: linear-gradient(to right,
        rgba(255, 255, 255, .4) 0 var(--c2-buffer, 0%),
        rgba(255, 255, 255, .15) var(--c2-buffer, 0%) 100%);
}

.progress::-moz-range-progress { background: red; }
```

The percentage follows the buffered range that holds the current position, so seeking into
a gap reports the segment ahead and not the total downloaded. The value is also usable on
its own element:

```html
<div class="my-buffer" c2-buffer></div>
```

```css
.my-buffer { width: var(--c2-buffer, 0%); }
```

### Shortcuts

`c2-shortcuts` takes a space separated list of keys. Both short and standard names work
(`space`/`spacebar`, `esc`/`escape`, `left`/`arrowleft`, ...), plus the special `dblclick`.

```html
<button c2-play c2-shortcuts="space k"></button>
<button c2-fullscreen c2-shortcuts="f enter dblclick"></button>
```

## Configuration

```js
c2js('[c2js]', {
    id: 'my-player',          // namespace for the persisted data
    saveWith: 'localStorage', // 'localStorage' | 'cookie' | 'none'
    saveTime: false,          // persist and restore the playback position
    speed: { min: 0, max: 3 } // range allowed for c2-speed
})
```

| Option | Default | Description |
| --- | --- | --- |
| `id` | the container `id` | Namespace for the persisted data. |
| `saveWith` | `localStorage`, falling back to `cookie` | Where volume, mute and position are persisted. |
| `saveTime` | `false` | Restores the position when the same source is loaded again. |
| `speed` | `{ min: 0, max: 3 }` | Clamp applied by the `c2-speed` control. |

The playback position is stored per source, so loading a different file does not
resume at the previous one's position. Volume and mute are shared on purpose:
they are a user preference, not a property of one player. When two players share
a source and should keep separate positions, give them different ids (or just an
`id` on each container).

## API

```js
import c2js, { Player, Query, ready, startAll, convertTime } from 'c2js'
```

| Export | Description |
| --- | --- |
| `c2js(selector, config?, onReady?)` | Initializes every match once the DOM is ready. |
| `startAll(config?, onReady?)` | Initializes every `[c2js]` not yet initialized. |
| `new Player(el, config?, onReady?)` | Initializes a single container immediately. |
| `player.getStatus()` | Current status list, e.g. `['play', 'fullscreen']`. |
| `player.hasStatus(name)` | Whether a status is active. |
| `player.destroy()` | Detaches the player from its container. |
| `ready(fn)` | Runs `fn` when the DOM is ready. |
| `Query` | The tiny internal DOM helper. |
| `convertTime(seconds)` | Formats seconds as `mm:ss` / `HH:mm:ss`. |
| `storageKeys(id?)` | The keys a player persists under, to read or clear them yourself. |

The media element also emits **`stimeupdate`**: like `timeupdate`, but throttled to once
per second, which is what the text controls use.

## Templates

Ready-made themes live in [`templates/`](templates):

| Template | Description |
| --- | --- |
| [`minimal`](templates/minimal) | Flexbox based overlay, touch friendly. |
| [`minimal-modern`](templates/minimal-modern) | Modern mobile-first overlay: CSS-only toggle, glass controls and large tap targets. |
| [`mpc-hc`](templates/mpc-hc) | Media Player Classic inspired bar. |
| [`mpc-modern`](templates/mpc-modern) | Modern take on the MPC bar: dark glass panel, accent controls and the same layout. |
| [`youtube`](templates/youtube) | Desktop YouTube style: hover chrome, red progress bar and keyboard shortcuts. |
| [`mpc-hc (with original theme)`](templates/mpc-hc%20(with%20original%20theme)) | Same layout with the original MPC toolbar sprite. |

Preview them locally:

```bash
npm install
npm run build
npm run serve     # http://localhost:8080/templates/minimal/
```

## Development

```bash
npm install
npm run build          # dist/module + dist/web
npm run build:module   # declarations + ESM/CJS bundles
npm run build:web      # IIFE bundle exposing the c2js global
npm run typecheck      # tsc --noEmit
npm test               # node:test suite
npm run serve          # static server for the templates
```

| Path | Description |
| --- | --- |
| `src/` | TypeScript sources. |
| `src/controls.ts` | Control definitions; add new `c2-*` controls here. |
| `src/player.ts` | Wires controls, shortcuts, status and persistence. |
| `src/query.ts` | Minimal DOM helper. |
| `scripts/` | Dependency-free build and preview scripts. |
| `test/` | `node:test` suite with a small DOM stub. |
| `dist/` | Build output, not committed. |

Builds are published by GitHub Actions: [`ci.yml`](.github/workflows/ci.yml) validates every
push, and [`release.yml`](.github/workflows/release.yml) runs only when a version tag such as
`0.2.1` is created.

The tag is the single source of truth for the version: the workflow derives it from the tag
name and bumps `package.json` during the build, so `version` is never edited by hand (it
stays `0.0.0-dev` in the repository). Tags with a suffix such as `1.0.0-rc.1` are published
as prereleases.

```bash
git tag 1.0.0
git push origin 1.0.0
```

## Browser support

The bundles target ES2015 and the vendor prefixed Fullscreen APIs are normalized, so modern
browsers plus older WebKit/Gecko/Edge builds are covered. When fullscreen is unavailable the
control is marked `c2-fullscreen="null"` instead of failing.

## License

[MIT](LICENSE) © [Emerson Capuchi Romaneli](https://github.com/ECRomaneli)
