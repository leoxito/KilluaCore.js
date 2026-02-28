import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = [
  ['819095203873'],
  ['9170443047164']
]

global.dev = 'Nexy 7z'
global.org = 'Midnight Society'
global.botName = 'Delta'
global.vs = 'v1.43'
global.prefix = ['7', '#']
global.packname = 'Delta Sticker By'

// --- CONFIGURACIÓN DE IMAGINES ---
global.icono = 'https://cdn.skyultraplus.com/uploads/u3/5ea60b2411a97a83.jpg'
global.banner = 'https://cdn.skyultraplus.com/uploads/u3/52f832a7a8f3f4c5.jpg'
// --- CONFIGURACIÓN DE ECONOMÍA GLOBAL ---
global.currency = 'Stars' // moneda
// ----------------------------------------

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.cyanBright("Configuración Actualizada"))
  import(`${file}?update=${Date.now()}`)
})
