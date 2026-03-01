// src/sistema/subbotManager.js
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'
import P from 'pino'
import chalk from 'chalk'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'

export class SubBotManager {
    constructor(mainConn, mainNumber, botName) {
        this.mainConn = mainConn
        this.mainNumber = mainNumber
        this.botName = botName || 'Killua-Wa'
        this.subs = new Map()
        this.configFile = path.join(process.cwd(), 'src', 'subbots.json')
        this.cargarConfig()
    }

    cargarConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'))
            } else {
                this.config = { subbots: [], maxSubBots: 15, autoRestart: true }
                fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
            }
        } catch (e) {
            this.config = { subbots: [], maxSubBots: 15, autoRestart: true }
        }
    }

    guardarConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2))
    }

    async iniciarSubBot(numero, nombre = 'Sub-Bot', prefijo = '.') {
        if (this.subs.has(numero)) {
            return { ok: false, msg: '❌ Este número ya es un sub-bot activo' }
        }

        if (this.subs.size >= this.config.maxSubBots) {
            return { ok: false, msg: `❌ Límite de ${this.config.maxSubBots} sub-bots alcanzado` }
        }

        console.log(chalk.yellow(`\n🚀 Iniciando sub-bot: ${nombre} (${numero})`))

        try {
            const { state, saveCreds } = await useMultiFileAuthState(`SubBots/${numero}`)
            const { version } = await fetchLatestBaileysVersion()

            const conn = makeWASocket({
                version,
                logger: P({ level: 'silent' }),
                auth: state,
                browser: ['SubBot', 'Chrome', '121.0'],
                markOnlineOnConnect: true,
                msgRetryCounterCache: new NodeCache({ stdTTL: 0 })
            })

            // Info del sub-bot
            conn.subInfo = { 
                numero, 
                nombre, 
                prefijo, 
                inicio: Date.now(),
                mainNumber: this.mainNumber,
                mainBot: this.botName
            }

            conn.ev.on('creds.update', saveCreds)

            // Manejar mensajes del sub-bot
            conn.ev.on('messages.upsert', async (m) => {
                if (!m.messages[0]) return
                const msg = m.messages[0]
                const from = msg.key.remoteJid
                const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''
                
                if (text.startsWith(prefijo)) {
                    const cmd = text.slice(prefijo.length).split(' ')[0].toLowerCase()
                    
                    if (cmd === 'ping') {
                        await conn.sendMessage(from, { text: '🏓 Pong desde sub-bot!' })
                    }
                    
                    if (cmd === 'info') {
                        const uptime = Math.floor((Date.now() - conn.subInfo.inicio) / 1000)
                        await conn.sendMessage(from, { 
                            text: `🤖 *INFORMACIÓN DEL SUB-BOT*\n\n` +
                                  `📱 *Número:* ${numero}\n` +
                                  `📛 *Nombre:* ${nombre}\n` +
                                  `🔤 *Prefijo:* ${prefijo}\n` +
                                  `⏱️ *Activo:* ${uptime} segundos\n` +
                                  `🤖 *Bot Principal:* ${this.botName}\n` +
                                  `👑 *Owner:* ${this.mainNumber}`
                        })
                    }
                }
            })

            // Manejar conexión del sub-bot
            conn.ev.on('connection.update', async (u) => {
                const { connection, lastDisconnect, qr } = u
                
                if (qr) {
                    console.log(chalk.yellow(`📱 QR para ${nombre} (${numero})`))
                }

                if (connection === 'open') {
                    console.log(chalk.green(`✅ Sub-bot ${nombre} conectado`))
                    
                    // Notificar al bot principal
                    if (this.mainConn) {
                        await this.mainConn.sendMessage(this.mainNumber + '@s.whatsapp.net', {
                            text: `✅ *SUB-BOT CONECTADO*\n\n` +
                                  `📛 *Nombre:* ${nombre}\n` +
                                  `📱 *Número:* ${numero}\n` +
                                  `🔤 *Prefijo:* ${prefijo}\n` +
                                  `⏱️ *Hora:* ${new Date().toLocaleString()}`
                        })
                    }
                    
                    // Mensaje de bienvenida al sub-bot
                    await conn.sendMessage(this.mainNumber + '@s.whatsapp.net', {
                        text: `🤖 *¡Ahora Eres Un Sub-Bot De ${this.botName}!*\n\n` +
                              `📱 *Tu número:* ${numero}\n` +
                              `📛 *Tu nombre:* ${nombre}\n` +
                              `🔤 *Tu prefijo:* ${prefijo}\n` +
                              `👑 *Bot Principal:* ${this.mainNumber}\n\n` +
                              `✅ *Sub-Bot conectado correctamente*\n\n` +
                              `Comandos disponibles:\n` +
                              `${prefijo}ping - Probar conexión\n` +
                              `${prefijo}info - Ver información`
                    })
                }

                if (connection === 'close') {
                    const code = new Boom(lastDisconnect?.error)?.output?.statusCode
                    console.log(chalk.red(`❌ Sub-bot ${nombre} (${numero}) desconectado - Código:`, code))
                    
                    this.subs.delete(numero)
                    
                    // Notificar al bot principal
                    if (this.mainConn && code !== DisconnectReason.loggedOut) {
                        await this.mainConn.sendMessage(this.mainNumber + '@s.whatsapp.net', {
                            text: `❌ *SUB-BOT DESCONECTADO*\n\n` +
                                  `📛 *Nombre:* ${nombre}\n` +
                                  `📱 *Número:* ${numero}\n` +
                                  `🔌 *Código:* ${code}`
                        })
                    }
                    
                    // Auto-reconexión
                    if (code !== DisconnectReason.loggedOut && this.config.autoRestart) {
                        console.log(chalk.yellow(`🔄 Reconectando ${nombre} en 5 segundos...`))
                        setTimeout(() => this.iniciarSubBot(numero, nombre, prefijo), 5000)
                    }
                }
            })

            this.subs.set(numero, { conn, nombre, prefijo, inicio: Date.now() })

            // Guardar en configuración si es nuevo
            const existe = this.config.subbots.find(s => s.numero === numero)
            if (!existe) {
                this.config.subbots.push({ numero, nombre, prefijo, activo: true })
                this.guardarConfig()
            }

            return { ok: true, msg: '✅ Sub-bot iniciado', conn }

        } catch (e) {
            return { ok: false, msg: `❌ Error: ${e.message}` }
        }
    }

    async iniciarConCodigo(numero, nombre = 'Sub-Bot', prefijo = '.') {
        if (this.subs.has(numero)) {
            return { ok: false, msg: '❌ Ya existe un sub-bot con ese número' }
        }

        const result = await this.iniciarSubBot(numero, nombre, prefijo)
        
        if (result.ok && result.conn) {
            // Generar código de 8 dígitos
            setTimeout(async () => {
                try {
                    const code = await result.conn.requestPairingCode(numero)
                    const codigoFormateado = code.match(/.{1,4}/g)?.join('-') || code
                    
                    // Enviar código al bot principal
                    if (this.mainConn) {
                        await this.mainConn.sendMessage(this.mainNumber + '@s.whatsapp.net', {
                            text: `🔑 *CÓDIGO PARA SUB-BOT*\n\n` +
                                  `📛 *Nombre:* ${nombre}\n` +
                                  `📱 *Número:* ${numero}\n` +
                                  `🔤 *Prefijo:* ${prefijo}\n\n` +
                                  `📟 *Código de 8 dígitos:*\n` +
                                  `┌───────────────┐\n` +
                                  `│   ${codigoFormateado}   │\n` +
                                  `└───────────────┘\n\n` +
                                  `✨ *Instrucciones:*\n` +
                                  `1. Abre WhatsApp en el número ${numero}\n` +
                                  `2. Ve a Dispositivos vinculados\n` +
                                  `3. Pulsa en "Vincular dispositivo"\n` +
                                  `4. Ingresa el código: ${codigoFormateado}`
                        })
                    }
                    
                    console.log(chalk.green(`🔑 Código para ${nombre}: ${codigoFormateado}`))
                } catch (e) {
                    console.log(chalk.red(`Error generando código: ${e.message}`))
                }
            }, 2000)
        }
        
        return result
    }

    detenerSubBot(numero) {
        if (this.subs.has(numero)) {
            const { conn, nombre } = this.subs.get(numero)
            conn.ws.close()
            this.subs.delete(numero)
            
            // Actualizar config
            const bot = this.config.subbots.find(s => s.numero === numero)
            if (bot) bot.activo = false
            this.guardarConfig()
            
            return { ok: true, msg: `🛑 Sub-bot ${nombre} detenido` }
        }
        return { ok: false, msg: '❌ Sub-bot no encontrado' }
    }

    listarSubBots() {
        const activos = []
        const inactivos = []
        
        this.config.subbots.forEach(bot => {
            if (this.subs.has(bot.numero)) {
                const data = this.subs.get(bot.numero)
                const uptime = Math.floor((Date.now() - data.inicio) / 1000)
                activos.push({
                    ...bot,
                    uptime,
                    conectado: true
                })
            } else {
                inactivos.push({
                    ...bot,
                    conectado: false
                })
            }
        })
        
        return { activos, inactivos }
    }

    obtenerEstado() {
        return {
            total: this.config.subbots.length,
            activos: this.subs.size,
            maximo: this.config.maxSubBots,
            autoRestart: this.config.autoRestart
        }
    }
}