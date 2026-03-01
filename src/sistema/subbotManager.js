import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'
import chalk from 'chalk'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class SubBot {
    constructor(mainConn, mainNumber) {
        this.mainConn = mainConn      // Conexión del bot principal
        this.mainNumber = mainNumber   // Número del bot principal
        this.subs = new Map()          // Aquí guarda los sub-bots activos
        this.configFile = path.join(__dirname, '../../.libreria/subbots.json')
        this.cargarConfig()
    }

    // Carga la configuración guardada
    cargarConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
                console.log(chalk.cyan(`📋 Sub-bots cargados: ${this.config.subs.length}`))
            } else {
                this.config = { subs: [], max: 15 }
            }
        } catch (e) {
            this.config = { subs: [], max: 15 }
        }
    }

    // Guarda la configuración
    guardarConfig() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
        } catch (e) {}
    }

    // Agrega un nuevo sub-bot
    async agregar(numero, nombre) {
        // Verifica límite
        if (this.subs.size >= this.config.max) {
            return { ok: false, msg: `❌ Límite: ${this.config.max}` }
        }

        try {
            // Crea la conexión del sub-bot (en carpeta separada Subs/)
            const { state, saveCreds } = await useMultiFileAuthState(`Subs/${numero}`)
            
            const conn = makeWASocket({
                logger: P({ level: 'silent' }),
                auth: state,
                browser: ['SubBot', 'Chrome', '121.0'],
                msgRetryCounterCache: new NodeCache()
            })

            conn.subInfo = { numero, nombre, main: this.mainNumber }

            // Guarda credenciales cuando cambien
            conn.ev.on('creds.update', saveCreds)

            // Maneja eventos de conexión del sub-bot
            conn.ev.on('connection.update', async (u) => {
                const { connection, lastDisconnect } = u
                
                if (connection === 'open') {
                    console.log(chalk.green(`✅ Sub: ${nombre}`))
                    // Mensaje al sub-bot cuando se conecta
                    await conn.sendMessage(numero + '@s.whatsapp.net', { 
                        text: `✅ Eres sub-bot de ${global.botName}` 
                    })
                    // Notifica al bot principal
                    if (this.mainConn) {
                        await this.mainConn.sendMessage(this.mainNumber + '@s.whatsapp.net', { 
                            text: `✅ Sub conectado: ${nombre}` 
                        })
                    }
                }

                if (connection === 'close') {
                    const code = new Boom(lastDisconnect?.error)?.output?.statusCode
                    this.subs.delete(numero)
                    // Auto-reconexión si no fue un logout
                    if (code !== DisconnectReason.loggedOut) {
                        setTimeout(() => this.agregar(numero, nombre), 5000)
                    }
                }
            })

            // Guarda el sub-bot en el Map
            this.subs.set(numero, { conn, nombre })

            // Guarda en configuración si es nuevo
            const existe = this.config.subs.find(s => s.numero === numero)
            if (!existe) {
                this.config.subs.push({ numero, nombre })
                this.guardarConfig()
            }
            
            return { ok: true }

        } catch (e) {
            return { ok: false, msg: e.message }
        }
    }

    // Lista los sub-bots activos
    listar() {
        return Array.from(this.subs.entries()).map(([num, data]) => ({
            numero: num,
            nombre: data.nombre
        }))
    }

    // Detiene un sub-bot
    detener(numero) {
        if (this.subs.has(numero)) {
            this.subs.get(numero).conn.ws.close()
            this.subs.delete(numero)
            return true
        }
        return false
    }
}