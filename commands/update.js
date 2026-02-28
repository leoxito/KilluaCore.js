case 'update': case 'up': {
    if (!isOwner) {
        return reply('❌ No tienes permiso para usar este comando')
    }
    await reply('🔄 Actualizando...')
    process.exit(0)
    break
}