case 'code': {
    const args = text.split(' ')
    let numero = args[0]
    
    // Si no proporciona número, usar el suyo propio
    if (!numero) {
        numero = realSender.split('@')[0]
    } else {
        numero = numero.replace(/\D/g, '')
    }
    
    // Verificar si ya es sub-bot
    if (global.subManager && global.subManager.subs.has(numero)) {
        return reply('❌ Este número ya es un sub-bot activo')
    }
    
    // Verificar límite de sub-bots
    if (global.subManager && global.subManager.subs.size >= global.subManager.config.max) {
        return reply(`❌ Límite de ${global.subManager.config.max} sub-bots alcanzado`)
    }
    
    reply(`⏳ *Generando código para ${numero}...*\n\n` +
          `⚠️ Espera unos segundos, te enviaré el código por WhatsApp`)
    
    try {
        // Conexión temporal para generar código
        const { state } = await useMultiFileAuthState(`Temp/${numero}`)
        
        const tempConn = makeWASocket({
            logger: P({ level: 'silent' }),
            auth: state,
            browser: ['CodeGen', 'Chrome', '121.0'],
            msgRetryCounterCache: new NodeCache()
        })
        
        setTimeout(async () => {
            try {
                const code = await tempConn.requestPairingCode(numero)
                const codigo = code.match(/.{1,4}/g)?.join('-') || code
                
                // Enviar código al usuario
                await reply(`🔑 *TU CÓDIGO DE SUB-BOT*\n\n` +
                            `📱 *Número:* ${numero}\n` +
                            `🔢 *Código:* ${codigo}\n\n` +
                            `📝 *Instrucciones:*\n` +
                            `1. Abre WhatsApp en ese número\n` +
                            `2. Ve a Dispositivos vinculados\n` +
                            `3. Pulsa en "Vincular dispositivo"\n` +
                            `4. Ingresa el código: ${codigo}\n\n` +
                            `✅ Serás sub-bot de ${global.botName}`)
                
                // Cerrar conexión temporal
                tempConn.ws.close()
                
            } catch (e) {
                reply(`❌ Error generando código: ${e.message}`)
            }
        }, 2000)
        
    } catch (e) {
        reply(`❌ Error: ${e.message}`)
    }
    break
}