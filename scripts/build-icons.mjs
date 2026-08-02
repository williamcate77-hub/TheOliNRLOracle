// Home screen icons.
//
// The competition badge on the app's own base colour, so adding the app to a
// phone gives you the NRL shield rather than a blank square or a screenshot.
// The light variant of the badge is used for the same reason the club badges
// use theirs: the standard one is black and would vanish on #0B1015.
//
//   npm run icons
//
// Regenerating is only needed if the NRL changes its badge.

import { execFile } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)

const BADGE = 'https://www.nrl.com/.theme/nrl-premiership/badge-light.png'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

const res = await fetch(BADGE, { headers: { 'User-Agent': UA } })
if (!res.ok) throw new Error(`badge fetch returned ${res.status}`)
const src = '/tmp/nrl-badge-light.png'
await writeFile(src, Buffer.from(await res.arrayBuffer()))

// Pillow does the compositing. It is the one dependency here that is not in
// package.json, which is why this is a script you run by hand and not part of
// the build.
const python = `
from PIL import Image

badge = Image.open(${JSON.stringify(src)}).convert('RGBA')
badge = badge.crop(badge.split()[3].getbbox())   # trim to the artwork itself
BASE = (0x0B, 0x10, 0x15, 255)

def icon(size, fill):
    canvas = Image.new('RGBA', (size, size), BASE)
    w, h = badge.size
    scale = min(size * fill / w, size * fill / h)
    art = badge.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return canvas

# iOS ignores transparency and applies its own rounded mask, so this one is flat.
icon(180, 0.72).convert('RGB').save('public/apple-touch-icon.png')
icon(192, 0.72).save('public/icon-192.png')
icon(512, 0.72).save('public/icon-512.png')
# Android crops a maskable icon to a circle, so it needs more room around it.
icon(512, 0.54).save('public/icon-512-maskable.png')
icon(64, 0.78).save('app/icon.png')
print('icons written')
`

const { stdout } = await run('python3', ['-c', python])
process.stdout.write(stdout)
