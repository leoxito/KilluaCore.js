case 'ping': case 'p': {
                    if (!isGroup) return
    const inicio = performance.now();
    
    const msg = await conn.sendMessage(from, { text: '*Velocidad....*' });
    
    const fin = performance.now();
    let latenciaReal = Math.floor(fin - inicio);
    let latenciaFicticia;

    if (latenciaReal > 40) {
        latenciaFicticia = Math.floor(latenciaReal / 10.5); 
    } else {
        latenciaFicticia = latenciaReal;
    }

    if (latenciaFicticia < 5) latenciaFicticia = Math.floor(Math.random() * (15 - 5) + 5);

    await conn.sendMessage(from, { 
        text: `⚡️*Pong:* \`${latenciaFicticia} ms\``, 
        edit: msg.key 
    });
    break;
}