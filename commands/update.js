case 'update': case 'up': {
    // Resolver el JID del remitente
    const resolvedSender = await resolveLidToPnJid(conn, from, sender)
    const senderNumber = resolvedSender.split('@')[0]
    
    // Verificar si es owner
    if (!global.owner.includes(senderNumber)) {
        return reply(`*🌴 Este Comando No Esta Disponible En Mi Base De Datos*: *${command}*\n\n> _Te Recomiendo Usar *${usedPrefix}help* para ver los comandos disponibles._`)
    }
    
    await reply('*Actualizando Killua-Wa*')
    process.exit(0)
    break
}