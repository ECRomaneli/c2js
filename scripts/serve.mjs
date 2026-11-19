#!/usr/bin/env node
/**
 * Zero-dependency static server used to preview the templates locally.
 * Serves the repository root, so `templates/` can reach `dist/`.
 *
 * Usage: node scripts/serve.mjs [port]
 */
import { createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'))
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080)

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.cjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.srt': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
}

function resolvePath(url) {
    const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname)
    const candidate = resolve(join(ROOT, normalize(pathname)))

    // Block path traversal outside of the repository root.
    if (candidate !== ROOT && !candidate.startsWith(ROOT + '/')) { return null }

    try {
        return statSync(candidate).isDirectory() ? join(candidate, 'index.html') : candidate
    } catch {
        return null
    }
}

/**
 * Parse a single-range `Range: bytes=start-end` header.
 * Media elements need range support to seek: without it the browser reports an
 * empty seekable range and every seek snaps back to zero.
 */
function parseRange(header, size) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '')
    if (!match) { return null }

    const [, rawStart, rawEnd] = match
    if (rawStart === '' && rawEnd === '') { return null }

    // A suffix range (`bytes=-500`) asks for the last N bytes.
    let start = rawStart === '' ? size - Number(rawEnd) : Number(rawStart)
    let end = rawStart === '' || rawEnd === '' ? size - 1 : Number(rawEnd)

    start = Math.max(0, start)
    end = Math.min(end, size - 1)

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) { return null }

    return { start, end }
}

createServer((req, res) => {
    const file = resolvePath(req.url ?? '/')

    if (!file) {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('Not found')
        return
    }

    let stats
    try {
        stats = statSync(file)
    } catch {
        res.writeHead(404, { 'content-type': 'text/plain' })
        res.end('Not found')
        return
    }

    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'

    if (req.headers.range) {
        const range = parseRange(req.headers.range, stats.size)

        if (!range) {
            res.writeHead(416, { 'content-range': `bytes */${stats.size}` })
            res.end()
            return
        }

        res.writeHead(206, {
            'content-type': type,
            'content-length': range.end - range.start + 1,
            'content-range': `bytes ${range.start}-${range.end}/${stats.size}`,
            'accept-ranges': 'bytes',
            'cache-control': 'no-cache'
        })
        createReadStream(file, { start: range.start, end: range.end }).pipe(res)
        return
    }

    res.writeHead(200, {
        'content-type': type,
        'content-length': stats.size,
        'accept-ranges': 'bytes',
        'cache-control': 'no-cache'
    })
    createReadStream(file).pipe(res)
}).listen(PORT, () => {
    console.log(`Serving ${ROOT} on http://localhost:${PORT}/templates/minimal/`)
})
