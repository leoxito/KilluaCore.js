console.log('✅ Iniciando...')

import { join, dirname } from 'path'
import { createRequire } from 'module';
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
import { watchFile, unwatchFile } from 'fs'
import cfonts from 'cfonts';
import { createInterface } from 'readline'
import yargs from 'yargs'
import chalk from 'chalk'
import path from 'path'
import os from 'os'
import { promises as fsPromises } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)
const { name, author } = require(join(__dirname, './package.json'))
const { say } = cfonts
const rl = createInterface(process.stdin, process.stdout)

say('Senna FG98', {
  font: 'pallet',
  align: 'center',
  gradient: ['red', 'magenta']
})
say(`senna-bot By FG98 Ig: @fg98_ff`, {
  font: 'console',
  align: 'center',
  gradient: ['cyan', 'magenta']
})

var isRunning = false

async function start(file) {
  if (isRunning) return
  isRunning = true
  const currentFilePath = new URL(import.meta.url).pathname
  let args = [join(__dirname, file), ...process.argv.slice(2)]
  say([process.argv[0], ...args].join(' '), {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta']
  })
  setupMaster({
    exec: args[0],
    args: args.slice(1),
  })
  let p = fork()
  p.on('message', data => {
    console.log('[RECEIVED]', data)
    switch (data) {
      case 'reset':
        p.process.kill()
        isRunning = false
        start.apply(this, arguments)
        break
      case 'uptime':
        p.send(process.uptime())
        break
    }
  })
  
  p.on('exit', (_, code) => {
    isRunning = false
    console.error('❎ Ocurrió un error inesperado:', code)
    start('main.js')

    if (code === 0) return
    watchFile(args[0], () => {
      unwatchFile(args[0])
      start(file)
    })
  })

  console.log(chalk.yellow(`🖥️ ${os.type()}, ${os.release()} - ${os.arch()}`));
  const ramInGB = os.totalmem() / (1024 * 1024 * 1024);
  console.log(chalk.yellow(`💾 Total RAM: ${ramInGB.toFixed(2)} GB`));
  const freeRamInGB = os.freemem() / (1024 * 1024 * 1024);
  console.log(chalk.yellow(`💽 Free RAM: ${freeRamInGB.toFixed(2)} GB`));
  console.log(chalk.yellow(`📃 Script by FG98`));

  const packageJsonPath = path.join(path.dirname(currentFilePath), './package.json');
  try {
    const packageJsonData = await fsPromises.readFile(packageJsonPath, 'utf-8');
    const packageJsonObj = JSON.parse(packageJsonData);
    console.log(chalk.blue.bold(`\n📦 Información del Paquete`));
    console.log(chalk.cyan(`Nombre: ${packageJsonObj.name}`));
    console.log(chalk.cyan(`Versión: ${packageJsonObj.version}`));
    console.log(chalk.cyan(`Descripción: ${packageJsonObj.description}`));
    console.log(chalk.cyan(`Autor: ${packageJsonObj.author.name}`));
  } catch (err) {
    console.error(chalk.red(`❌ No se pudo leer el archivo package.json: ${err}`));
  }

  console.log(chalk.blue.bold(`\n⏰ Hora Actual`));
  const currentTime = new Date().toLocaleString('es-ES', { timeZone: 'America/Argentina/Buenos_Aires' })
  console.log(chalk.cyan(`${currentTime}`));

  setInterval(() => {}, 1000);

  let opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
  if (!opts['test'])
    if (!rl.listenerCount()) rl.on('line', line => {
      p.emit('message', line.trim())
    })
}

start('main.js')