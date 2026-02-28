case 'update': case 'up':
    // Obtener el número del sender sin el @s.whatsapp.net
    const senderNumber = sender.split('@')[0]
    
    // Verificar si el número está en global.owner
    if (!global.owner.includes(senderNumber)) {
        return reply(`*🌴 Este Comandos No Esta Disponible En Mi Base De Datos*: *${command}*\n\n> _Te Recomiendo Usar *${usedPrefix}help* para ver los comandos disponibles._`)
    
    await reply('🔄 Actualizando *Killua-Wa*')
    process.exit(0)
    break