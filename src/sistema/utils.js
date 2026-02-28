import { jidDecode } from '@whiskeysockets/baileys'

const groupMetadataCache = new Map()
const lidCache = new Map()
const metadataTTL = 5 * 60 * 1000 

export function decodeJid(jid) {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        const decode = jidDecode(jid) || {}
        return (decode.user && decode.server && decode.user + '@' + decode.server) || jid
    }
    return jid
}

export async function resolveLidToRealJid(lid, client, groupChatId) {
    const input = lid?.toString().trim()
    if (!input || !input.includes('@lid')) return decodeJid(input)
    if (lidCache.has(input)) return lidCache.get(input)
    if (!groupChatId?.endsWith('@g.us')) return decodeJid(input)

    let cached = groupMetadataCache.get(groupChatId)
    if (!cached || (Date.now() - cached.timestamp > metadataTTL)) {
        try {
            const metadata = await client.groupMetadata(groupChatId)
            cached = { metadata, timestamp: Date.now() }
            groupMetadataCache.set(groupChatId, cached)
        } catch {
            return decodeJid(input)
        }
    }

    const participant = cached.metadata.participants.find(p => p.id === input || p.lid === input)
    if (participant) {
        const realJid = participant.id.includes(':') ? participant.id.split(':')[0] + '@s.whatsapp.net' : participant.id
        lidCache.set(input, realJid)
        return realJid
    }
    return decodeJid(input)
}

export async function smsg(conn, m) {
    if (!m) return m
    if (m.key) {
        m.id = m.key.id
        m.chat = decodeJid(m.key.remoteJid)
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = decodeJid(m.fromMe ? conn.user.id : (m.key.participant || m.key.remoteJid))
        
        if (m.sender.includes('@lid')) {
            m.sender = await resolveLidToRealJid(m.sender, conn, m.chat)
        }
    }

    if (m.message) {
        m.mtype = Object.keys(m.message)[0]
        m.msg = (m.mtype == 'viewOnceMessageV2' ? m.message[m.mtype].message[Object.keys(m.message[m.mtype].message)[0]] : m.message[m.mtype])
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'templateButtonReplyMessage') && m.msg.selectedId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || m.text || ''
        m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
        
        if (m.msg.contextInfo && m.msg.contextInfo.quotedMessage) {
            m.quoted = m.msg.contextInfo.quotedMessage
            let type = Object.keys(m.quoted)[0]
            m.quoted = m.quoted[type]
            m.quoted.sender = decodeJid(m.msg.contextInfo.participant)
            if (m.quoted.sender.includes('@lid')) {
                m.quoted.sender = await resolveLidToRealJid(m.quoted.sender, conn, m.chat)
            }
        }
    }
    m.reply = (text, options = {}) => conn.sendMessage(m.chat, { text }, { quoted: m, ...options })
    return m
}
