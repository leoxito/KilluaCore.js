case 'code':
case 'serbot': {
    const args = text ? text.trim().split(' ') : []
    const modo = args[0]
    const num = args[1]

    if (modo === '1') {
        await reply('Generando QR, espera...')
        await startSubBot(msg, conn, '', 1)
    } else if (modo === '2') {
        if (!num) return reply('Falta numero. Ejemplo: ' + usedPrefix + command + ' 2 51935252999')
        await reply('Generando Codigo, espera...')
        await startSubBot(msg, conn, num, 2)
    } else {
        const help = '*Uso del comando*\n\n1. QR: ' + usedPrefix + command + ' 1\n2. Codigo: ' + usedPrefix + command + ' 2 numero'
        await reply(help)
    }
    break
}