// ===== SUB-BOTS =====
case 'sub': {
    if (!isOwner) return reply('❌ Solo el owner')
    
    const args = text.split(' ')
    if (args.length < 2) return reply(`📱 Uso: ${usedPrefix}sub [número] [nombre]\nEj: ${usedPrefix}sub 521234567890 Bot2`)
    
    const numero = args[0].replace(/\D/g, '')
    const nombre = args[1] || 'Sub'
    
    if (!global.subManager) return reply('❌ Sistema no listo')
    
    const res = await global.subManager.agregar(numero, nombre)
    reply(res.ok ? '✅ Procesando...' : res.msg)
    break
}

case 'subs': {
    if (!isOwner) return reply('❌ Solo el owner')
    if (!global.subManager) return reply('❌ Sistema no listo')
    
    const lista = global.subManager.listar()
    let msg = `📋 *Sub-Bots:* ${lista.length}/${global.subManager.config.max}\n`
    lista.forEach(s => msg += `• ${s.nombre}: ${s.numero}\n`)
    reply(msg)
    break
}

case 'delsub': {
    if (!isOwner) return reply('❌ Solo el owner')
    
    const numero = text.replace(/\D/g, '')
    if (!numero) return reply(`📱 Uso: ${usedPrefix}delsub [número]`)
    
    if (!global.subManager) return reply('❌ Sistema no listo')
    
    if (global.subManager.detener(numero)) {
        reply(`✅ Sub ${numero} eliminado`)
    } else {
        reply('❌ No encontrado')
    }
    break
}