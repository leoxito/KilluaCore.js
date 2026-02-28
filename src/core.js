import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = ['51918755472']
global.dev = 'EvoCore.js'
global.org = 'EvoCore Operacion.js'
global.botName = 'Killua-Wa'
global.vs = '1.core.js'
global.prefix = ['.', '+']
global.packname = 'ᴄᴏʀᴇ.ᴊs'
global.icono = ''
global.banner = ''

const file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.cyanBright("🌴 Sistema Core Actualizado"))
  import(`${file}?update=${Date.now()}`)
})