case 'update': case 'up':
                        if (!global.owner.some(o => sender.includes(o[0]))) return reply(`*🌴 Este Comandos No Esta Disponible En Mi Base De Datos*: *${command}*\n\n> _Te Recomiendo Usar *${usedPrefix}help* para ver los comandos disponibles._`)
                        await reply('Reiniciando sistema...')
                        process.exit(0)
                        break