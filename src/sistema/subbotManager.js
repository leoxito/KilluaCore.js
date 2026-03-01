import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import P from 'pino'
import chalk from 'chalk'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

export class SubBot {
    constructor(mainConn, mainNumber) {
        this.mainConn = mainConn
        this.mainNumber = mainNumber
        this.subs = new Map()
        this.configFile = path.join(__dirname, '../subbots.json')
        this.cargarConfig()
    }

    cargarConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
            } else {
                this.config = { subs: [], max: 15 }
                fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
            }
        } catch (e) {
            this.config = { subs: [], max: 15 }
        }
    }

    guardarConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
    }

    async agregar(numero, nombre) {
        if (this.subs.size >= this.config.max) {
            return { ok: false, msg: `❌ Límite: ${this.config.max}` }
        }

        try {
            const { state, saveCreds } = await useMultiFileAuthState(`Subs/${numero}`)
            const conn = makeWASocket({
                logger: P({ level: 'silent' }),
                auth: state,
                browser: ['SubBot', 'Chrome', '121.0'],
                msgRetryCounterCache: new NodeCache()
            })

            conn.subInfo = { numero, nombre, main: this.mainNumber }

            conn.ev.on('creds.update', saveCreds)

            conn.ev.on('connection.update', async (u) => {
                const { connection, lastDisconnect } = u
                
                if (connection === 'open') {
                    console.log(chalk.green(`✅ Sub: ${nombre}`))
                    await conn.sendMessage(numero + '@s.whatsapp.net', { 
                        text: `✅ Eres sub-bot de ${global.botName}\n👑 Owner: ${this.mainNumber}` 
                    })
                    if (this.mainConn) {
                        await this.mainConn.sendMessage(this.mainNumber + '@s.whatsapp.net', { 
                            text: `✅ Sub conectado: ${nombre}` 
                        })
                    }
                }

                if (connection === 'close') {
                    const code = new Boom(lastDisconnect?.error)?.output?.statusCode
                    this.subs.delete(numero)
                    if (code !== DisconnectReason.loggedOut) {
                        setTimeout(() => this.agregar(numero, nombre), 5000)
                    }
                }
            })

            this.subs.set(numero, { conn, nombre })

            if (!fs.existsSync(`Subs/${numero}/creds.json`)) {
                setTimeout(async () => {
                    const code = await conn.requestPairingCode(numero)
                    const codigo = code.match(/.{1,4}/g)?.join('-')
                    if (this.mainConn) {
                        await this.mainConn.sendMessage(this.mainNumber + '@s.whatsapp.net', { 
                            text: `🔑 Código para ${nombre}:\n${codigo}` 
                        })
                    }
                }, 2000)
            }

            this.config.subs.push({ numero, nombre })
            this.guardarConfig()
            return { ok: true }

        } catch (e) {
            return { ok: false, msg: e.message }
        }
    }

    listar() {
        return Array.from(this.subs.entries()).map(([num, data]) => ({
            numero: num,
            nombre: data.nombre
        }))
    }

    detener(numero) {
        if (this.subs.has(numero)) {
            this.subs.get(numero).conn.ws.close()
            this.subs.delete(numero)
            return true
        }
        return false
    }
}