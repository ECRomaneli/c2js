#!/usr/bin/env node
/**
 * Builds the distributable files:
 *
 *   dist/module  CommonJS + ESM + type declarations (npm consumers)
 *   dist/web     IIFE bundle exposing the `c2js` global (<script> consumers)
 *
 * Usage: node scripts/build.mjs [module|web|all]
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'src')
const MODULE_DIR = join(ROOT, 'dist', 'module')
const WEB_DIR = join(ROOT, 'dist', 'web')
const WEB_TARGET = 'es2015'

const target = process.argv[2] ?? 'all'
if (!['all', 'module', 'web'].includes(target)) {
    console.error(`Unknown target "${target}". Use: module, web or all.`)
    process.exit(1)
}

const BIN = join(ROOT, 'node_modules', '.bin')
const exe = (name) => join(BIN, process.platform === 'win32' ? `${name}.cmd` : name)

const run = (name, args) => execFileSync(exe(name), args, { cwd: ROOT, stdio: 'inherit' })
const tsc = (args) => run('tsc', args)
const esbuild = (args) => run('esbuild', args)
const bytes = (file) => `${(readFileSync(file).length / 1024).toFixed(1)} kB`

function buildModule() {
    console.log('Building module...')
    rmSync(MODULE_DIR, { recursive: true, force: true })

    // Type declarations.
    tsc(['--project', 'tsconfig.json'])

    // ESM and CommonJS bundles, so both `import` and `require` work.
    for (const [format, ext] of [['esm', 'mjs'], ['cjs', 'cjs']]) {
        esbuild([
            join(SRC, 'index.ts'),
            '--bundle', `--format=${format}`, '--platform=browser',
            `--target=${WEB_TARGET}`, '--sourcemap',
            `--outfile=${join(MODULE_DIR, `index.${ext}`)}`
        ])
    }

    copyFileSync(join(SRC, 'c2.css'), join(MODULE_DIR, 'c2.css'))
    console.log(`  dist/module/index.mjs   ${bytes(join(MODULE_DIR, 'index.mjs'))}`)
    console.log(`  dist/module/index.cjs   ${bytes(join(MODULE_DIR, 'index.cjs'))}`)
}

function buildWeb() {
    console.log('Building web library...')
    rmSync(WEB_DIR, { recursive: true, force: true })
    mkdirSync(WEB_DIR, { recursive: true })

    const banner = buildBanner()
    const common = [
        join(SRC, 'browser.ts'),
        '--bundle', '--format=iife', '--platform=browser',
        `--target=${WEB_TARGET}`, `--banner:js=${banner}`
    ]

    esbuild([...common, `--outfile=${join(WEB_DIR, 'c2.js')}`])
    esbuild([...common, '--minify', '--sourcemap', `--outfile=${join(WEB_DIR, 'c2.min.js')}`])

    copyFileSync(join(SRC, 'c2.css'), join(WEB_DIR, 'c2.css'))
    writeFileSync(join(WEB_DIR, 'c2.min.css'), minifyCss(readFileSync(join(SRC, 'c2.css'), 'utf8')))

    console.log(`  dist/web/c2.js          ${bytes(join(WEB_DIR, 'c2.js'))}`)
    console.log(`  dist/web/c2.min.js      ${bytes(join(WEB_DIR, 'c2.min.js'))}`)
}

function buildBanner() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    return `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License | ${pkg.homepage ?? ''} */`
}

function minifyCss(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s*([{}:;,>~])\s*/g, '$1')
        .replace(/;}/g, '}')
        .replace(/\s+/g, ' ')
        .trim()
}

if (target === 'all' || target === 'module') { buildModule() }
if (target === 'all' || target === 'web') { buildWeb() }
console.log('Build finished!')
