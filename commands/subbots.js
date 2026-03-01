case 'subs': {
    if (!isOwner) return reply('❌ Solo el owner');
    
    if (!global.conns || global.conns.length === 0) {
        return reply('📌 *No Hay  Ninguna Conexión Activa*');
    }
    
    let lista = '🪵 *SUB-BOTS ACTIVOS*\n\n';
    global.conns.forEach((sub, i) => {
        const num = sub.userId?.split('@')[0] || 'Desconocido';
        lista += `${i+1}. ${num}\n`;
    });
    lista += `\nTotal: ${global.conns.length}`;
    
    reply(lista);
    break;
}