import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = [
  ['51918755472'],
  ['526627333979']
]

global.dev = 'EvoCore.js'
global.org = 'EvoCore Operacion.js'
global.botName = 'Killua-Wa'
global.vs = '1.core.js'
global.prefix = ['*', '+']
global.packname = 'ᴄᴏʀᴇ.ᴊs'
global.icono = 'https://cdn.skyultraplus.com/uploads/u3/5ea60b2411a97a83.jpg'
global.banner = 'https://cdn.skyultraplus.com/uploads/u3/52f832a7a8f3f4c5.jpg'

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.cyanBright("🌴 Sistema Core Actualizado"))
  import(`${file}?update=${Date.now()}`)
})
