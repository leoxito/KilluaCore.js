case 'update': case 'up':
                        if (!global.owner.some(o => sender.includes(o[0]))) return reply(`Comando no encontrado: *${command}*\n\nUsa *${usedPrefix}help* para ver los comandos disponibles`)
                        await reply('Reiniciando sistema...')
                        process.exit(0)
                        break