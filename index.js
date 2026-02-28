import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    DisconnectReason, 
    makeCacheableSignalKeyStore, 
    downloadMediaMessage,
    prepareWAMessageMedia, 
    generateWAMessageFromContent, 
    proto,
    Browsers
} from '@whiskeysockets/baileys'
import P from 'pino'
import './src/core.js'
import chalk from 'chalk'
import { Boom } from '@hapi/boom'
import fs, { existsSync, readFileSync, writeFileSync, watchFile, unwatchFile, unlinkSync, mkdirSync, readdirSync, statSync, watch } from 'fs'
import { menuContent } from './src/sistema/menu.js';
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { exec } from 'child_process'
import { promisify } from 'util'
import yts from 'yt-search'
import { Sticker, StickerTypes } from 'wa-sticker-formatter'
import printLog from './src/sistema/consola.js'
import readline from 'readline'
import qrcode from "qrcode"
import NodeCache from 'node-cache'
import * as crypto from 'crypto';

let messageCache = new Map()
const fastCache = new Map();
const searchCache = new Map();

global.mainConn = null
global.plugins = {}
const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0 })
const groupCache = new NodeCache({ stdTTL: 600, checkperiod: 60 })

const decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        let decode = jid.match(/:(\d+)@/gi) || []
        return jid.replace(decode[0], '@')
    }
    return jid
}

const execPromise = promisify(exec)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const databaseFile = join(__dirname, 'src', 'database','database.json')
const reaccionesPath = join(dirname(fileURLToPath(import.meta.url)), 'src', 'database', 'reactions.json');

if (!existsSync(dirname(reaccionesPath))) mkdirSync(dirname(reaccionesPath), { recursive: true });
if (!existsSync(reaccionesPath)) writeFileSync(reaccionesPath, JSON.stringify({}, null, 2));

const loadPlugins = (directory) => {
    try {
        const files = readdirSync(directory, { recursive: true });
        for (const file of files) {
            if (file.endsWith('.js')) {
                const fullPath = join(directory, file);
                global.plugins[file] = readFileSync(fullPath, 'utf8');
            }
        }
    } catch (e) {}
};

const commandsDir = join(__dirname, 'commands');
if (!existsSync(commandsDir)) mkdirSync(commandsDir, { recursive: true });
loadPlugins(commandsDir);

watch(commandsDir, { recursive: true }, (event, filename) => {
    if (filename && filename.endsWith('.js')) {
        loadPlugins(commandsDir);
    }
});

const cleanTmp = () => {
    const tempDir = join(__dirname, 'tmp')
    if (!existsSync(tempDir)) return mkdirSync(tempDir)
    fs.readdir(tempDir, (err, files) => {
        if (err) return
        files.forEach(file => {
            const path = join(tempDir, file)
            if (Date.now() - fs.statSync(path).mtimeMs > 300000) unlinkSync(path)
        })
    })
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function isValidPhoneNumber(number) {
    try {
        let num = String(number).replace(/\s+/g, '')
        if (num.startsWith('+521')) {
            num = num.replace('+521', '+52')
        } else if (num.startsWith('+52') && num[4] === '1') {
            num = num.replace('+52 1', '+52')
        }
        return num.length > 10 
    } catch (error) {
        return false
    }
}

global.db = { data: { users: {}, chats: {}, settings: {}, mods: [] } }

global.db.write = () => {
    try {
        writeFileSync(databaseFile, JSON.stringify(global.db.data, null, 2))
        return true
    } catch (e) {
        return false
    }
}

try {
    if (existsSync(databaseFile)) {
        global.db.data = JSON.parse(readFileSync(databaseFile, 'utf-8'))
    }
} catch (e) {
    global.db.data = { users: {}, chats: {}, settings: {}, mods: [] }
}

let reaccionesData = {}
if (existsSync(reaccionesPath)) {
    reaccionesData = JSON.parse(readFileSync(reaccionesPath, 'utf-8'))
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('Sessions')
    const { version } = await fetchLatestBaileysVersion()

    let opcion
    let methodCode = false
    let methodCodeQR = false
    let phoneNumber = ""

    if (!methodCodeQR && !methodCode && !fs.existsSync(`./Sessions/creds.json`)) {
        do {
            console.log('')
            console.log(chalk.white('   ¿Cómo quieres conectar?'))
            console.log(chalk.white('   ') + chalk.hex('#00FFFF')('1) ') + chalk.white('Usar código QR'))
            console.log(chalk.white('   ') + chalk.hex('#00FFFF')('2) ') + chalk.white('Usar código de 8 dígitos'))
            process.stdout.write(chalk.white('   » Tu opción: '))
            opcion = await question('')
            if (!/^[1-2]$/.test(opcion)) {
                console.log(chalk.red('   Solo opciones 1 o 2'))
            }
        } while (opcion !== '1' && opcion !== '2' || fs.existsSync(`./Sessions/creds.json`))
    }

    console.info = () => {}

    const conn = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    printQRInTerminal: opcion === '1',
    auth: { 
        creds: state.creds, 
        keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) 
    },
    browser: ['Ubuntu', 'Chrome', '121.0.6167.160'],
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    markOnlineOnConnect: true,
    keepAliveIntervalMs: 30000, 
    defaultQueryTimeoutMs: 0,
    connectTimeoutMs: 60000,
    retryRequestDelayMs: 500,
    generateHighQualityLinkPreview: true,
    msgRetryCounterCache
})
global.mainConn = conn

setInterval(async () => {
    if (conn.user) {
        await conn.sendPresenceUpdate('available')
    }
}, 60000)

    conn.getName = (jid, withoutContact = false) => {
    jid = decodeJid(jid) || ''
    withoutContact = conn.withoutContact || withoutContact
    let v
    if (typeof jid === 'string' && jid.endsWith('@g.us')) return new Promise(async (resolve) => {
        v = global.db.data.chats[jid] || {}
        if (v.name || v.subject) return resolve(v.name || v.subject)

        const cached = groupCache.get(jid)
        if (cached) return resolve(cached.subject || cached.name)

        try {
            const metadata = await conn.groupMetadata(jid)
            groupCache.set(jid, metadata)
            resolve(metadata.name || metadata.subject)
        } catch {
            resolve(jid.split('@')[0])
        }
    })
    else v = jid === '0@s.whatsapp.net' ? { jid, name: 'WhatsApp' } : jid === decodeJid(conn.user?.id) ? conn.user : (global.db.data.users[jid] || {})
    return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || (typeof jid === 'string' ? jid.split('@')[0] : '')
}

const getAdmins = (participants) => {
    return participants.filter(p => p.admin !== null).map(p => p.id)
}

const checkAdmin = async (conn, from, sender) => {
    try {
        const metadata = groupCache.get(from) || await conn.groupMetadata(from).catch(() => null)
        if (!metadata) return { isUserAdmin: false, isBotAdmin: false }

        groupCache.set(from, metadata)
        const admins = getAdmins(metadata.participants)
        const botId = decodeJid(conn.user.id)

        return { 
            isUserAdmin: admins.includes(decodeJid(sender)), 
            isBotAdmin: admins.includes(botId) 
        }
    } catch {
        return { isUserAdmin: false, isBotAdmin: false }
    }
}

    if (!fs.existsSync(`./Sessions/creds.json`)) {
        if (opcion === '2' || methodCode) {
            opcion = '2'
            if (!conn.authState.creds.registered) {
                let addNumber
                if (!!phoneNumber) {
                    addNumber = String(phoneNumber).replace(/[^0-9]/g, '')
                } else {
                    do {
                        console.log(chalk.hex('#00FFFF')('INGRESAR NÚMERO'))
                        console.log(chalk.white('[+] '))
                        phoneNumber = await question('')
                        phoneNumber = String(phoneNumber).replace(/\D/g, '')
                        if (!phoneNumber.startsWith('+')) phoneNumber = `+${phoneNumber}`
                    } while (!await isValidPhoneNumber(phoneNumber))
                    addNumber = phoneNumber.replace(/\D/g, '')
                    setTimeout(async () => {
                        let codeBot = await conn.requestPairingCode(addNumber)
                        codeBot = codeBot.match(/.{1,4}/g)?.join("-") || codeBot
                        console.log(chalk.hex('#00FFFF')('CÓDIGO GENERADO'))
                        console.log(chalk.hex('#00FFFF')('──────────────────────────'))
                        console.log(chalk.white('╔══════════════════════╗'))
                        console.log(chalk.white('║        ' + codeBot + '      ║'))
                        console.log(chalk.white('╚══════════════════════╝'))
                        console.log(chalk.hex('#00FFFF')('──────────────────────────'))
                    }, 1000)
                }
            }
        }
    }

    conn.ev.on('creds.update', saveCreds)


                 conn.ev.on('messages.upsert', async (m) => {
    if (!m.messages?.[0] || m.type !== 'notify' || m.messages[0].key.remoteJid === 'status@broadcast') return
    const msg = m.messages[0]
    if (!msg.message) return
    setImmediate(async () => {
        try {
            await processMessage(msg, `${msg.key.remoteJid}-${msg.key.id}`)
        } catch (e) {
            console.error(e)
        }
    })
})       

            async function processMessage(msg, msgId, connCustom, customPrefix) {
    const conn = connCustom || global.mainConn
    if (!conn || !msg || !msg.key || !msg.message) return

    const prefixList = Array.isArray(global.prefix) ? global.prefix : [global.prefix]

    try {
        const from = msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        const sender = msg.key.participant || msg.key.remoteJid
        const pushName = msg.pushName || 'Usuario'
        const realSender = decodeJid(sender)

        if (!global.db.data) global.db.data = { users: {}, chats: {}, settings: {}, mods: [] }
        if (!global.db.data.users) global.db.data.users = {}
        if (!global.db.data.chats) global.db.data.chats = {}
        if (!global.db.data.settings) global.db.data.settings = {}
        if (!global.db.data.cooldowns) global.db.data.cooldowns = {}
        if (!global.subBotCooldown) global.subBotCooldown = {}

        if (typeof global.db.data.settings[conn.user.jid] !== 'object') {
    global.db.data.settings[conn.user.jid] = {
        onlyowner: false,
        antiprivado: false
    }
}

        let user = global.db.data.users[realSender]

        if (typeof user !== 'object') {
    global.db.data.users[realSender] = {
        name: pushName,
        banned: false,
        level: 1,
        exp: 0,
        coin: 0,
        totalCommands: 0,
        birthday: 'Sin especificar',
        gender: 'Sin especificar',
        stickerPack: '',
        stickerAuthor: '',
        partner: null
    }
} else {
    if (pushName !== 'Usuario' && user.name !== pushName) {
        user.name = pushName
    }
    if (!('banned' in user)) user.banned = false
    if (!('level' in user)) user.level = 1
    if (!('exp' in user)) user.exp = 0
    if (!('coin' in user)) user.coin = 0
    if (!('totalCommands' in user)) user.totalCommands = 0
    if (!('birthday' in user)) user.birthday = 'Sin especificar'
    if (!('gender' in user)) user.gender = 'Sin especificar'
    if (!('stickerPack' in user)) user.stickerPack = ''
    if (!('stickerAuthor' in user)) user.stickerAuthor = ''
    if (!('partner' in user)) user.partner = null
}


                if (isGroup) {
    if (!global.db.data.chats[from]) {
        global.db.data.chats[from] = {
            welcome: false,
            bye: false,
            antilink: false,
            economy: true,
            modoadmin: false,
            sWelcome: '',
            sBye: ''
        }
    }

    let chat = global.db.data.chats[from]
    if (chat) {
        if (!('welcome' in chat)) chat.welcome = false
        if (!('bye' in chat)) chat.bye = false
        if (!('antilink' in chat)) chat.antilink = false
        if (!('economy' in chat)) chat.economy = true 
        if (!('sWelcome' in chat)) chat.sWelcome = ''
        if (!('sBye' in chat)) chat.sBye = ''
    }
}


        const settings = global.db.data.settings[conn.user.jid] || {}
        
        // ===== CORRECCIÓN: DETECCIÓN DE OWNER =====
        const senderNumber = realSender.split('@')[0]
        const isOwner = global.owner.includes(senderNumber)

        if (user && user.banned && !isOwner) return 

        if (settings.onlyowner && !isOwner) {
            return
        }

        if (!isGroup && settings.antiprivado && !isOwner) return

                   const type = Object.keys(msg.message).find(v => v !== 'messageContextInfo' && v !== 'senderKeyDistributionMessage')
if (!type) return

let body = (type === 'conversation') ? msg.message.conversation :
           (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text :
           (type === 'imageMessage' || type === 'videoMessage' || type === 'documentMessage') ? msg.message[type].caption :
           (type === 'buttonsResponseMessage') ? msg.message.buttonsResponseMessage.selectedButtonId :
           (type === 'listResponseMessage') ? msg.message.listResponseMessage.singleSelectReply.selectedRowId :
           (type === 'templateButtonReplyMessage') ? msg.message.templateButtonReplyMessage.selectedId :
           (type === 'interactiveResponseMessage') ? JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : 
           (msg.message[type]?.text || msg.message[type]?.caption || '')

body = typeof body === 'string' ? body.trim() : ''

                // ===== PRINTLOG ACTIVADO =====
                printLog(msg, conn)

                if (isGroup && global.db.data.chats[from]?.antilink) {
            const linkRegex = /https?:\/\/\S+|www\.\S+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}\/\S+/gi
            if (linkRegex.test(body)) {
                const groupMetadata = groupCache.get(from) || await conn.groupMetadata(from).catch(() => null)
                if (groupMetadata) {
                    const participants = groupMetadata.participants
                    const isUserAdmin = participants.find(p => p.id === sender)?.admin !== null
                    if (!isUserAdmin) {
                        const botNumber = decodeJid(conn.user.id)
                        const isBotAdmin = participants.find(p => p.id === botNumber)?.admin !== null
                        if (isBotAdmin) {
                            await conn.sendMessage(from, { delete: msg.key })
                            await conn.groupParticipantsUpdate(from, [sender], 'remove')
                            return
                        }
                    }
                }
            }
        }

        const usedPrefix = prefixList.find(p => body.startsWith(p))

        const prefixCommands = ['prefix', 'prefijo', 'Prefijo', 'Prefix', 'PREFIJO']
        if (prefixCommands.includes(body.toLowerCase())) {
            return conn.sendMessage(from, { text: `✰ *prefijo:* ${prefixList[0]}` }, { quoted: msg })
        }

        if (usedPrefix !== null && usedPrefix !== undefined) {
            const commandText = body.slice(usedPrefix.length).trim()
            const args = commandText.split(/ +/)
            const command = args.shift().toLowerCase()
            const text = args.join(' ')
            const q = text

            const reply = async (text) => {
                if (!text) return
                return conn.sendMessage(from, { text: String(text) }, { quoted: msg })
            }

            const isMod = isOwner || global.db.data.mods.includes(realSender)

            if (isGroup && global.db.data.chats[from]?.modoadmin) {
                const { isUserAdmin } = await checkAdmin(conn, from, sender)
                if (!isUserAdmin && !isOwner) return
            }

            global.db.data.users[realSender].totalCommands += 1
            global.db.data.users[realSender].exp += Math.floor(Math.random() * 15) + 5

            let userStats = global.db.data.users[realSender]
            let expRequired = userStats.level * 500

            if (userStats.exp >= expRequired) {
                userStats.level += 1
                userStats.exp = 0 
            }                              

            switch (command) {      
                default:
                    let commandFound = false
                    for (let i in global.plugins) {
                        try {
                            if (global.plugins[i].includes(`case '${command}':`) || global.plugins[i].includes(`case "${command}":`)) {
                                await eval(`(async () => { switch (command) { ${global.plugins[i]} } })()`)
                                commandFound = true
                                break
                            }
                        } catch (e) {
                            console.error(e)
                        }
                    }

                    if (!commandFound && usedPrefix) {
                        reply(`🌴 Este Comando No Esta En Mi Base De Datos: *${command}*\n\n> Te Recomiendo Usar *${usedPrefix}help* para ver los comandos disponibles Que Tengo !`)
                    }
                    break
            }
        }
    } catch (err) { 
        console.error('Error en processMessage:', err) 
    }
    messageCache.set(msgId, Date.now())
}

    conn.ev.on('connection.update', (u) => {
    if (u.connection === 'open') {
    global.mainConn = conn
    console.log(chalk.cyan(`🌱 ${global.botName} conectado correctamente`))
}

    if (u.connection === 'close') {
        const statusCode = new Boom(u.lastDisconnect?.error)?.output?.statusCode
        console.log(chalk.white('Desconectado - Código:', statusCode))

        if (statusCode !== DisconnectReason.loggedOut) {
            console.log(chalk.cyan('⚡️ Reconectando en 3 segundos...'))
            setTimeout(() => startBot(), 3000)
        } else {
            console.log(chalk.white('📂 Sesión cerrada. Borrando carpeta sessions...'))

            const sessionsDir = './Sessions'
            if (fs.existsSync(sessionsDir)) {
                try {
                    fs.rmSync(sessionsDir, { recursive: true, force: true })
                    console.log(chalk.white('🧹 Carpeta sessions eliminada'))
                } catch (e) {
                    console.log(chalk.cyan('🗑 Error borrando sessions:', e.message))
                }
            }

            console.log(chalk.white('🔄 Reinicia el bot manualmente'))
            process.exit(0)
        }
    }
})
} 

startBot()

setInterval(async () => {
    if (global.db) await global.db.write()
}, 30000)